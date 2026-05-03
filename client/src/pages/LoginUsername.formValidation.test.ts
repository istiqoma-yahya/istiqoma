// Run with: npx tsx --test client/src/pages/LoginUsername.formValidation.test.ts
//
// Frontend login-form validation contract. `LoginUsername.tsx` wires its
// react-hook-form forms to these Zod schemas via zodResolver, and renders
// `path`-keyed field errors in <FormMessage>. These tests pin that contract
// without pulling in a DOM/render harness (no jsdom dependency available).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  usernameSigninSchema,
  usernameSignupSchema,
} from "../../../shared/models/auth";

function fieldErrors(result: { success: false; error: { issues: { path: (string | number)[] }[] } }) {
  return result.error.issues.map((i) => i.path[0]);
}

test("signin form: empty submission produces field-level errors on username + pin", () => {
  const r = usernameSigninSchema.safeParse({ username: "", pin: "" });
  assert.equal(r.success, false);
  if (r.success) return;
  const fields = fieldErrors(r as any);
  assert.ok(fields.includes("username"), "username error present");
  assert.ok(fields.includes("pin"), "pin error present");
});

test("signin form: non-digit PIN is rejected at the schema (not just server)", () => {
  const r = usernameSigninSchema.safeParse({
    username: "abu_yusuf",
    pin: "12ab",
  });
  assert.equal(r.success, false);
  if (r.success) return;
  assert.equal(fieldErrors(r as any)[0], "pin");
});

test("signin form: well-formed input parses cleanly (this is what the mutation receives)", () => {
  const r = usernameSigninSchema.safeParse({
    username: "abu_yusuf",
    pin: "1234",
  });
  assert.equal(r.success, true);
});

test("signup form: mismatched confirmPin surfaces an error keyed to confirmPin", () => {
  const r = usernameSignupSchema.safeParse({
    username: "abu_yusuf",
    pin: "1234",
    confirmPin: "5678",
  });
  assert.equal(r.success, false);
  if (r.success) return;
  assert.ok(fieldErrors(r as any).includes("confirmPin"));
});

test("signup form: too-short PIN surfaces an error keyed to pin", () => {
  const r = usernameSignupSchema.safeParse({
    username: "abu_yusuf",
    pin: "12",
    confirmPin: "12",
  });
  assert.equal(r.success, false);
  if (r.success) return;
  assert.ok(fieldErrors(r as any).includes("pin"));
});

test("signup form: bad username charset is rejected with a username-keyed error", () => {
  const r = usernameSignupSchema.safeParse({
    username: "abu yusuf!",
    pin: "1234",
    confirmPin: "1234",
  });
  assert.equal(r.success, false);
  if (r.success) return;
  assert.ok(fieldErrors(r as any).includes("username"));
});

test("signup form: well-formed input parses (this is what the signup mutation receives)", () => {
  const r = usernameSignupSchema.safeParse({
    username: "abu_yusuf",
    pin: "1234",
    confirmPin: "1234",
  });
  assert.equal(r.success, true);
});
