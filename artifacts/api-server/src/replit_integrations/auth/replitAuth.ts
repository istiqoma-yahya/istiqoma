import * as client from "openid-client";
import {
  Strategy,
  type AuthenticateOptions,
  type VerifyFunction,
} from "openid-client/passport";
import type { Request } from "express";
import { randomBytes } from "crypto";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { authStorage } from "./storage";
import { storage } from "../../storage";
import { pool } from "../../db";
import { csrfOriginCheck } from "./csrfProtection";

declare module "express-session" {
  interface SessionData {
    nativeOAuth?: boolean;
  }
}

// ─── Native-app session exchange tokens ─────────────────────────────────────
// After the OIDC callback completes inside SFSafariViewController / Chrome
// Custom Tab, the session cookie lives in the system browser, not in the
// Capacitor WebView. We solve this by generating a short-lived one-time token
// here and redirecting to the `istiqoma://auth/done?token=<t>` custom URL
// scheme. The WebView receives the token via appUrlOpen, then calls
// GET /api/auth/native-session?token=<t> from its own cookie context,
// which calls req.login() and plants the session cookie in the WebView.
const NATIVE_EXCHANGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const nativeExchangeTokens = new Map<
  string,
  { user: Express.User; expiresAt: number }
>();

function cleanupExpiredExchangeTokens() {
  const now = Date.now();
  nativeExchangeTokens.forEach((v, k) => {
    if (now > v.expiresAt) nativeExchangeTokens.delete(k);
  });
}

const DEFAULT_CATEGORIES = [
  "Dzikir",
  "Sholat Fardhu",
  "Sholat Sunnah",
  "Puasa",
  "Baca Quran",
  "Shodaqoh",
];

const OLD_NAME_MAPPINGS: Record<string, string> = {
  "Recite Quran": "Baca Quran",
  "Fasting Fardhu": "Puasa",
  "Fasting Sunnah": "Puasa",
  "Puasa Fardhu": "Puasa",
  "Puasa Sunnah": "Puasa",
};

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

// Rolling session lifetime. `rolling: true` + `resave: true` make this a
// sliding window — every authenticated request resets the clock, so a user
// who keeps opening the app effectively stays signed in indefinitely. The
// 90-day window only matters as the "back from vacation" tolerance for an
// idle user. Username + PIN sessions never expire from OIDC token death,
// so this is the only TTL that governs them.
export const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

// Session options shared between the production `getSession()` (which uses
// connect-pg-simple) and tests (which inject a memorystore). `rolling: true`
// + `resave: true` together implement "90 days of inactivity" rather than a
// hard 90-day cap from initial login.
export function buildSessionOptions(store: session.Store): session.SessionOptions {
  return {
    secret: process.env.SESSION_SECRET!,
    store,
    resave: true,
    rolling: true,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // Always require HTTPS in production. Local development (and the
      // Playwright runner started by `npm run dev`) talks to the server over
      // plain HTTP, where a Secure cookie would be silently dropped by the
      // browser, so we relax the flag when NODE_ENV !== "production".
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_TTL_MS,
    },
  };
}

export function getSession() {
  const pgStore = connectPg(session);
  // Use the same Supabase pool as the rest of the app. The auto-injected
  // DATABASE_URL points at Replit's built-in Postgres (hostname "helium")
  // which is only resolvable inside the workspace, not from deployments —
  // using it here causes `getaddrinfo EAI_AGAIN helium` on login in prod.
  const sessionStore = new pgStore({
    pool: pool as any,
    createTableIfMissing: false,
    ttl: SESSION_TTL_MS / 1000, // connect-pg-simple expects seconds
    tableName: "sessions",
  });
  return session(buildSessionOptions(sessionStore));
}

// Same-origin path validation for `?returnTo=`. Reject anything that would
// let an attacker redirect a freshly-signed-in user off-site (full URLs,
// protocol-relative `//evil.com`, backslash tricks, control chars). The
// path must start with a single `/` and not point back at auth endpoints.
export function isSafeReturnTo(value: string): boolean {
  if (typeof value !== "string") return false;
  if (value.length === 0 || value.length > 512) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  if (/[\x00-\x1f]/.test(value)) return false;
  if (value.startsWith("/api/login") || value.startsWith("/api/logout")) {
    return false;
  }
  return true;
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  const userId = claims["sub"];
  
  await authStorage.upsertUser({
    id: userId,
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
  
  try {
    let categories = await storage.getCategories(userId);

    // Step 1: Rename old category names to current names
    for (const cat of categories) {
      const newName = OLD_NAME_MAPPINGS[cat.name];
      if (newName) {
        const alreadyHasNew = categories.some(c => c.id !== cat.id && c.name === newName);
        if (alreadyHasNew) {
          await storage.deleteCategory(cat.id, userId);
        } else {
          await storage.updateCategory(cat.id, userId, newName);
        }
      }
    }

    // Step 2: Re-fetch and remove ALL duplicate categories (keep the first, delete extras)
    categories = await storage.getCategories(userId);
    const seen = new Set<string>();
    for (const cat of categories) {
      const normalizedName = cat.name.toLowerCase();
      if (seen.has(normalizedName)) {
        await storage.deleteCategory(cat.id, userId);
      } else {
        seen.add(normalizedName);
      }
    }

    // Step 3: Seed any missing default categories and ensure protection
    categories = await storage.getCategories(userId);
    const existingNames = new Set(categories.map(c => c.name));
    for (const categoryName of DEFAULT_CATEGORIES) {
      if (!existingNames.has(categoryName)) {
        await storage.createCategory(userId, { name: categoryName, isProtected: true });
      } else {
        const existingCat = categories.find(c => c.name === categoryName);
        if (existingCat && !existingCat.isProtected) {
          await storage.markCategoryProtected(existingCat.id, userId);
        }
      }
    }
  } catch (error) {
    console.error("Error seeding default categories:", error);
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Strategy subclass that forwards a provider hint (acr_values) to the
  // OIDC authorization request when the caller passes ?provider=google
  // on /api/login. This makes Replit's OIDC jump straight into Google.
  class ReplitProviderHintStrategy extends Strategy {
    authorizationRequestParams<TOptions extends AuthenticateOptions>(
      req: Request,
      options: TOptions
    ): URLSearchParams | Record<string, string> | undefined {
      const base = super.authorizationRequestParams(req, options) ?? {};
      const params = base instanceof URLSearchParams
        ? base
        : new URLSearchParams(base);
      const provider =
        typeof req.query?.provider === "string" ? req.query.provider : undefined;
      if (provider === "google") {
        params.set("acr_values", "google");
      }
      return params;
    }
  }

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new ReplitProviderHintStrategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    const provider =
      typeof req.query.provider === "string" ? req.query.provider : undefined;
    const native = req.query.native === "1";

    // When initiated from the Connect Gmail card, send the user back to
    // /profile after the round-trip (success or cancel) instead of "/".
    const sess = req.session as (typeof req.session) & {
      returnTo?: string;
      authFailureRedirect?: string;
    };

    // Store the native flag in the session so /api/callback can read it
    // after the OIDC round-trip through the system browser.
    if (native) {
      req.session.nativeOAuth = true;
    } else {
      delete req.session.nativeOAuth;
    }

    if (provider === "google") {
      sess.returnTo = "/profile";
      sess.authFailureRedirect = "/profile";
    } else {
      delete sess.authFailureRedirect;
      delete sess.returnTo;
      // Honor a same-origin `?returnTo=/path` so the silent re-auth flow
      // (queryClient detects 401 → /api/login?returnTo=<current>) lands
      // the user back where they were instead of dumping them on "/".
      const rt =
        typeof req.query.returnTo === "string" ? req.query.returnTo : undefined;
      if (rt && isSafeReturnTo(rt)) {
        sess.returnTo = rt;
      }
    }

    const authOptions: AuthenticateOptions = {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    };
    passport.authenticate(`replitauth:${req.hostname}`, authOptions)(
      req,
      res,
      next
    );
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    const isNativeFlow = req.session.nativeOAuth === true;
    const sess = req.session as (typeof req.session) & {
      authFailureRedirect?: string;
      returnTo?: string;
    };
    const failureRedirect = isNativeFlow
      ? "istiqoma://auth/failed"
      : (sess.authFailureRedirect ?? "/api/login");
    delete req.session.nativeOAuth;
    delete sess.authFailureRedirect;

    // Use the callback form so we can intercept the result and issue a
    // custom URL scheme redirect for the native in-app browser flow.
    passport.authenticate(
      `replitauth:${req.hostname}`,
      (err: unknown, user: Express.User | false) => {
        if (err || !user) {
          return res.redirect(failureRedirect);
        }
        req.login(user, (loginErr) => {
          if (loginErr) {
            return res.redirect(failureRedirect);
          }
          if (isNativeFlow) {
            // Generate a short-lived one-time token so the Capacitor WebView
            // can establish its own session via GET /api/auth/native-session.
            const token = randomBytes(32).toString("hex");
            nativeExchangeTokens.set(token, {
              user,
              expiresAt: Date.now() + NATIVE_EXCHANGE_TTL_MS,
            });
            cleanupExpiredExchangeTokens();
            return res.redirect(`istiqoma://auth/done?token=${token}`);
          }
          // Web flow: honor returnTo saved before the OIDC round-trip.
          const returnTo =
            sess.returnTo && isSafeReturnTo(sess.returnTo)
              ? sess.returnTo
              : "/";
          delete sess.returnTo;
          return res.redirect(returnTo);
        });
      },
    )(req, res, next);
  });

  // Called by the Capacitor WebView after it receives the exchange token
  // via the istiqoma://auth/done?token=<t> deep link. Validates the token,
  // calls req.login() so express-session sets a cookie in the WebView's
  // HTTP context, and responds 200 JSON so the client can proceed.
  app.get("/api/auth/native-session", (req, res, next) => {
    const tokenParam =
      typeof req.query.token === "string" ? req.query.token : null;
    if (!tokenParam) {
      return res.status(400).json({ message: "Missing token" });
    }

    const entry = nativeExchangeTokens.get(tokenParam);
    nativeExchangeTokens.delete(tokenParam); // consume immediately — one-time use

    if (!entry || Date.now() > entry.expiresAt) {
      return res.status(401).json({ message: "Token expired or invalid" });
    }

    req.login(entry.user, (err) => {
      if (err) return next(err);
      res.json({ ok: true });
    });
  });

  app.post("/api/logout", csrfOriginCheck(), buildLogoutHandler(config));
}

// Exported so tests can exercise the username-vs-Replit branching without
// running the full OIDC discovery flow. The logout handler picks the OIDC
// end-session redirect for Replit sessions and a plain session-destroy /
// home redirect for username-login sessions (which carry no OIDC token).
export function buildLogoutHandler(
  config: client.Configuration,
): RequestHandler {
  return (req, res) => {
    const hasAccessToken = (u: unknown): u is { access_token: string } =>
      typeof u === "object" &&
      u !== null &&
      typeof (u as { access_token?: unknown }).access_token === "string";
    const isReplitSession = hasAccessToken(req.user);
    req.logout(() => {
      if (isReplitSession) {
        const location = client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href;
        res.json({ location });
      } else {
        req.session?.destroy?.(() => {
          res.json({ location: "/" });
        });
      }
    });
  };
}

// Reason codes emitted by the auth middleware. Surfaced in structured logs
// so we can diagnose "I got logged out" reports without leaking tokens.
type AuthFailureReason =
  | "not_authenticated"
  | "no_expires_at"
  | "no_refresh_token"
  | "refresh_invalid_grant"
  | "refresh_transient_error";

function newRequestId(): string {
  return randomBytes(6).toString("hex");
}

function logAuthFailure(
  req: any,
  reason: AuthFailureReason,
  extra?: Record<string, unknown>,
) {
  const userId = (req.user as any)?.claims?.sub;
  const reqId = newRequestId();
  // Single line, no token values. `extra` is for non-sensitive details
  // like the OAuth `error` code or HTTP status from the refresh call.
  console.warn(
    `[auth] failure reason=${reason} user=${userId ?? "anon"} req=${reqId} path=${req.path}${
      extra ? " " + JSON.stringify(extra) : ""
    }`,
  );
}

// Classify a token-refresh failure as either "the refresh token itself
// is no longer valid" (must log the user out) or "transient infrastructure
// problem" (network blip, 5xx, timeout — keep the user signed in).
function isInvalidGrantError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as {
    error?: string;
    status?: number;
    code?: string;
    name?: string;
  };
  // openid-client / oauth4webapi surface OAuth-style errors via
  // ResponseBodyError, which exposes `.error` (the OAuth error code) and
  // `.status` (HTTP status). `invalid_grant` is the canonical "refresh
  // token is no longer usable" signal. A 4xx other than 5xx with an
  // OAuth error string also indicates a definitive rejection.
  // Be conservative: only treat the canonical "refresh token is no longer
  // usable" OAuth error codes as definitive logouts. Other 4xx responses
  // (e.g. 429 rate limit) should be retried as transient — logging the
  // user out on a rate-limit blip would be a regression.
  const definitiveErrors = new Set([
    "invalid_grant",
    "invalid_token",
    "invalid_client",
    "unauthorized_client",
    "unsupported_grant_type",
  ]);
  if (typeof e.error === "string" && definitiveErrors.has(e.error)) {
    return true;
  }
  return false;
}

// Dependencies of the auth middleware that are swapped out in tests so we
// don't reach out to the real OIDC issuer or token endpoint.
export type IsAuthenticatedDeps = {
  refreshTokens: (refreshToken: string) =>
    Promise<client.TokenEndpointResponse & client.TokenEndpointResponseHelpers>;
  refreshTimeoutMs?: number;
};

const defaultDeps: IsAuthenticatedDeps = {
  refreshTokens: async (refreshToken: string) => {
    const config = await getOidcConfig();
    return client.refreshTokenGrant(config, refreshToken);
  },
  refreshTimeoutMs: 4000,
};

export function createIsAuthenticated(
  deps: IsAuthenticatedDeps = defaultDeps,
): RequestHandler {
  return async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated()) {
    logAuthFailure(req, "not_authenticated");
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Username + PIN sessions don't carry an OIDC token. Their lifetime is
  // governed entirely by the rolling cookie + session store, so there's
  // nothing to refresh — let them through.
  if (user?.authProvider === "username") {
    return next();
  }

  if (!user?.expires_at) {
    logAuthFailure(req, "no_expires_at");
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    logAuthFailure(req, "no_refresh_token");
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Retry the refresh once on transient failures, each attempt bounded by
  // a short timeout so a hung token endpoint can't stall the request. A
  // timeout is treated as a transient error (not invalid_grant), which
  // means the second attempt runs and, if that also fails, the safe-method
  // bypass below applies.
  const REFRESH_TIMEOUT_MS = deps.refreshTimeoutMs ?? 4000;
  const tryRefresh = async () => {
    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          Object.assign(new Error("refresh timeout"), {
            name: "RefreshTimeoutError",
          }),
        );
      }, REFRESH_TIMEOUT_MS);
    });
    try {
      return await Promise.race([
        deps.refreshTokens(refreshToken),
        timeoutPromise,
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  try {
    let tokenResponse;
    try {
      tokenResponse = await tryRefresh();
    } catch (firstErr) {
      if (isInvalidGrantError(firstErr)) throw firstErr;
      // Transient — retry once before giving up on this request.
      tokenResponse = await tryRefresh();
    }
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    if (isInvalidGrantError(error)) {
      // Refresh token is genuinely invalid/expired/revoked. We DON'T
      // destroy the session here anymore — the session cookie is the
      // only thing that lets the client run the silent re-auth flow
      // (queryClient sees 401 → redirects to /api/login?returnTo=…).
      // Once the user finishes /api/callback, passport overwrites the
      // user object on the same session, so no orphaned data lingers.
      // We do still respond 401 (and refuse to authorize this request)
      // so the client knows it needs to re-auth, but we keep the
      // session cookie alive so the round-trip is seamless.
      const e = error as { error?: string; status?: number };
      logAuthFailure(req, "refresh_invalid_grant", {
        oauthError: e.error,
        status: e.status,
        method: req.method,
      });
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Transient failure (network error, 5xx, timeout, etc). Don't punish
    // the user for an upstream blip — but the access token IS expired and
    // we couldn't prove the refresh token is still valid, so we should
    // not authorize sensitive mutations. Allow safe (read-only) methods
    // through using the still-valid session; reject write methods with
    // 401 without destroying the session, so the user stays signed in
    // and the next request can retry the refresh.
    const e = error as { name?: string; message?: string; status?: number };
    const safeMethod =
      req.method === "GET" ||
      req.method === "HEAD" ||
      req.method === "OPTIONS";
    logAuthFailure(req, "refresh_transient_error", {
      name: e.name,
      status: e.status,
      message: e.message?.slice(0, 200),
      method: req.method,
      allowed: safeMethod,
    });
    if (safeMethod) {
      return next();
    }
    return res.status(401).json({ message: "Unauthorized" });
  }
  };
}

export const isAuthenticated: RequestHandler = createIsAuthenticated();
