import assert from "node:assert/strict";
import test from "node:test";

import {
  createPasswordResetToken,
  hashPasswordResetToken,
  validatePasswordResetRequest,
  validatePasswordResetConfirm,
} from "../app/lib/passwordReset.js";

test("password reset tokens are opaque and hashed before storage", () => {
  const token = createPasswordResetToken();
  assert.match(token, /^[a-f0-9]{64}$/);
  const hash = hashPasswordResetToken(token);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.notStrictEqual(hash, token);
  assert.strictEqual(hash, hashPasswordResetToken(token));
  assert.notStrictEqual(hash, hashPasswordResetToken(createPasswordResetToken()));
});

test("password reset request requires a valid email", () => {
  assert.deepEqual(validatePasswordResetRequest({ email: " User@Example.com " }).data, {
    email: "user@example.com",
  });
  assert.ok(validatePasswordResetRequest({ email: "not-an-email" }).error);
  assert.ok(validatePasswordResetRequest(null).error);
});

test("password reset confirmation requires a valid token and password", () => {
  const token = createPasswordResetToken();
  const valid = validatePasswordResetConfirm({ token, password: "Newpass123!" });
  assert.strictEqual(valid.error, undefined);
  assert.strictEqual(valid.data.token, token);

  assert.ok(validatePasswordResetConfirm({ token: "short", password: "Newpass123!" }).error);
  assert.ok(validatePasswordResetConfirm({ token, password: "short" }).error);
  assert.ok(validatePasswordResetConfirm({ token, password: "x".repeat(201) }).error);
});
