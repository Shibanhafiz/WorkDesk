import assert from "node:assert/strict";
import test from "node:test";
import { checkRateLimit } from "../app/lib/rateLimit.js";

test("rate limit allows requests up to the configured limit", () => {
  const key = `test-${Math.random()}`;
  const options = { limit: 2, windowMs: 1000, now: 10000 };
  assert.equal(checkRateLimit(key, options).allowed, true);
  assert.equal(checkRateLimit(key, options).allowed, true);
  const third = checkRateLimit(key, options);
  assert.equal(third.allowed, false);
  assert.ok(third.retryAfter >= 1);
});

test("rate limit window resets after expiry", () => {
  const key = `test-${Math.random()}`;
  const first = { limit: 1, windowMs: 1000, now: 20000 };
  checkRateLimit(key, first);
  assert.equal(checkRateLimit(key, { ...first, now: 20500 }).allowed, false);
  assert.equal(checkRateLimit(key, { ...first, now: 21500 }).allowed, true);
});
