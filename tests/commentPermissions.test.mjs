import assert from "node:assert/strict";
import test from "node:test";

import {
  canEditComment,
  canDeleteComment,
  extractMentions,
} from "../app/lib/commentPermissions.js";

test("canEditComment: only the author can edit", () => {
  const comment = { id: "c-1", authorId: "user-a", content: "hi" };
  assert.strictEqual(canEditComment(comment, "user-a"), true);
  assert.strictEqual(canEditComment(comment, "user-b"), false);
  assert.strictEqual(canEditComment(null, "user-a"), false);
  assert.strictEqual(canEditComment(comment, null), false);
  assert.strictEqual(canEditComment(undefined, "user-a"), false);
});

test("canDeleteComment: author or workspace ADMIN", () => {
  const comment = { id: "c-1", authorId: "user-a" };
  assert.strictEqual(canDeleteComment(comment, "user-a", "MEMBER"), true);
  assert.strictEqual(canDeleteComment(comment, "user-a", "MANAGER"), true);
  assert.strictEqual(canDeleteComment(comment, "user-b", "ADMIN"), true);
  assert.strictEqual(canDeleteComment(comment, "user-b", "MANAGER"), false);
  assert.strictEqual(canDeleteComment(comment, "user-b", "MEMBER"), false);
  assert.strictEqual(canDeleteComment(null, "user-a", "ADMIN"), false);
  assert.strictEqual(canDeleteComment(comment, null, "ADMIN"), false);
});

test("extractMentions: finds unique @mentions, case-insensitive", () => {
  assert.deepStrictEqual(extractMentions("Hello @alice and @Bob"), [
    "alice",
    "bob",
  ]);
  assert.deepStrictEqual(extractMentions("@alice @alice @alice"), ["alice"]);
  assert.deepStrictEqual(extractMentions("no mentions here"), []);
  assert.deepStrictEqual(extractMentions(""), []);
  assert.deepStrictEqual(extractMentions("@a1_b2 @A1_B2"), ["a1_b2"]);
  assert.deepStrictEqual(extractMentions(null), []);
  assert.deepStrictEqual(extractMentions(123), []);
});

test("extractMentions: only word characters after @", () => {
  assert.deepStrictEqual(extractMentions("email@host.com"), []);
  assert.deepStrictEqual(extractMentions("@alice!"), ["alice"]);
});
