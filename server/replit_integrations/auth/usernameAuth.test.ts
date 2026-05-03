// Run with: npx tsx --test server/replit_integrations/auth/usernameAuth.test.ts
//
// Unit tests for the username + PIN sign-in primitives:
//   - pinHash.ts: scrypt-based hash/verify must round-trip and reject bad PINs
//   - shared/models/auth schemas: input validation rules

process.env.SESSION_SECRET ??= "test-secret-not-used-anywhere-real";
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.REPL_ID ??= "test-repl-id";

import { test } from "node:test";
import assert from "node:assert/strict";

import { hashPin, verifyPin } from "./pinHash";
import {
  usernameSignupSchema,
  usernameSigninSchema,
  changePinSchema,
} from "@shared/models/auth";

// ---- pinHash ---------------------------------------------------------------

test("hashPin produces a salted scrypt string and verifyPin round-trips", async () => {
  const pin = "1234";
  const hash = await hashPin(pin);
  assert.match(
    hash,
    /^scrypt\$[0-9a-f]+\$[0-9a-f]+$/,
    "hash should use scrypt$<salt>$<derived> format",
  );
  assert.equal(await verifyPin(pin, hash), true);
});

test("hashPin produces a different hash on each call (random salt)", async () => {
  const a = await hashPin("9999");
  const b = await hashPin("9999");
  assert.notEqual(a, b, "salts must randomize the hash output");
  assert.equal(await verifyPin("9999", a), true);
  assert.equal(await verifyPin("9999", b), true);
});

test("verifyPin rejects wrong PINs and malformed hashes", async () => {
  const hash = await hashPin("12345");
  assert.equal(await verifyPin("54321", hash), false);
  assert.equal(await verifyPin("", hash), false);
  // Malformed hashes must never throw and must never return true.
  assert.equal(await verifyPin("12345", "not-a-hash"), false);
  assert.equal(await verifyPin("12345", "scrypt$xx"), false);
  assert.equal(await verifyPin("12345", ""), false);
});

test("verifyPin uses constant-time comparison (length mismatch is false, not error)", async () => {
  const hash = await hashPin("1111");
  // Tamper with the derived-key portion (still hex but wrong length/content).
  const [scheme, salt] = hash.split("$");
  const tampered = `${scheme}$${salt}$deadbeef`;
  assert.equal(await verifyPin("1111", tampered), false);
});

// ---- signup schema ---------------------------------------------------------

test("usernameSignupSchema accepts a valid username + 4-8 digit PIN with matching confirm", () => {
  const r = usernameSignupSchema.safeParse({
    username: "abu_yusuf-01",
    pin: "12345",
    confirmPin: "12345",
  });
  assert.equal(r.success, true);
});

test("usernameSignupSchema rejects mismatched confirmPin", () => {
  const r = usernameSignupSchema.safeParse({
    username: "valid_user",
    pin: "1234",
    confirmPin: "9999",
  });
  assert.equal(r.success, false);
});

test("usernameSignupSchema rejects PINs that are too short, too long, or non-digit", () => {
  for (const pin of ["123", "123456789", "12a4", "abcd", " 1234"]) {
    const r = usernameSignupSchema.safeParse({
      username: "valid_user",
      pin,
      confirmPin: pin,
    });
    assert.equal(r.success, false, `pin ${JSON.stringify(pin)} should fail`);
  }
});

test("usernameSignupSchema rejects bad usernames (length, charset)", () => {
  for (const username of [
    "ab", // too short
    "a".repeat(41), // too long
    "has space",
    "has.dot",
    "has@symbol",
    "",
  ]) {
    const r = usernameSignupSchema.safeParse({
      username,
      pin: "1234",
      confirmPin: "1234",
    });
    assert.equal(
      r.success,
      false,
      `username ${JSON.stringify(username)} should fail`,
    );
  }
});

// ---- signin & change-pin schemas ------------------------------------------

test("usernameSigninSchema requires both username and a digit-only PIN", () => {
  assert.equal(
    usernameSigninSchema.safeParse({ username: "ok_user", pin: "1234" })
      .success,
    true,
  );
  assert.equal(
    usernameSigninSchema.safeParse({ username: "ok_user", pin: "" }).success,
    false,
  );
  assert.equal(
    usernameSigninSchema.safeParse({ username: "", pin: "1234" }).success,
    false,
  );
});

test("changePinSchema requires currentPin + newPin + matching confirmPin", () => {
  assert.equal(
    changePinSchema.safeParse({
      currentPin: "1234",
      newPin: "5678",
      confirmPin: "5678",
    }).success,
    true,
  );
  // Mismatched confirmation
  const mismatch = changePinSchema.safeParse({
    currentPin: "1234",
    newPin: "5678",
    confirmPin: "5679",
  });
  assert.equal(mismatch.success, false);
  // New PIN fails digit/length rules
  const bad = changePinSchema.safeParse({
    currentPin: "1234",
    newPin: "abcd",
    confirmPin: "abcd",
  });
  assert.equal(bad.success, false);
});
