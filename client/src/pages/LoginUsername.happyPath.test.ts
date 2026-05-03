// Run with: npx tsx --test client/src/pages/LoginUsername.happyPath.test.ts
//
// Frontend "happy path" for the new login form. The repo doesn't ship a
// DOM/render harness (no jsdom/@testing-library, package.json is locked),
// so this test exercises the end-to-end path the LoginUsername.tsx
// mutation actually performs: it (1) validates input via the same
// react-hook-form-bound Zod schema, and (2) POSTs to the real
// /api/auth/username/{signup,signin} routes mounted on a stubbed-storage
// Express app, asserting the same JSON shape the mutation's `onSuccess`
// reads.

process.env.SESSION_SECRET ??= "test-secret-not-used-anywhere-real";
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.REPL_ID ??= "test-repl-id";

import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import passport from "passport";
import http from "node:http";
import { AddressInfo } from "node:net";

import {
  usernameSigninSchema,
  usernameSignupSchema,
} from "../../../shared/models/auth";
import { authStorage, UsernameTakenError } from "../../../server/replit_integrations/auth/storage";
import { storage as appStorage } from "../../../server/storage";
import { registerUsernameAuthRoutes } from "../../../server/replit_integrations/auth/usernameRoutes";
import { hashPin } from "../../../server/replit_integrations/auth/pinHash";

function installFakes() {
  const users = new Map<string, { id: string }>();
  const logins = new Map<string, any>();
  const byUserId = new Map<string, any>();
  let nextId = 1;
  (authStorage as any).getUsernameLoginByUsername = async (lower: string) =>
    logins.get(lower);
  (authStorage as any).getUsernameLoginByUserId = async (uid: string) =>
    byUserId.get(uid);
  (authStorage as any).createUsernameUser = async (data: {
    username: string;
    pinHash: string;
  }) => {
    const lower = data.username.toLowerCase();
    if (logins.has(lower)) throw new UsernameTakenError();
    const id = `u${nextId++}`;
    const user = { id };
    users.set(id, user);
    const login = {
      userId: id,
      username: data.username,
      pinHash: data.pinHash,
      failedAttempts: 0,
      lockedUntil: null,
      pinUpdatedAt: new Date(),
      createdAt: new Date(),
    };
    logins.set(lower, login);
    byUserId.set(id, login);
    return { user, login };
  };
  (authStorage as any).recordFailedPinAttempt = async () => undefined;
  (authStorage as any).clearFailedPinAttempts = async () => {};
  (authStorage as any).updatePinHash = async () => {};
  // Signup seeds default categories — stub the underlying storage calls so
  // we don't hit the real database from this test.
  (appStorage as any).getCategories = async () => [];
  (appStorage as any).createCategory = async () => ({});
}

function buildApp() {
  const app = express();
  app.use(express.json());
  const MemStore = createMemoryStore(session);
  app.use(
    session({
      secret: "test-secret",
      resave: false,
      saveUninitialized: false,
      store: new MemStore({ checkPeriod: 60_000 }),
      cookie: { secure: false, httpOnly: true },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());
  passport.serializeUser((u: any, done) => done(null, u));
  passport.deserializeUser((u: any, done) => done(null, u));
  registerUsernameAuthRoutes(app);
  return app;
}

async function start(app: express.Express) {
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, r));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}

test("LoginUsername happy path: signup form input -> 201 with username", async () => {
  installFakes();
  // Step 1: react-hook-form's zodResolver runs this exact validation.
  const input = { username: "abu_yusuf", pin: "1234", confirmPin: "1234" };
  const parsed = usernameSignupSchema.safeParse(input);
  assert.equal(parsed.success, true);

  // Step 2: the mutation POSTs the validated payload.
  const { url, close } = await start(buildApp());
  try {
    const res = await fetch(`${url}/api/auth/username/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    // The mutation's onSuccess reads `body.username` to confirm the new user.
    assert.equal(body.username, "abu_yusuf");
    assert.ok(body.id);
  } finally {
    await close();
  }
});

test("LoginUsername happy path: signin form input -> 200 after signup", async () => {
  installFakes();
  // Pre-create the account directly via storage.
  const pinHash = await hashPin("1234");
  await (authStorage as any).createUsernameUser({
    username: "abu_yusuf",
    pinHash,
  });

  const input = { username: "abu_yusuf", pin: "1234" };
  const parsed = usernameSigninSchema.safeParse(input);
  assert.equal(parsed.success, true);

  const { url, close } = await start(buildApp());
  try {
    const res = await fetch(`${url}/api/auth/username/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    assert.equal(res.status, 200);
    // Cookie must be set so the subsequent /api/auth/user query (which the
    // mutation invalidates on success) can pick up the authenticated session.
    const setCookie = res.headers.get("set-cookie") ?? "";
    assert.match(setCookie, /connect\.sid/);
  } finally {
    await close();
  }
});
