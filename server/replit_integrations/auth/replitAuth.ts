import * as client from "openid-client";
import {
  Strategy,
  type AuthenticateOptions,
  type VerifyFunction,
} from "openid-client/passport";
import type { Request } from "express";

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

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
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

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
