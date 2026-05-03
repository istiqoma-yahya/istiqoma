// Run with: npx tsx --test server/replit_integrations/auth/logout.test.ts
//
// Pins the /api/logout behavior for username-login sessions: req.logout
// runs, the local session is destroyed, and the response redirects to "/"
// (no OIDC end-session URL is involved because the username flow carries
// no access_token). Uses `buildLogoutHandler` directly to avoid the real
// OIDC discovery flow that runs inside `setupAuth`.

process.env.SESSION_SECRET ??= "test-secret-not-used-anywhere-real";
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.REPL_ID ??= "test-repl-id";

import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import http from "node:http";
import { AddressInfo } from "node:net";

import { buildLogoutHandler } from "./replitAuth";

async function start(app: express.Express) {
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, r));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}

function appWith(user: unknown) {
  const app = express();
  let sessionDestroyed = false;
  let loggedOut = false;
  app.use((req: any, _res, next) => {
    req.user = user;
    req.logout = (cb: () => void) => {
      loggedOut = true;
      cb();
    };
    req.session = {
      destroy: (cb: () => void) => {
        sessionDestroyed = true;
        cb();
      },
    };
    next();
  });
  app.get("/api/logout", buildLogoutHandler({} as any));
  return {
    app,
    state: () => ({ sessionDestroyed, loggedOut }),
  };
}

test("/api/logout (username session): logs out, destroys session, redirects to /", async () => {
  const harness = appWith({
    claims: { sub: "u1" },
    authProvider: "username",
  });
  const { url, close } = await start(harness.app);
  try {
    const res = await fetch(`${url}/api/logout`, { redirect: "manual" });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), "/");
    const s = harness.state();
    assert.equal(s.loggedOut, true);
    assert.equal(s.sessionDestroyed, true);
  } finally {
    await close();
  }
});

test("/api/logout (no user at all): treated as a non-OIDC session, redirects to /", async () => {
  // Defensive: if a logged-out request somehow hits /api/logout, the
  // username-session branch still applies (no access_token present).
  const harness = appWith(undefined);
  const { url, close } = await start(harness.app);
  try {
    const res = await fetch(`${url}/api/logout`, { redirect: "manual" });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), "/");
    const s = harness.state();
    assert.equal(s.loggedOut, true);
    assert.equal(s.sessionDestroyed, true);
  } finally {
    await close();
  }
});
