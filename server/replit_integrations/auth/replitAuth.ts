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

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

// Session options shared between the production `getSession()` (which uses
// connect-pg-simple) and tests (which inject a memorystore). `rolling: true`
// + `resave: true` together implement "7 days of inactivity" rather than a
// hard 7-day cap from initial login.
export function buildSessionOptions(store: session.Store): session.SessionOptions {
  return {
    secret: process.env.SESSION_SECRET!,
    store,
    resave: true,
    rolling: true,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: SESSION_TTL_MS,
    },
  };
}

export function getSession() {
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: SESSION_TTL_MS / 1000, // connect-pg-simple expects seconds
    tableName: "sessions",
  });
  return session(buildSessionOptions(sessionStore));
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

    // When initiated from the Connect Gmail card, send the user back to
    // /profile after the round-trip (success or cancel) instead of "/".
    const sess = req.session as (typeof req.session) & {
      returnTo?: string;
      authFailureRedirect?: string;
    };
    if (provider === "google") {
      sess.returnTo = "/profile";
      sess.authFailureRedirect = "/profile";
    } else {
      delete sess.authFailureRedirect;
      delete sess.returnTo;
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
    const sess = req.session as (typeof req.session) & {
      authFailureRedirect?: string;
    };
    const failureRedirect = sess.authFailureRedirect ?? "/api/login";
    delete sess.authFailureRedirect;
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect,
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
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
      // Refresh token is genuinely invalid/expired/revoked. Tear down the
      // session cleanly so the next request hits the normal login flow
      // instead of getting stuck retrying with a dead token.
      const e = error as { error?: string; status?: number };
      logAuthFailure(req, "refresh_invalid_grant", {
        oauthError: e.error,
        status: e.status,
      });
      req.logout(() => {
        req.session?.destroy?.(() => {
          res.status(401).json({ message: "Unauthorized" });
        });
      });
      return;
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
