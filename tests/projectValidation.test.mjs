import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidProjectId,
  validateProjectDateRange,
  validateProjectInput,
} from "../app/lib/projectValidation.js";

test("validates and normalizes project fields", () => {
  const result = validateProjectInput({
    name: "  Brand refresh ",
    description: "  Prepare the new identity. ",
    status: "ACTIVE",
    startDate: "2026-03-10",
    dueDate: "2026-03-20",
  });

  assert.equal(result.error, undefined);
  assert.equal(result.data.name, "Brand refresh");
  assert.equal(result.data.description, "Prepare the new identity.");
  assert.equal(result.data.status, "ACTIVE");
  assert.equal(result.data.startDate.toISOString(), "2026-03-10T00:00:00.000Z");
  assert.equal(result.data.dueDate.toISOString(), "2026-03-20T00:00:00.000Z");
});

test("rejects invalid names, fields, status, dates, and date ranges", () => {
  for (const input of [
    { name: "  " },
    { name: "x".repeat(101) },
    { name: "A", extra: true },
    { name: "A", status: "BLOCKED" },
    { name: "A", dueDate: "2026-02-30" },
    { name: "A", startDate: "2026-03-21", dueDate: "2026-03-20" },
  ]) {
    assert.ok(validateProjectInput(input).error, JSON.stringify(input));
  }
});

test("supports partial updates and validates date ordering", () => {
  assert.equal(
    validateProjectInput({ status: "ARCHIVED" }, { partial: true }).error,
    undefined,
  );
  assert.ok(validateProjectInput({}, { partial: true }).error);
  assert.ok(
    validateProjectDateRange(
      new Date("2026-03-21T00:00:00.000Z"),
      new Date("2026-03-20T00:00:00.000Z"),
    ).error,
  );
  assert.equal(validateProjectDateRange(null, null).error, undefined);
});

test("accepts only CUID-format project IDs", () => {
  assert.equal(isValidProjectId(`c${"a".repeat(24)}`), true);
  assert.equal(isValidProjectId("invalid"), false);
  assert.equal(isValidProjectId(null), false);
});
