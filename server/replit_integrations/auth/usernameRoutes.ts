import type { Express, Request } from "express";
import {
  changePinSchema,
  forgotPinSchema,
  usernameSigninSchema,
  usernameSignupSchema,
} from "@shared/models/auth";
import { authStorage, UsernameTakenError } from "./storage";
import { hashPin, verifyPin } from "./pinHash";
import { generateRecoveryCode } from "./recoveryCode";
import { storage } from "../../storage";
import { isAuthenticated } from "./replitAuth";

const DEFAULT_CATEGORIES = [
  "Dzikir",
  "Sholat Fardhu",
  "Sholat Sunnah",
  "Puasa",
  "Baca Quran",
  "Shodaqoh",
];

// Per-username threshold + lockout window. Wrong PINs above this count lock
// the account for `LOCKOUT_MS`. Per-IP rate limiting catches credential
// stuffing across many usernames.
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

// Per-IP signin rate limit: at most 20 PIN attempts (any username) per
// 10-minute window.
const IP_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const IP_LIMIT_MAX_ATTEMPTS = 20;
const ipAttempts = new Map<string, { count: number; resetAt: number }>();

function ipKey(req: Request): string {
  return (req.ip ?? req.socket?.remoteAddress ?? "unknown").toString();
}

function tickIpAttempts(req: Request): { allowed: boolean } {
  const key = ipKey(req);
  const now = Date.now();
  const cur = ipAttempts.get(key);
  if (!cur || cur.resetAt < now) {
    ipAttempts.set(key, { count: 1, resetAt: now + IP_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  cur.count += 1;
  if (cur.count > IP_LIMIT_MAX_ATTEMPTS) return { allowed: false };
  return { allowed: true };
}

function clearIpAttemptsOnSuccess(req: Request) {
  ipAttempts.delete(ipKey(req));
}

async function seedDefaultCategoriesFor(userId: string) {
  try {
    const existing = await storage.getCategories(userId);
    const existingNames = new Set(existing.map((c) => c.name));
    for (const name of DEFAULT_CATEGORIES) {
      if (!existingNames.has(name)) {
        await storage.createCategory(userId, { name, isProtected: true });
      }
    }
  } catch (err) {
    console.error("Error seeding default categories:", err);
  }
}

function establishSession(
  req: Request,
  userId: string,
): Promise<void> {
  // Build a session user object that satisfies the existing isAuthenticated
  // contract: `req.user.claims.sub === userId`. We tag it with
  // `authProvider: "username"` so the middleware skips OIDC token refresh.
  const sessionUser = {
    claims: { sub: userId },
    authProvider: "username" as const,
  };
  return new Promise((resolve, reject) => {
    req.login(sessionUser, (err) => (err ? reject(err) : resolve()));
  });
}

export function registerUsernameAuthRoutes(app: Express): void {
  app.post("/api/auth/username/signup", async (req, res) => {
    const parsed = usernameSignupSchema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return res.status(400).json({
        message: first?.message ?? "Invalid input",
        field: typeof first?.path?.[0] === "string" ? first.path[0] : undefined,
      });
    }
    const { username, pin } = parsed.data;
    try {
      const lower = username.toLowerCase();
      const existing = await authStorage.getUsernameLoginByUsername(lower);
      if (existing) {
        return res
          .status(409)
          .json({ message: "Username is already taken", field: "username" });
      }
      const pinHash = await hashPin(pin);
      const { user, login } = await authStorage.createUsernameUser({
        username,
        pinHash,
      });
      // Generate a one-time recovery code, store its scrypt hash, and
      // surface the plaintext to the client EXACTLY ONCE in this response.
      // The user is expected to copy/save it; we never store it in plain.
      const recovery = generateRecoveryCode();
      const recoveryHash = await hashPin(recovery.raw);
      await authStorage.setRecoveryCodeHash(user.id, recoveryHash);
      await seedDefaultCategoriesFor(user.id);
      await establishSession(req, user.id);
      // `users.username` is intentionally NULL for username-login accounts.
      // The chosen handle lives in `username_logins` — return it from there.
      res.status(201).json({
        id: user.id,
        username: login.username,
        recoveryCode: recovery.formatted,
      });
    } catch (err) {
      if (err instanceof UsernameTakenError) {
        return res
          .status(409)
          .json({ message: "Username is already taken", field: "username" });
      }
      console.error("[username-signup] error:", err);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post("/api/auth/username/signin", async (req, res) => {
    const parsed = usernameSigninSchema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return res.status(400).json({
        message: first?.message ?? "Invalid input",
        field: typeof first?.path?.[0] === "string" ? first.path[0] : undefined,
      });
    }
    const ipCheck = tickIpAttempts(req);
    if (!ipCheck.allowed) {
      return res
        .status(429)
        .json({ message: "Too many attempts. Please try again later." });
    }

    try {
      const lower = parsed.data.username.toLowerCase();
      const login = await authStorage.getUsernameLoginByUsername(lower);
      if (!login) {
        // Don't reveal whether the username exists vs the PIN was wrong —
        // but the task explicitly asks for a "username not found" error so
        // the UX matches the spec.
        return res
          .status(401)
          .json({ message: "Username not found", field: "username" });
      }
      if (login.lockedUntil && login.lockedUntil.getTime() > Date.now()) {
        const minutes = Math.ceil(
          (login.lockedUntil.getTime() - Date.now()) / 60_000,
        );
        return res.status(423).json({
          message: `Account locked. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
          minutes,
        });
      }
      // Lockout window has elapsed (or was never set): zero the failed-
      // attempt counter so the user gets a fresh 5-attempt budget. Without
      // this, `failedAttempts` would still be ≥5 from the previous lockout
      // and a single wrong PIN would immediately re-lock the account.
      if (
        login.lockedUntil ||
        (login.failedAttempts ?? 0) >= MAX_FAILED_ATTEMPTS
      ) {
        await authStorage.clearFailedPinAttempts(login.userId);
        login.failedAttempts = 0;
        login.lockedUntil = null;
      }
      const ok = await verifyPin(parsed.data.pin, login.pinHash);
      if (!ok) {
        const nextCount = (login.failedAttempts ?? 0) + 1;
        const lockedUntil =
          nextCount >= MAX_FAILED_ATTEMPTS
            ? new Date(Date.now() + LOCKOUT_MS)
            : null;
        await authStorage.recordFailedPinAttempt(login.userId, lockedUntil);
        if (lockedUntil) {
          return res.status(423).json({
            message: `Account locked. Try again in ${Math.ceil(LOCKOUT_MS / 60_000)} minutes.`,
            minutes: Math.ceil(LOCKOUT_MS / 60_000),
          });
        }
        return res
          .status(401)
          .json({ message: "Wrong PIN", field: "pin" });
      }
      await authStorage.clearFailedPinAttempts(login.userId);
      clearIpAttemptsOnSuccess(req);
      await establishSession(req, login.userId);
      res.json({ id: login.userId, username: login.username });
    } catch (err) {
      console.error("[username-signin] error:", err);
      res.status(500).json({ message: "Failed to sign in" });
    }
  });

  app.post("/api/auth/username/forgot-pin", async (req, res) => {
    const parsed = forgotPinSchema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return res.status(400).json({
        message: first?.message ?? "Invalid input",
        field: typeof first?.path?.[0] === "string" ? first.path[0] : undefined,
      });
    }
    // Recovery shares the same per-IP rate limiter as signin so an attacker
    // can't pivot from PIN-stuffing to recovery-code-stuffing on the same
    // address without paying the budget.
    const ipCheck = tickIpAttempts(req);
    if (!ipCheck.allowed) {
      return res
        .status(429)
        .json({ message: "Too many attempts. Please try again later." });
    }
    try {
      const lower = parsed.data.username.toLowerCase();
      const login = await authStorage.getUsernameLoginByUsername(lower);
      // Always do equal-ish work for unknown usernames so attackers can't
      // distinguish "no such user" from "wrong code" via timing.
      if (!login || !login.recoveryCodeHash) {
        // Burn a hash compare on a throwaway value so the response time
        // matches the real path (defense-in-depth, not strict CT).
        await verifyPin(parsed.data.recoveryCode, "scrypt$00$00");
        return res
          .status(401)
          .json({ message: "Invalid recovery code", field: "recoveryCode" });
      }
      if (
        login.recoveryLockedUntil &&
        login.recoveryLockedUntil.getTime() > Date.now()
      ) {
        const minutes = Math.ceil(
          (login.recoveryLockedUntil.getTime() - Date.now()) / 60_000,
        );
        return res.status(423).json({
          message: `Recovery locked. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
          minutes,
        });
      }
      // If a previous lockout window has elapsed, zero the recovery counter
      // so the user gets a fresh budget (mirrors the PIN-signin path).
      if (
        login.recoveryLockedUntil ||
        (login.recoveryFailedAttempts ?? 0) >= MAX_FAILED_ATTEMPTS
      ) {
        await authStorage.clearFailedRecoveryAttempts(login.userId);
        login.recoveryFailedAttempts = 0;
        login.recoveryLockedUntil = null;
      }
      const ok = await verifyPin(
        parsed.data.recoveryCode,
        login.recoveryCodeHash,
      );
      if (!ok) {
        const nextCount = (login.recoveryFailedAttempts ?? 0) + 1;
        const lockedUntil =
          nextCount >= MAX_FAILED_ATTEMPTS
            ? new Date(Date.now() + LOCKOUT_MS)
            : null;
        await authStorage.recordFailedRecoveryAttempt(login.userId, lockedUntil);
        if (lockedUntil) {
          return res.status(423).json({
            message: `Recovery locked. Try again in ${Math.ceil(LOCKOUT_MS / 60_000)} minutes.`,
            minutes: Math.ceil(LOCKOUT_MS / 60_000),
          });
        }
        return res
          .status(401)
          .json({ message: "Invalid recovery code", field: "recoveryCode" });
      }
      // Success: rotate PIN, burn recovery code, clear all lockout state.
      const newHash = await hashPin(parsed.data.newPin);
      await authStorage.consumeRecoveryAndResetPin(login.userId, newHash);
      clearIpAttemptsOnSuccess(req);
      res.json({ ok: true });
    } catch (err) {
      console.error("[username-forgot-pin] error:", err);
      res.status(500).json({ message: "Failed to reset PIN" });
    }
  });

  app.post(
    "/api/auth/username/change-pin",
    isAuthenticated,
    async (req: any, res) => {
      const userId = req.user?.claims?.sub as string | undefined;
      if (!userId || req.user?.authProvider !== "username") {
        return res
          .status(403)
          .json({ message: "PIN management not available for this account" });
      }
      const parsed = changePinSchema.safeParse(req.body);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        return res.status(400).json({
          message: first?.message ?? "Invalid input",
          field:
            typeof first?.path?.[0] === "string" ? first.path[0] : undefined,
        });
      }
      try {
        const login = await authStorage.getUsernameLoginByUserId(userId);
        if (!login) {
          return res.status(404).json({ message: "Login not found" });
        }
        const ok = await verifyPin(parsed.data.currentPin, login.pinHash);
        if (!ok) {
          return res
            .status(401)
            .json({ message: "Wrong PIN", field: "currentPin" });
        }
        const newHash = await hashPin(parsed.data.newPin);
        await authStorage.updatePinHash(userId, newHash);
        res.json({ ok: true });
      } catch (err) {
        console.error("[username-change-pin] error:", err);
        res.status(500).json({ message: "Failed to change PIN" });
      }
    },
  );
}
