import assert from "node:assert/strict";
import test from "node:test";

import {
  validateUploadedFile,
  buildStoragePath,
  isAllowedMimeType,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "../app/lib/fileValidation.js";

function pngFile(overrides = {}) {
  return {
    name: "screenshot.png",
    type: "image/png",
    size: 1024,
    ...overrides,
  };
}

test("validateUploadedFile: accepts allowed image and document types", () => {
  for (const type of ALLOWED_MIME_TYPES) {
    const result = validateUploadedFile(pngFile({ type }));
    assert.strictEqual(result.error, undefined, type);
    assert.strictEqual(result.data.mimeType, type);
  }
});

test("validateUploadedFile: rejects unknown file types", () => {
  for (const type of ["application/x-msdownload", "text/html", "image/svg+xml", "application/octet-stream"]) {
    assert.ok(validateUploadedFile(pngFile({ type })).error, type);
  }
});

test("validateUploadedFile: rejects oversized files", () => {
  assert.ok(validateUploadedFile(pngFile({ size: MAX_FILE_SIZE + 1 })).error);
  assert.strictEqual(
    validateUploadedFile(pngFile({ size: MAX_FILE_SIZE })).error,
    undefined,
  );
});

test("validateUploadedFile: rejects empty, invalid and bad names", () => {
  assert.ok(validateUploadedFile(null).error);
  assert.ok(validateUploadedFile(pngFile({ size: 0 })).error);
  assert.ok(validateUploadedFile(pngFile({ size: -1 })).error);
  assert.ok(validateUploadedFile(pngFile({ name: "" })).error);
  assert.ok(validateUploadedFile(pngFile({ name: "a".repeat(256) })).error);
});

test("validateUploadedFile: strips path components from file name", () => {
  const result = validateUploadedFile(
    pngFile({ name: "../../etc/passwd.png" }),
  );
  assert.strictEqual(result.error, undefined);
  assert.strictEqual(result.data.fileName, "passwd.png");
});

test("buildStoragePath: opaque random path with safe extension", () => {
  const first = buildStoragePath("image/png");
  const second = buildStoragePath("image/png");
  assert.notStrictEqual(first, second);
  assert.ok(first.endsWith(".png"));
  assert.strictEqual(first.includes("/"), false);
  assert.strictEqual(first.includes(".."), false);
  assert.ok(buildStoragePath("application/pdf").endsWith(".pdf"));
  assert.ok(buildStoragePath("unknown/type").endsWith(".bin"));
  assert.strictEqual(isAllowedMimeType("image/png"), true);
  assert.strictEqual(isAllowedMimeType("text/html"), false);
});
