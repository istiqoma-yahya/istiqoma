// Run with: npx tsx --test server/replit_integrations/auth/usernameRoutes.test.ts
//
// Integration tests for the username + PIN HTTP routes. We avoid the real
// database by replacing every method on the exported `authStorage` and
// `storage` singletons with in-memory fakes for the duration of the test
// suite. This keeps the test focused on:
//   - schema validation at the boundary (signup/signin/change-pin)
//   - the lockout-after-5-wrong-PIN flow (returns 423 with `minutes`)
//   - the duplicate-username path (returns 409)
//   - that change-pin refuses unauthenticated requests

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

import { authStorage, UsernameTakenError } from "./storage";
import { storage as appStorage } from "../../storage";
import { registerUsernameAuthRoutes } from "./usernameRoutes";
import { hashPin } from "./pinHash";

// ---- in-memory fake storage ------------------------------------------------

type FakeLogin = {
  userId: string;
  username: string;
  pinHash: string;
  failedAttempts: number;
  lockedUntil: Date | null;
  recoveryCodeHash: string | null;
  recoveryCodeUsedAt: Date | null;
  recoveryFailedAttempts: number;
  recoveryLockedUntil: Date | null;
  pinUpdatedAt: Date;
  createdAt: Date;
};

function makeFakes() {
  const users = new Map<string, { id: string }>();
  const logins = new Map<string, FakeLogin>(); // by lower(username)
  const byUserId = new Map<string, FakeLogin>();
  let nextId = 1;
  return {
    users,
    logins,
    byUserId,
    reset() {
      users.clear();
      logins.clear();
      byUserId.clear();
      nextId = 1;
    },
    install() {
      (authStorage as any).getUsernameLoginByUsername = async (lower: string) =>
        logins.get(lower);
      (authStorage as any).getUsernameLoginByUserId = async (userId: string) =>
        byUserId.get(userId);
      (authStorage as any).createUsernameUser = async (data: {
        username: string;
        pinHash: string;
      }) => {
        const lower = data.username.toLowerCase();
        if (logins.has(lower)) throw new UsernameTakenError();
        const id = `u${nextId++}`;
        const user = { id };
        users.set(id, user);
        const login: FakeLogin = {
          userId: id,
          username: data.username,
          pinHash: data.pinHash,
          failedAttempts: 0,
          lockedUntil: null,
          recoveryCodeHash: null,
          recoveryCodeUsedAt: null,
          recoveryFailedAttempts: 0,
          recoveryLockedUntil: null,
          pinUpdatedAt: new Date(),
          createdAt: new Date(),
        };
        logins.set(lower, login);
        byUserId.set(id, login);
        return { user: user as any, login: login as any };
      };
      (authStorage as any).recordFailedPinAttempt = async (
        userId: string,
        lockedUntil: Date | null,
      ) => {
        const login = byUserId.get(userId);
        if (!login) return undefined;
        login.failedAttempts += 1;
        login.lockedUntil = lockedUntil;
        return login as any;
      };
      (authStorage as any).clearFailedPinAttempts = async (userId: string) => {
        const login = byUserId.get(userId);
        if (login) {
          login.failedAttempts = 0;
          login.lockedUntil = null;
        }
      };
      (authStorage as any).updatePinHash = async (
        userId: string,
        pinHash: string,
      ) => {
        const login = byUserId.get(userId);
        if (login) {
          login.pinHash = pinHash;
          login.failedAttempts = 0;
          login.lockedUntil = null;
        }
      };
      (authStorage as any).setRecoveryCodeHash = async (
        userId: string,
        hash: string | null,
      ) => {
        const login = byUserId.get(userId);
        if (login) {
          login.recoveryCodeHash = hash;
          login.recoveryCodeUsedAt = hash === null ? new Date() : null;
        }
      };
      (authStorage as any).recordFailedRecoveryAttempt = async (
        userId: string,
        lockedUntil: Date | null,
      ) => {
        const login = byUserId.get(userId);
        if (!login) return undefined;
        login.recoveryFailedAttempts += 1;
        login.recoveryLockedUntil = lockedUntil;
        return login as any;
      };
      (authStorage as any).clearFailedRecoveryAttempts = async (
        userId: string,
      ) => {
        const login = byUserId.get(userId);
        if (login) {
          login.recoveryFailedAttempts = 0;
          login.recoveryLockedUntil = null;
        }
      };
      (authStorage as any).consumeRecoveryAndResetPin = async (
        userId: string,
        pinHash: string,
      ) => {
        const login = byUserId.get(userId);
        if (login) {
          login.pinHash = pinHash;
          login.failedAttempts = 0;
          login.lockedUntil = null;
          login.recoveryCodeHash = null;
          login.recoveryCodeUsedAt = new Date();
          login.recoveryFailedAttempts = 0;
          login.recoveryLockedUntil = null;
        }
      };
      // Skip default-category seeding — we don't care about it here.
      (appStorage as any).getCategories = async () => [];
      (appStorage as any).createCategory = async () => ({});
    },
  };
}

// ---- Express harness -------------------------------------------------------

const MemoryStore = createMemoryStore(session);

function buildApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json());
  app.use(
    session({
      secret: "test",
      resave: true,
      saveUninitialized: false,
      rolling: true,
      store: new MemoryStore({ checkPeriod: 60_000 }),
      cookie: { secure: false, httpOnly: true, maxAge: 60_000 },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());
  passport.serializeUser((u: any, cb) => cb(null, u));
  passport.deserializeUser((u: any, cb) => cb(null, u));
  registerUsernameAuthRoutes(app);
  return app;
}

function start(app: express.Express): Promise<{
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

type Resp = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: any;
};

function req(
  url: string,
  opts: { method?: string; headers?: Record<string, string>; body?: any } = {},
): Promise<Resp> {
  const data = opts.body !== undefined ? JSON.stringify(opts.body) : undefined;
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (data !== undefined) headers["content-type"] = "application/json";
  return new Promise((resolve, reject) => {
    const r = http.request(url, { method: opts.method ?? "GET", headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let body: any = text;
        try {
          body = JSON.parse(text);
        } catch {
          /* leave as text */
        }
        resolve({ status: res.statusCode ?? 0, headers: res.headers, body });
      });
    });
    r.on("error", reject);
    if (data !== undefined) r.write(data);
    r.end();
  });
}

function getCookie(headers: Resp["headers"]): string | undefined {
  const sc = headers["set-cookie"];
  if (!sc) return undefined;
  const arr = Array.isArray(sc) ? sc : [sc];
  return arr.map((c) => c.split(";")[0]).join("; ");
}

// ---- tests -----------------------------------------------------------------

test("POST /signup: happy path returns 201, dup returns 409", async () => {
  const fakes = makeFakes();
  fakes.install();
  const { url, close } = await start(buildApp());
  try {
    const ok = await req(`${url}/api/auth/username/signup`, {
      method: "POST",
      body: { username: "abu_yusuf", pin: "1234", confirmPin: "1234" },
    });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.username, "abu_yusuf");
    assert.match(ok.body.id, /^u\d+$/);
    // Signup must surface a one-time recovery code so the user can save it.
    assert.equal(typeof ok.body.recoveryCode, "string");
    // Five dash-separated groups of four base32 chars (no 0/1/I/L/O).
    assert.match(ok.body.recoveryCode, /^[A-Z2-9]{4}(-[A-Z2-9]{4}){4}$/);

    const dup = await req(`${url}/api/auth/username/signup`, {
      method: "POST",
      body: { username: "ABU_YUSUF", pin: "5678", confirmPin: "5678" },
    });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.field, "username");
  } finally {
    await close();
    fakes.reset();
  }
});

test("POST /signup: invalid input returns 400 with field hint", async () => {
  const fakes = makeFakes();
  fakes.install();
  const { url, close } = await start(buildApp());
  try {
    const r = await req(`${url}/api/auth/username/signup`, {
      method: "POST",
      body: { username: "ok_user", pin: "abcd", confirmPin: "abcd" },
    });
    assert.equal(r.status, 400);
    assert.equal(r.body.field, "pin");
  } finally {
    await close();
    fakes.reset();
  }
});

test("POST /signin: locks the account after 5 wrong PINs (returns 423 with minutes)", async () => {
  const fakes = makeFakes();
  fakes.install();
  // Pre-create a login row directly so we don't depend on the signup route.
  const pinHash = await hashPin("1234");
  await (authStorage as any).createUsernameUser({
    username: "lockme",
    pinHash,
  });
  const { url, close } = await start(buildApp());
  try {
    // 5 wrong attempts: first 4 → 401, 5th → 423 with minutes.
    let lastStatus = 0;
    let lastBody: any = null;
    for (let i = 0; i < 5; i++) {
      const r = await req(`${url}/api/auth/username/signin`, {
        method: "POST",
        body: { username: "lockme", pin: "9999" },
      });
      lastStatus = r.status;
      lastBody = r.body;
    }
    assert.equal(lastStatus, 423, "5th wrong attempt should lock the account");
    assert.equal(typeof lastBody.minutes, "number");
    assert.ok(lastBody.minutes > 0 && lastBody.minutes <= 15);

    // Even the right PIN now returns 423 while the lock is active.
    const blocked = await req(`${url}/api/auth/username/signin`, {
      method: "POST",
      body: { username: "lockme", pin: "1234" },
    });
    assert.equal(blocked.status, 423);
  } finally {
    await close();
    fakes.reset();
  }
});

test("POST /signin: rejects malformed PIN before any DB lookup (400)", async () => {
  const fakes = makeFakes();
  fakes.install();
  const { url, close } = await start(buildApp());
  try {
    const r = await req(`${url}/api/auth/username/signin`, {
      method: "POST",
      body: { username: "anyuser", pin: "abcd" },
    });
    assert.equal(r.status, 400);
    assert.equal(r.body.field, "pin");
  } finally {
    await close();
    fakes.reset();
  }
});

test("POST /signin: lockout window expiry clears the counter (fresh 5-attempt budget)", async () => {
  const fakes = makeFakes();
  fakes.install();
  const pinHash = await hashPin("1234");
  await (authStorage as any).createUsernameUser({
    username: "expirer",
    pinHash,
  });
  // Simulate a previous lockout that has just elapsed: counter is at the
  // max (5) and the lock timestamp is in the past. Without the
  // post-window reset, a single wrong PIN would immediately re-lock.
  const login = (await (
    authStorage as any
  ).getUsernameLoginByUsername("expirer")) as FakeLogin;
  login.failedAttempts = 5;
  login.lockedUntil = new Date(Date.now() - 60_000);

  const { url, close } = await start(buildApp());
  try {
    const wrong = await req(`${url}/api/auth/username/signin`, {
      method: "POST",
      body: { username: "expirer", pin: "9999" },
    });
    // Wrong PIN must surface as a normal 401, not 423.
    assert.equal(wrong.status, 401);
    const after = (await (
      authStorage as any
    ).getUsernameLoginByUsername("expirer")) as FakeLogin;
    assert.equal(
      after.failedAttempts,
      1,
      "counter should reset to 0 then increment to 1 for this attempt",
    );
    assert.equal(after.lockedUntil, null);

    // The right PIN now signs in cleanly with no leftover lockout state.
    const ok = await req(`${url}/api/auth/username/signin`, {
      method: "POST",
      body: { username: "expirer", pin: "1234" },
    });
    assert.equal(ok.status, 200);
  } finally {
    await close();
    fakes.reset();
  }
});

test("POST /change-pin: unauthenticated returns 401", async () => {
  const fakes = makeFakes();
  fakes.install();
  const { url, close } = await start(buildApp());
  try {
    const r = await req(`${url}/api/auth/username/change-pin`, {
      method: "POST",
      body: { currentPin: "1234", newPin: "5678", confirmPin: "5678" },
    });
    assert.equal(r.status, 401);
  } finally {
    await close();
    fakes.reset();
  }
});

test("POST /signin then /change-pin: happy path rotates PIN and rejects wrong current", async () => {
  const fakes = makeFakes();
  fakes.install();
  const pinHash = await hashPin("1234");
  await (authStorage as any).createUsernameUser({
    username: "rotator",
    pinHash,
  });
  const { url, close } = await start(buildApp());
  try {
    const signin = await req(`${url}/api/auth/username/signin`, {
      method: "POST",
      body: { username: "rotator", pin: "1234" },
    });
    assert.equal(signin.status, 200);
    const cookie = getCookie(signin.headers);
    assert.ok(cookie, "signin should set a session cookie");

    // Wrong current PIN → 401, field=currentPin
    const wrong = await req(`${url}/api/auth/username/change-pin`, {
      method: "POST",
      headers: { cookie: cookie! },
      body: { currentPin: "9999", newPin: "5678", confirmPin: "5678" },
    });
    assert.equal(wrong.status, 401);
    assert.equal(wrong.body.field, "currentPin");

    // Right current PIN → 200, and the stored hash actually changes.
    // (Snapshot the string up-front because the in-memory fake stores the
    // login row by reference and mutates it in place.)
    const beforeHash = (
      (await (authStorage as any).getUsernameLoginByUsername(
        "rotator",
      )) as FakeLogin
    ).pinHash;
    const ok = await req(`${url}/api/auth/username/change-pin`, {
      method: "POST",
      headers: { cookie: cookie! },
      body: { currentPin: "1234", newPin: "5678", confirmPin: "5678" },
    });
    assert.equal(ok.status, 200);
    const afterHash = (
      (await (authStorage as any).getUsernameLoginByUsername(
        "rotator",
      )) as FakeLogin
    ).pinHash;
    assert.notEqual(afterHash, beforeHash);
  } finally {
    await close();
    fakes.reset();
  }
});

// ---- forgot-pin (recovery code) flow --------------------------------------

test("POST /signup → /forgot-pin: recovery code resets the PIN exactly once", async () => {
  const fakes = makeFakes();
  fakes.install();
  const { url, close } = await start(buildApp());
  try {
    const signup = await req(`${url}/api/auth/username/signup`, {
      method: "POST",
      body: { username: "forgetful", pin: "1234", confirmPin: "1234" },
    });
    assert.equal(signup.status, 201);
    const code = signup.body.recoveryCode as string;
    assert.equal(typeof code, "string");

    // Right code rotates the PIN. Old PIN must no longer work; new one does.
    const reset = await req(`${url}/api/auth/username/forgot-pin`, {
      method: "POST",
      body: {
        username: "forgetful",
        recoveryCode: code,
        newPin: "9999",
        confirmPin: "9999",
      },
    });
    assert.equal(reset.status, 200);

    const oldPin = await req(`${url}/api/auth/username/signin`, {
      method: "POST",
      body: { username: "forgetful", pin: "1234" },
    });
    assert.equal(oldPin.status, 401);
    const newPin = await req(`${url}/api/auth/username/signin`, {
      method: "POST",
      body: { username: "forgetful", pin: "9999" },
    });
    assert.equal(newPin.status, 200);

    // Code must be one-time: a second use returns 401 (not 200).
    const reuse = await req(`${url}/api/auth/username/forgot-pin`, {
      method: "POST",
      body: {
        username: "forgetful",
        recoveryCode: code,
        newPin: "5555",
        confirmPin: "5555",
      },
    });
    assert.equal(reuse.status, 401);
    assert.equal(reuse.body.field, "recoveryCode");
  } finally {
    await close();
    fakes.reset();
  }
});

test("POST /forgot-pin: tolerates dashes/whitespace/lowercase in the code", async () => {
  const fakes = makeFakes();
  fakes.install();
  const { url, close } = await start(buildApp());
  try {
    const signup = await req(`${url}/api/auth/username/signup`, {
      method: "POST",
      body: { username: "tolerant", pin: "1234", confirmPin: "1234" },
    });
    const code = signup.body.recoveryCode as string;
    // Re-format: drop dashes, lower-case, sprinkle whitespace.
    const messy = `  ${code.replace(/-/g, "").toLowerCase().match(/.{1,5}/g)!.join(" ")}  `;
    const reset = await req(`${url}/api/auth/username/forgot-pin`, {
      method: "POST",
      body: {
        username: "tolerant",
        recoveryCode: messy,
        newPin: "8888",
        confirmPin: "8888",
      },
    });
    assert.equal(reset.status, 200);
  } finally {
    await close();
    fakes.reset();
  }
});

test("POST /forgot-pin: locks recovery for 15min after 5 wrong codes (423 with minutes)", async () => {
  const fakes = makeFakes();
  fakes.install();
  // Create a user with a known recovery code by going through /signup.
  const { url, close } = await start(buildApp());
  try {
    await req(`${url}/api/auth/username/signup`, {
      method: "POST",
      body: { username: "bruteme", pin: "1234", confirmPin: "1234" },
    });
    let lastStatus = 0;
    let lastBody: any = null;
    for (let i = 0; i < 5; i++) {
      const r = await req(`${url}/api/auth/username/forgot-pin`, {
        method: "POST",
        // 20-char wrong code from the same alphabet.
        body: {
          username: "bruteme",
          recoveryCode: "AAAA-AAAA-AAAA-AAAA-AAAA",
          newPin: "9999",
          confirmPin: "9999",
        },
      });
      lastStatus = r.status;
      lastBody = r.body;
    }
    assert.equal(lastStatus, 423);
    assert.equal(typeof lastBody.minutes, "number");
    assert.ok(lastBody.minutes > 0 && lastBody.minutes <= 15);

    // Even the right code is now blocked while the recovery lockout holds.
    // (We don't know the real code here, but any submission must 423.)
    const blocked = await req(`${url}/api/auth/username/forgot-pin`, {
      method: "POST",
      body: {
        username: "bruteme",
        recoveryCode: "BBBB-BBBB-BBBB-BBBB-BBBB",
        newPin: "9999",
        confirmPin: "9999",
      },
    });
    assert.equal(blocked.status, 423);

    // The PIN-signin endpoint must be unaffected by the recovery lockout.
    const signin = await req(`${url}/api/auth/username/signin`, {
      method: "POST",
      body: { username: "bruteme", pin: "1234" },
    });
    assert.equal(signin.status, 200);
  } finally {
    await close();
    fakes.reset();
  }
});

test("POST /forgot-pin: malformed input is rejected up-front (400)", async () => {
  const fakes = makeFakes();
  fakes.install();
  const { url, close } = await start(buildApp());
  try {
    // Recovery code too short.
    const r = await req(`${url}/api/auth/username/forgot-pin`, {
      method: "POST",
      body: {
        username: "anyuser",
        recoveryCode: "ABCD",
        newPin: "1234",
        confirmPin: "1234",
      },
    });
    assert.equal(r.status, 400);
    // PIN mismatch.
    const r2 = await req(`${url}/api/auth/username/forgot-pin`, {
      method: "POST",
      body: {
        username: "anyuser",
        recoveryCode: "AAAA-AAAA-AAAA-AAAA-AAAA",
        newPin: "1234",
        confirmPin: "9999",
      },
    });
    assert.equal(r2.status, 400);
  } finally {
    await close();
    fakes.reset();
  }
});

test("POST /forgot-pin: PIN reset clears any active sign-in lockout", async () => {
  const fakes = makeFakes();
  fakes.install();
  const { url, close } = await start(buildApp());
  try {
    const signup = await req(`${url}/api/auth/username/signup`, {
      method: "POST",
      body: { username: "lockedout", pin: "1234", confirmPin: "1234" },
    });
    const code = signup.body.recoveryCode as string;

    // Lock the account by burning 5 wrong PINs.
    for (let i = 0; i < 5; i++) {
      await req(`${url}/api/auth/username/signin`, {
        method: "POST",
        body: { username: "lockedout", pin: "9999" },
      });
    }
    // Confirm it's locked.
    const locked = await req(`${url}/api/auth/username/signin`, {
      method: "POST",
      body: { username: "lockedout", pin: "1234" },
    });
    assert.equal(locked.status, 423);

    // Recovery succeeds AND clears the PIN-signin lockout.
    const reset = await req(`${url}/api/auth/username/forgot-pin`, {
      method: "POST",
      body: {
        username: "lockedout",
        recoveryCode: code,
        newPin: "7777",
        confirmPin: "7777",
      },
    });
    assert.equal(reset.status, 200);
    const signin = await req(`${url}/api/auth/username/signin`, {
      method: "POST",
      body: { username: "lockedout", pin: "7777" },
    });
    assert.equal(signin.status, 200);
  } finally {
    await close();
    fakes.reset();
  }
});

// ---- per-IP rate limit -----------------------------------------------------
// Placed last because the IP-attempt counter is module-level state shared
// across tests; once we exceed the budget, every subsequent signin from the
// same IP within the 10-minute window returns 429.

test("POST /signin: per-IP cap returns 429 after 20 attempts in the window", async () => {
  const fakes = makeFakes();
  fakes.install();
  const pinHash = await hashPin("1234");
  await (authStorage as any).createUsernameUser({
    username: "ipvictim",
    pinHash,
  });
  const { url, close } = await start(buildApp());
  try {
    // Burn the budget against non-existent users so we don't trip the
    // per-username lockout (which would intercept with 423). Each request
    // returns 401 (username not found) and ticks the IP counter once.
    for (let i = 0; i < 20; i++) {
      const r = await req(`${url}/api/auth/username/signin`, {
        method: "POST",
        body: { username: `noone${i}`, pin: "0000" },
      });
      assert.equal(r.status, 401, `attempt #${i + 1} should still be allowed`);
    }
    // 21st attempt: even with the right credentials, the IP cap fires
    // before any DB lookup so we get 429, not 200.
    const blocked = await req(`${url}/api/auth/username/signin`, {
      method: "POST",
      body: { username: "ipvictim", pin: "1234" },
    });
    assert.equal(blocked.status, 429);
    assert.match(String(blocked.body.message ?? ""), /too many/i);

    // /forgot-pin shares the same per-IP counter, so it's also blocked.
    const blockedForgot = await req(`${url}/api/auth/username/forgot-pin`, {
      method: "POST",
      body: {
        username: "ipvictim",
        recoveryCode: "AAAA-AAAA-AAAA-AAAA-AAAA",
        newPin: "5678",
        confirmPin: "5678",
      },
    });
    assert.equal(blockedForgot.status, 429);
  } finally {
    await close();
    fakes.reset();
  }
});
