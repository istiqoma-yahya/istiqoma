// Run with: npx tsx --test server/replit_integrations/auth/updateProfile.test.ts
//
// Verifies the rule that username-auth users can update profile fields
// other than `username` (their handle lives in `username_logins` and
// must not be touched here). The reviewer flagged a previous version
// that returned 403 for the whole request — this test pins the
// strip-and-continue behavior.

process.env.SESSION_SECRET ??= "test-secret-not-used-anywhere-real";
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.REPL_ID ??= "test-repl-id";

import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import http from "node:http";
import { AddressInfo } from "node:net";

import { authStorage } from "./storage";
import { storage as appStorage } from "../../storage";
import { registerAuthRoutes } from "./routes";

// Stub the isAuthenticated middleware by registering routes against a
// pre-populated req.user. We do this by exporting a thin wrapper app that
// injects the user before delegating to registerAuthRoutes' handlers.
function buildApp(authProvider: "username" | "replit", userId = "u1") {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.user = {
      claims: { sub: userId },
      authProvider,
      // Far-future token so the replit-auth branch of isAuthenticated lets
      // the request through without trying to refresh.
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
    req.isAuthenticated = () => true;
    next();
  });
  registerAuthRoutes(app);
  return app;
}

async function start(app: express.Express) {
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, r));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((r) => server.close(() => r())),
  };
}

test("PATCH /api/auth/user (username-auth): strips username, updates phoneNumber", async () => {
  const seenCalls: Array<{ userId: string; data: any }> = [];
  (authStorage as any).updateProfile = async (userId: string, data: any) => {
    seenCalls.push({ userId, data });
    return { id: userId, username: null, phoneNumber: data.phoneNumber };
  };
  (appStorage as any).getUserOnboarding = async () => ({ completed: true });

  const { url, close } = await start(buildApp("username"));
  try {
    const res = await fetch(`${url}/api/auth/user`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "ignored_handle",
        phoneNumber: "+15551234",
      }),
    });
    assert.equal(res.status, 200);
    assert.equal(seenCalls.length, 1);
    assert.equal(
      seenCalls[0].data.username,
      undefined,
      "username must be stripped to undefined for username-auth",
    );
    assert.equal(seenCalls[0].data.phoneNumber, "+15551234");
  } finally {
    await close();
  }
});

test("PATCH /api/auth/user (replit-auth): username is forwarded normally", async () => {
  const seenCalls: Array<{ userId: string; data: any }> = [];
  (authStorage as any).updateProfile = async (userId: string, data: any) => {
    seenCalls.push({ userId, data });
    return { id: userId, username: data.username, phoneNumber: data.phoneNumber };
  };
  (appStorage as any).getUserOnboarding = async () => ({ completed: true });

  const { url, close } = await start(buildApp("replit"));
  try {
    const res = await fetch(`${url}/api/auth/user`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "newhandle",
        phoneNumber: "+15551234",
      }),
    });
    assert.equal(res.status, 200);
    assert.equal(seenCalls[0].data.username, "newhandle");
  } finally {
    await close();
  }
});
