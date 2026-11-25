import assert from "node:assert/strict";
import test from "node:test";

import {
  hashPassword,
  verifyPassword,
  validateCredentialsInput,
  validateRegistrationInput,
  validateRememberFlag,
} from "../app/lib/password.js";
import { createSessionToken, SESSION_COOKIE } from "../app/lib/sessionToken.js";

test("hashPassword and verifyPassword round-trip", async () => {
  const hash = await hashPassword("Testpass123!");
  assert.ok(hash.startsWith("scrypt:"));
  assert.strictEqual(await verifyPassword("Testpass123!", hash), true);
  assert.strictEqual(await verifyPassword("wrong-password", hash), false);
});

test("hashPassword uses a random salt", async () => {
  const first = await hashPassword("Testpass123!");
  const second = await hashPassword("Testpass123!");
  assert.notStrictEqual(first, second);
});

test("verifyPassword rejects malformed hashes safely", async () => {
  assert.strictEqual(await verifyPassword("x", "not-a-hash"), false);
  assert.strictEqual(await verifyPassword("x", "scrypt:zz:zz"), false);
  assert.strictEqual(await verifyPassword(null, "scrypt:aa:bb"), false);
});

test("validateCredentialsInput validates email and password", () => {
  const valid = validateCredentialsInput({
    email: "  User@Example.com ",
    password: "Testpass123!",
  });
  assert.strictEqual(valid.error, undefined);
  assert.strictEqual(valid.data.email, "user@example.com");

  assert.ok(validateCredentialsInput({ email: "bad", password: "Testpass123!" }).error);
  assert.ok(validateCredentialsInput({ email: "a@b.com", password: "short" }).error);
});

test("validateRegistrationInput requires a name", () => {
  const valid = validateRegistrationInput({
    name: "  Smoke User  ",
    email: "user@example.com",
    password: "Testpass123!",
  });
  assert.strictEqual(valid.error, undefined);
  assert.strictEqual(valid.data.name, "Smoke User");
  assert.ok(
    validateRegistrationInput({ name: "x", email: "a@b.com", password: "Testpass123!" }).error,
  );
});

test("createSessionToken is opaque and unique", () => {
  const token = createSessionToken();
  assert.strictEqual(token.length, 64);
  assert.notStrictEqual(token, createSessionToken());
  assert.strictEqual(SESSION_COOKIE, "workdesk_session");
});

test("validateRememberFlag defaults to a short session", () => {
  assert.deepEqual(validateRememberFlag(undefined), { data: false });
  assert.deepEqual(validateRememberFlag(true), { data: true });
  assert.deepEqual(validateRememberFlag(false), { data: false });
  assert.ok(validateRememberFlag("yes").error);
});

