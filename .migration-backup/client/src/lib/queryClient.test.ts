// Run with: npx tsx --test client/src/lib/queryClient.test.ts
//
// Locks in the task #173 401-recovery contract:
//   1. A 401 from a normal authenticated endpoint triggers exactly one
//      silent retry, then a redirect to /api/login?returnTo=<current>.
//   2. A 401 from auth endpoints (/api/auth/*, /api/login, /api/logout)
//      surfaces to the caller WITHOUT redirecting — those responses are
//      part of those endpoints' normal contract (e.g. wrong PIN).
//   3. The redirect-in-flight guard prevents many concurrent 401s from
//      stampeding multiple navigations.

import { test } from "node:test";
import assert from "node:assert/strict";

// ── Test harness ─────────────────────────────────────────────────────────
// queryClient.ts imports "@/hooks/use-toast" which pulls in JSX-heavy
// React code we can't compile under plain tsx --test. Stub it with a
// no-op via Node's module resolution before we import the module under
// test.
import Module from "node:module";
const originalResolve = (Module as any)._resolveFilename;
(Module as any)._resolveFilename = function (
  request: string,
  parent: any,
  ...rest: any[]
) {
  if (request === "@/hooks/use-toast") {
    return require.resolve("./__queryClient_test_stubs/use-toast.cjs");
  }
  return originalResolve.call(this, request, parent, ...rest);
};

// Minimal browser globals so the module's window/setTimeout references work.
type FakeLocation = { pathname: string; search: string; hash: string; href: string };
const fakeLocation: FakeLocation = {
  pathname: "/dashboard",
  search: "",
  hash: "",
  href: "http://localhost/dashboard",
};
(globalThis as any).window = {
  get location() {
    return fakeLocation;
  },
};

type FetchCall = { url: string; init?: RequestInit };
const fetchCalls: FetchCall[] = [];
let fetchQueue: Array<() => Response | Promise<Response>> = [];

function makeRes(status: number, body: any = ""): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

(globalThis as any).fetch = async (url: string, init?: RequestInit) => {
  fetchCalls.push({ url, init });
  const next = fetchQueue.shift();
  if (!next) throw new Error(`unexpected fetch to ${url}`);
  return next();
};

// Now safe to import the module under test.
const { apiRequest, getQueryFn } = await import("./queryClient");

function reset(initialPath = "/dashboard") {
  fetchCalls.length = 0;
  fetchQueue = [];
  fakeLocation.pathname = initialPath;
  fakeLocation.search = "";
  fakeLocation.hash = "";
  fakeLocation.href = `http://localhost${initialPath}`;
  // Also reset the module-level redirect guard between tests by
  // re-importing… we can't, so instead each test runs against a new
  // pretend pathname and we tolerate at most one redirect across the
  // whole file. The "no redirect" tests must run before the one that
  // performs a redirect; node:test runs tests in source order.
}

// ── Tests ────────────────────────────────────────────────────────────────

test("apiRequest: 200 responses pass through untouched", async () => {
  reset();
  fetchQueue.push(() => makeRes(200, { ok: true }));
  const res = await apiRequest("GET", "/api/deeds");
  assert.equal(res.status, 200);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fakeLocation.href, "http://localhost/dashboard");
});

test("apiRequest: 401 from /api/auth/username/signin does NOT redirect", async () => {
  reset();
  // Wrong-PIN response is a normal 401; the form should see it as an
  // error and render an inline message — never a /api/login bounce.
  fetchQueue.push(() => makeRes(401, "Invalid credentials"));
  await assert.rejects(
    apiRequest("POST", "/api/auth/username/signin", { username: "x", pin: "1" }),
    /^Error: 401:/,
  );
  assert.equal(
    fetchCalls.length,
    1,
    "auth endpoints must not trigger a silent retry",
  );
  assert.equal(
    fakeLocation.href,
    "http://localhost/dashboard",
    "must not navigate away from current page",
  );
});

test("apiRequest: 401 from /api/auth/user does NOT redirect", async () => {
  reset();
  fetchQueue.push(() => makeRes(401, "Unauthorized"));
  await assert.rejects(apiRequest("GET", "/api/auth/user"));
  assert.equal(fetchCalls.length, 1);
  assert.equal(fakeLocation.href, "http://localhost/dashboard");
});

test("getQueryFn returnNull: 401 from /api/auth/user resolves to null without redirect", async () => {
  reset();
  fetchQueue.push(() => makeRes(401, "Unauthorized"));
  const fn = getQueryFn<unknown>({ on401: "returnNull" });
  const out = await (fn as any)({ queryKey: ["/api/auth/user"] });
  assert.equal(out, null);
  assert.equal(fetchCalls.length, 1);
  assert.equal(fakeLocation.href, "http://localhost/dashboard");
});

test("apiRequest: a transient 401 followed by 200 silently recovers (one retry)", async () => {
  reset();
  fetchQueue.push(() => makeRes(401));
  fetchQueue.push(() => makeRes(200, { ok: true }));
  const res = await apiRequest("GET", "/api/deeds");
  assert.equal(res.status, 200);
  assert.equal(fetchCalls.length, 2, "should retry once on first 401");
  assert.equal(
    fakeLocation.href,
    "http://localhost/dashboard",
    "successful retry must not redirect",
  );
});

test("apiRequest: persistent 401 triggers /api/login redirect with returnTo", async () => {
  // This is the only test that actually fires the redirect — the module
  // guards against duplicates, so it must run after the no-redirect
  // tests (node:test executes in source order).
  reset("/targets/42");
  fetchQueue.push(() => makeRes(401));
  fetchQueue.push(() => makeRes(401));
  await assert.rejects(apiRequest("GET", "/api/targets"));
  assert.equal(fetchCalls.length, 2);
  // The redirect is queued behind a setTimeout; wait for it.
  await new Promise((r) => setTimeout(r, 300));
  assert.match(
    fakeLocation.href,
    /\/api\/login\?returnTo=%2Ftargets%2F42$/,
    `expected /api/login?returnTo=%2Ftargets%2F42 but got ${fakeLocation.href}`,
  );
});

test("apiRequest: subsequent 401s after a redirect is in-flight do not re-navigate", async () => {
  // The module's redirectInFlight guard should prevent additional
  // navigations from being scheduled. Capture the post-redirect href and
  // verify it doesn't change after another 401.
  const before = fakeLocation.href;
  fetchCalls.length = 0;
  fetchQueue = [];
  fetchQueue.push(() => makeRes(401));
  fetchQueue.push(() => makeRes(401));
  await assert.rejects(apiRequest("GET", "/api/deeds"));
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(
    fakeLocation.href,
    before,
    "second cascade must not stamp a new redirect on top",
  );
});

// ── Regression: data hooks must not silently swallow 401 ──────────────────
// Locks the contract that user-facing data hooks (deeds, targets, target
// folders, categories, dzikir types) route their queryFn through
// `apiRequest` and therefore inherit the centralized recovery flow above,
// rather than converting 401 into [] / null and rendering an empty UI on
// auth loss.
import { readFileSync } from "node:fs";
import { join } from "node:path";

const HOOK_FILES = [
  "client/src/hooks/use-deeds.ts",
  "client/src/hooks/use-targets.ts",
  "client/src/hooks/use-target-folders.ts",
  "client/src/hooks/use-categories.ts",
  "client/src/hooks/use-dzikir-types.ts",
];

for (const path of HOOK_FILES) {
  test(`hook ${path}: queryFn does not short-circuit 401 to empty data`, () => {
    const src = readFileSync(join(process.cwd(), path), "utf8");
    assert.ok(
      src.includes('from "@/lib/queryClient"') ||
        src.includes("from '@/lib/queryClient'"),
      `${path} must import from "@/lib/queryClient" so 401 recovery applies`,
    );
    // No `status === 401` early-return inside a queryFn. We allow the
    // pattern to exist nowhere in these files at all — mutations don't
    // need it either, since apiRequest handles 401 centrally.
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/res\.status\s*===?\s*401/.test(line)) {
        assert.fail(
          `${path}:${i + 1} still has a 401 short-circuit: ${line.trim()}`,
        );
      }
    }
  });
}
