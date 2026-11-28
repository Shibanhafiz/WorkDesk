import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeHttpUrl,
  validateTaskLinkInput,
  validateTaskLinks,
} from "../app/lib/taskLinkValidation.js";

test("accepts http and https URLs and trims whitespace", () => {
  assert.equal(
    normalizeHttpUrl("  https://github.com/team/repo  "),
    "https://github.com/team/repo",
  );
  assert.equal(
    normalizeHttpUrl("http://example.com/doc.pdf"),
    "http://example.com/doc.pdf",
  );
});

test("rejects non-http schemes, garbage, and overlong URLs", () => {
  assert.equal(normalizeHttpUrl("javascript:alert(1)"), null);
  assert.equal(normalizeHttpUrl("ftp://example.com/file"), null);
  assert.equal(normalizeHttpUrl("not a url"), null);
  assert.equal(normalizeHttpUrl(""), null);
  assert.equal(normalizeHttpUrl(null), null);
  assert.equal(normalizeHttpUrl(`https://example.com/${"a".repeat(2048)}`), null);
});

test("validateTaskLinkInput returns url and optional title", () => {
  const withTitle = validateTaskLinkInput({
    url: "https://github.com/team/repo",
    title: "  Repository  ",
  });
  assert.equal(withTitle.error, undefined);
  assert.equal(withTitle.data.url, "https://github.com/team/repo");
  assert.equal(withTitle.data.title, "Repository");

  const withoutTitle = validateTaskLinkInput({ url: "https://example.com" });
  assert.equal(withoutTitle.error, undefined);
  assert.equal(withoutTitle.data.title, null);
});

test("validateTaskLinkInput rejects bad bodies, URLs, and long titles", () => {
  assert.ok(validateTaskLinkInput(null).error);
  assert.ok(validateTaskLinkInput("https://example.com").error);
  assert.ok(validateTaskLinkInput({ url: "javascript:alert(1)" }).error);
  assert.ok(validateTaskLinkInput({}).error);
  assert.ok(
    validateTaskLinkInput({
      url: "https://example.com",
      title: "a".repeat(121),
    }).error,
  );
});

test("validateTaskLinks accepts arrays and validates every entry", () => {
  const valid = validateTaskLinks([
    "https://github.com/team/repo",
    " http://example.com/doc ",
  ]);
  assert.equal(valid.error, undefined);
  assert.deepEqual(valid.data, [
    "https://github.com/team/repo",
    "http://example.com/doc",
  ]);

  assert.equal(validateTaskLinks([]).error, undefined);
  assert.ok(validateTaskLinks("https://example.com").error);
  assert.ok(validateTaskLinks([123]).error);
  assert.ok(validateTaskLinks(["https://ok.example", "nope"]).error);
  assert.ok(
    validateTaskLinks(Array.from({ length: 11 }, (_, i) => `https://e.com/${i}`))
      .error,
  );
});
