import assert from "node:assert/strict";
import test from "node:test";
import { checkRateLimit, envRateLimit, getClientKey } from "../app/lib/rateLimit.js";

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

test("forwarded headers are ignored unless a trusted proxy is configured", () => {
  const request = {
    headers: {
      get: (name) =>
        name === "x-forwarded-for" ? "203.0.113.5, 10.0.0.1" : null,
    },
  };
  const original = process.env.TRUST_PROXY_HEADERS;
  try {
    delete process.env.TRUST_PROXY_HEADERS;
    assert.equal(getClientKey(request), "unknown");
    process.env.TRUST_PROXY_HEADERS = "true";
    assert.equal(getClientKey(request), "203.0.113.5");
    process.env.TRUST_PROXY_HEADERS = "true";
    const invalid = {
      headers: { get: (name) => (name === "x-forwarded-for" ? "not an ip" : null) },
    };
    assert.equal(getClientKey(invalid), "unknown");
  } finally {
    if (original === undefined) delete process.env.TRUST_PROXY_HEADERS;
    else process.env.TRUST_PROXY_HEADERS = original;
  }
});

test("rate limits can be overridden with positive environment integers", () => {
  const original = process.env.RATE_LIMIT_TEST_KEY;
  try {
    delete process.env.RATE_LIMIT_TEST_KEY;
    assert.equal(envRateLimit("RATE_LIMIT_TEST_KEY", 7), 7);
    process.env.RATE_LIMIT_TEST_KEY = "0";
    assert.equal(envRateLimit("RATE_LIMIT_TEST_KEY", 7), 7);
    process.env.RATE_LIMIT_TEST_KEY = "-4";
    assert.equal(envRateLimit("RATE_LIMIT_TEST_KEY", 7), 7);
    process.env.RATE_LIMIT_TEST_KEY = "not-a-number";
    assert.equal(envRateLimit("RATE_LIMIT_TEST_KEY", 7), 7);
    process.env.RATE_LIMIT_TEST_KEY = "25";
    assert.equal(envRateLimit("RATE_LIMIT_TEST_KEY", 7), 25);
  } finally {
    if (original === undefined) delete process.env.RATE_LIMIT_TEST_KEY;
    else process.env.RATE_LIMIT_TEST_KEY = original;
  }
});
