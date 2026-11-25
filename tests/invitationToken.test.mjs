import assert from "node:assert/strict";
import test from "node:test";

import {
  generateInvitationToken,
  isInvitationExpired,
  getDefaultExpiryDate,
} from "../app/lib/invitationToken.js";

test("generates cryptographically secure random tokens", () => {
  const token1 = generateInvitationToken();
  const token2 = generateInvitationToken();

  // Each token should be 64 hex characters (32 bytes)
  assert.equal(token1.length, 64);
  assert.equal(token2.length, 64);

  // Tokens should match hex format
  assert.match(token1, /^[0-9a-f]{64}$/);
  assert.match(token2, /^[0-9a-f]{64}$/);

  // Tokens should be unique
  assert.notEqual(token1, token2);
});

test("token generation produces unique values across many calls", () => {
  const tokens = new Set();
  for (let i = 0; i < 100; i++) {
    tokens.add(generateInvitationToken());
  }
  assert.equal(tokens.size, 100);
});

test("detects expired invitations", () => {
  const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
  const futureDate = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now
  const nullDate = null;

  assert.equal(isInvitationExpired(pastDate), true);
  assert.equal(isInvitationExpired(futureDate), false);
  assert.equal(isInvitationExpired(nullDate), true);
});

test("default expiry is 7 days from now", () => {
  const expiry = getDefaultExpiryDate();
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // Should be approximately 7 days (allow small tolerance)
  assert.ok(diffDays > 6.9 && diffDays < 7.1, `Expected ~7 days, got ${diffDays}`);
});