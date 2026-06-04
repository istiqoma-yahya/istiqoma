// Run with: npx tsx --test server/replit_integrations/auth/csrfProtection.test.ts
//
// Verifies that csrfOriginCheck() allows same-origin requests and rejects
// cross-site requests based on Origin and Referer headers.

import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import http from "node:http";
import { AddressInfo } from "node:net";

import { csrfOriginCheck } from "./csrfProtection";

async function start(app: express.Express) {
  const server = http.createServer(app);
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    port,
    close: () => new Promise<void>((r) => server.close(() => r())),
  };
}

function buildApp() {
  const app = express();
  app.post("/protected", csrfOriginCheck(), (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

test("allows request with no Origin or Referer (non-browser API client)", async () => {
  const { url, close } = await start(buildApp());
  try {
    const res = await fetch(`${url}/protected`, { method: "POST" });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
  } finally {
    await close();
  }
});

test("allows request with matching Origin (same-origin browser request)", async () => {
  const { url, port, close } = await start(buildApp());
  try {
    const res = await fetch(`${url}/protected`, {
      method: "POST",
      headers: { Origin: `http://127.0.0.1:${port}` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
  } finally {
    await close();
  }
});

test("rejects request with cross-site Origin", async () => {
  const { url, close } = await start(buildApp());
  try {
    const res = await fetch(`${url}/protected`, {
      method: "POST",
      headers: { Origin: "https://attacker.example.com" },
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.ok(body.message?.includes("cross-site"), `unexpected message: ${body.message}`);
  } finally {
    await close();
  }
});

test("rejects request where Origin scheme differs (http vs https)", async () => {
  const { url, port, close } = await start(buildApp());
  try {
    const res = await fetch(`${url}/protected`, {
      method: "POST",
      headers: { Origin: `https://127.0.0.1:${port}` },
    });
    assert.equal(res.status, 403);
  } finally {
    await close();
  }
});

test("allows request with matching Referer when Origin absent", async () => {
  const { url, port, close } = await start(buildApp());
  try {
    const res = await fetch(`${url}/protected`, {
      method: "POST",
      headers: { Referer: `http://127.0.0.1:${port}/login` },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
  } finally {
    await close();
  }
});

test("rejects request with cross-site Referer when Origin absent", async () => {
  const { url, close } = await start(buildApp());
  try {
    const res = await fetch(`${url}/protected`, {
      method: "POST",
      headers: { Referer: "https://evil.example.com/page" },
    });
    assert.equal(res.status, 403);
  } finally {
    await close();
  }
});

test("rejects request with malformed Origin header", async () => {
  const { url, close } = await start(buildApp());
  try {
    const res = await fetch(`${url}/protected`, {
      method: "POST",
      headers: { Origin: "not-a-valid-url" },
    });
    assert.equal(res.status, 403);
  } finally {
    await close();
  }
});
