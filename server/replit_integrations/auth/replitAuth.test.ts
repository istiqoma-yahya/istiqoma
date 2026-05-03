// Run with: npx tsx --test server/replit_integrations/auth/replitAuth.test.ts
//
// These tests lock in two subtle sign-in behaviors (see task #91):
//   1. The session cookie rolls forward on every authenticated request, so an
//      active user gets "7 days of inactivity" rather than a hard 7-day cap.
//   2. A transient failure from the OIDC token endpoint does NOT log the user
//      out, while a genuine `invalid_grant` does (cleanly destroying the
//      session and returning 401).

process.env.SESSION_SECRET ??= "test-secret-not-used-anywhere-real";
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.REPL_ID ??= "test-repl-id";

import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import http from "node:http";
import { AddressInfo } from "node:net";

import {
  buildSessionOptions,
  createIsAuthenticated,
  type IsAuthenticatedDeps,
} from "./replitAuth";

// ---- helpers ----------------------------------------------------------------

const MemoryStore = createMemoryStore(session);

type Cookie = { name: string; value: string; raw: string };

function parseSetCookie(header: string | string[] | undefined): Cookie[] {
  if (!header) return [];
  const arr = Array.isArray(header) ? header : [header];
  return arr.map((raw) => {
    const first = raw.split(";")[0];
    const eq = first.indexOf("=");
    return {
      name: first.slice(0, eq),
      value: first.slice(eq + 1),
      raw,
    };
  });
}

function startServer(app: express.Express): Promise<{
  url: string;
  close: () => Promise<void>;
}> {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise<void>((res, rej) =>
            server.close((err) => (err ? rej(err) : res())),
          ),
      });
    });
  });
}

type RawResponse = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
};

function request(
  url: string,
  opts: { method?: string; headers?: Record<string, string> } = {},
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      { method: opts.method ?? "GET", headers: opts.headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    req.on("error", reject);
    req.end();
  });
}

// ---- (a) rolling session cookie --------------------------------------------

test("session cookie rolls forward on every authenticated request", async () => {
  // Use the same options the real `getSession()` builds, but with an
  // in-memory store so the test doesn't need a Postgres connection.
  const store = new MemoryStore({ checkPeriod: 60_000 });
  const opts = buildSessionOptions(store);
  // Cookie `secure: true` requires HTTPS; the test server is HTTP only.
  opts.cookie = { ...opts.cookie, secure: false };

  const app = express();
  app.set("trust proxy", 1);
  app.use(session(opts));
  app.get("/login", (req, res) => {
    (req.session as any).userId = "u1";
    res.json({ ok: true });
  });
  app.get("/me", (req, res) => {
    res.json({ userId: (req.session as any).userId ?? null });
  });

  const { url, close } = await startServer(app);
  try {
    // Initial login establishes the session.
    const loginRes = await request(`${url}/login`);
    assert.equal(loginRes.status, 200);
    const loginCookies = parseSetCookie(loginRes.headers["set-cookie"]);
    const sid = loginCookies.find((c) => c.name === "connect.sid");
    assert.ok(sid, "login should set connect.sid");

    // First authenticated request — rolling:true means a fresh Set-Cookie
    // is emitted even though the session id is unchanged.
    const r1 = await request(`${url}/me`, {
      headers: { Cookie: `${sid!.name}=${sid!.value}` },
    });
    assert.equal(r1.status, 200);
    assert.deepEqual(JSON.parse(r1.body), { userId: "u1" });
    const r1Cookies = parseSetCookie(r1.headers["set-cookie"]);
    const r1Sid = r1Cookies.find((c) => c.name === "connect.sid");
    assert.ok(
      r1Sid,
      "rolling:true should re-issue the session cookie on each request",
    );
    // Same session id (same logged-in user, not a new session).
    assert.equal(r1Sid!.value, sid!.value);
    // Cookie carries an Expires/Max-Age so the browser extends its TTL.
    assert.match(
      r1Sid!.raw,
      /(Expires=|Max-Age=)/i,
      "rolling cookie should include Expires/Max-Age",
    );

    // Second authenticated request — also re-rolls.
    const r2 = await request(`${url}/me`, {
      headers: { Cookie: `${sid!.name}=${sid!.value}` },
    });
    const r2Sid = parseSetCookie(r2.headers["set-cookie"]).find(
      (c) => c.name === "connect.sid",
    );
    assert.ok(r2Sid, "second request should also re-roll the cookie");
  } finally {
    await close();
  }
});

test("buildSessionOptions enforces rolling + resave + non-anon-persisted", () => {
  const store = new MemoryStore({});
  const opts = buildSessionOptions(store);
  assert.equal(opts.rolling, true, "rolling must be true to extend cookie");
  assert.equal(opts.resave, true, "resave must be true to refresh store TTL");
  assert.equal(
    opts.saveUninitialized,
    false,
    "anonymous traffic must not be persisted",
  );
  assert.ok(opts.cookie?.maxAge && opts.cookie.maxAge > 0);
});

// ---- (b) & (c) isAuthenticated refresh-token semantics ---------------------

function makeReqRes(opts: {
  authenticated?: boolean;
  user?: any;
  method?: string;
}) {
  const req: any = {
    isAuthenticated: () => opts.authenticated ?? true,
    user: opts.user,
    method: opts.method ?? "GET",
    path: "/api/protected",
    session: {
      destroyed: false,
      destroy(cb: (err?: any) => void) {
        this.destroyed = true;
        cb();
      },
    },
    loggedOut: false,
    logout(cb: () => void) {
      this.loggedOut = true;
      cb();
    },
  };

  const res: any = {
    statusCode: 200,
    body: undefined as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.body = payload;
      return this;
    },
  };

  let nextCalled = false;
  let nextErr: unknown;
  const next = (err?: unknown) => {
    nextCalled = true;
    nextErr = err;
  };

  return {
    req,
    res,
    next,
    nextWasCalled: () => nextCalled,
    nextError: () => nextErr,
  };
}

const validTokens = () =>
  ({
    access_token: "new-access-token",
    refresh_token: "new-refresh-token",
    claims: () => ({
      sub: "user-1",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  }) as any;

test("transient token-endpoint failure on GET keeps the user signed in (next() is called)", async () => {
  const expiredAt = Math.floor(Date.now() / 1000) - 60;
  const user = {
    claims: { sub: "user-1" },
    expires_at: expiredAt,
    refresh_token: "rt",
    access_token: "old",
  };

  let attempts = 0;
  const deps: IsAuthenticatedDeps = {
    refreshTokens: async () => {
      attempts++;
      // Network-style failure with no OAuth `error` field — treated as
      // transient by isInvalidGrantError.
      throw Object.assign(new Error("ECONNRESET"), {
        name: "FetchError",
        code: "ECONNRESET",
      });
    },
    refreshTimeoutMs: 1000,
  };

  const handler = createIsAuthenticated(deps);
  const { req, res, next, nextWasCalled } = makeReqRes({
    user,
    method: "GET",
  });

  await handler(req, res, next);

  // Both refresh attempts should have run (initial + one retry).
  assert.equal(attempts, 2, "transient failures should trigger a retry");
  // GET requests pass through on transient failures so the user is not
  // logged out for an upstream blip.
  assert.equal(nextWasCalled(), true, "GET should fall through to next()");
  assert.equal(req.loggedOut, false, "session must NOT be torn down");
  assert.equal(req.session.destroyed, false);
  assert.equal(res.statusCode, 200);
});

test("transient failure on a write method returns 401 but keeps the session intact", async () => {
  const user = {
    claims: { sub: "user-1" },
    expires_at: Math.floor(Date.now() / 1000) - 60,
    refresh_token: "rt",
  };
  const deps: IsAuthenticatedDeps = {
    refreshTokens: async () => {
      throw Object.assign(new Error("upstream 502"), { status: 502 });
    },
    refreshTimeoutMs: 1000,
  };
  const handler = createIsAuthenticated(deps);
  const { req, res, next, nextWasCalled } = makeReqRes({
    user,
    method: "POST",
  });

  await handler(req, res, next);

  assert.equal(nextWasCalled(), false, "POST must not fall through");
  assert.equal(res.statusCode, 401);
  // Crucially: the session is preserved so the next request can retry.
  assert.equal(req.loggedOut, false);
  assert.equal(req.session.destroyed, false);
});

test("invalid_grant from token endpoint destroys the session and returns 401", async () => {
  const user = {
    claims: { sub: "user-1" },
    expires_at: Math.floor(Date.now() / 1000) - 60,
    refresh_token: "rt-revoked",
  };

  let attempts = 0;
  const deps: IsAuthenticatedDeps = {
    refreshTokens: async () => {
      attempts++;
      // Canonical OAuth "this refresh token is no longer valid" signal,
      // shaped like an openid-client ResponseBodyError.
      throw Object.assign(new Error("invalid_grant"), {
        error: "invalid_grant",
        status: 400,
      });
    },
    refreshTimeoutMs: 1000,
  };

  const handler = createIsAuthenticated(deps);
  const { req, res, next, nextWasCalled } = makeReqRes({
    user,
    method: "GET",
  });

  await handler(req, res, next);
  // Wait a tick because the handler completes the response inside nested
  // callbacks (req.logout -> req.session.destroy -> res.status().json()).
  await new Promise((r) => setImmediate(r));

  assert.equal(
    attempts,
    1,
    "invalid_grant must NOT be retried (it's a definitive rejection)",
  );
  assert.equal(nextWasCalled(), false, "must not fall through to next()");
  assert.equal(req.loggedOut, true, "req.logout must be called");
  assert.equal(req.session.destroyed, true, "session must be destroyed");
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { message: "Unauthorized" });
});

test("happy path: still-valid access token short-circuits without calling refresh", async () => {
  const user = {
    claims: { sub: "user-1" },
    expires_at: Math.floor(Date.now() / 1000) + 600,
    refresh_token: "rt",
  };
  let called = false;
  const deps: IsAuthenticatedDeps = {
    refreshTokens: async () => {
      called = true;
      return validTokens();
    },
  };
  const handler = createIsAuthenticated(deps);
  const { req, res, next, nextWasCalled } = makeReqRes({ user });
  await handler(req, res, next);
  assert.equal(called, false, "no refresh call when token is still valid");
  assert.equal(nextWasCalled(), true);
  assert.equal(res.statusCode, 200);
});

test("successful refresh updates the session user and calls next()", async () => {
  const user: any = {
    claims: { sub: "user-1" },
    expires_at: Math.floor(Date.now() / 1000) - 60,
    refresh_token: "old-rt",
    access_token: "old-at",
  };
  const deps: IsAuthenticatedDeps = {
    refreshTokens: async () => validTokens(),
  };
  const handler = createIsAuthenticated(deps);
  const { req, res, next, nextWasCalled } = makeReqRes({ user });
  await handler(req, res, next);
  assert.equal(nextWasCalled(), true);
  assert.equal(user.access_token, "new-access-token");
  assert.equal(user.refresh_token, "new-refresh-token");
  assert.ok(user.expires_at > Math.floor(Date.now() / 1000));
});
