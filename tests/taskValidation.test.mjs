import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidTaskId,
  validateTaskInput,
} from "../app/lib/taskValidation.js";

test("trims task fields and accepts the maximum description length", () => {
  const result = validateTaskInput({
    title: "  Review API responses  ",
    description: `  ${"a".repeat(1000)}  `,
    dueDate: "2026-03-15",
  });

  assert.equal(result.error, undefined);
  assert.equal(result.data.title, "Review API responses");
  assert.equal(result.data.description.length, 1000);
  assert.equal(result.data.dueDate.toISOString(), "2026-03-15T00:00:00.000Z");
});

test("rejects empty, whitespace-only, and overlong titles", () => {
  for (const title of ["", "   ", "a".repeat(101)]) {
    assert.ok(validateTaskInput({ title }).error);
  }

  assert.equal(validateTaskInput({ title: "a".repeat(100) }).error, undefined);
});

test("rejects descriptions longer than 1000 characters", () => {
  assert.ok(
    validateTaskInput({
      title: "Valid title",
      description: "a".repeat(1001),
    }).error,
  );
});

test("accepts only supported priorities and statuses", () => {
  for (const priority of ["LOW", "MEDIUM", "HIGH"]) {
    assert.equal(
      validateTaskInput({ title: "Valid title", priority }).error,
      undefined,
    );
  }
  for (const status of ["TODO", "IN_PROGRESS", "DONE"]) {
    assert.equal(
      validateTaskInput({ title: "Valid title", status }).error,
      undefined,
    );
  }

  assert.ok(
    validateTaskInput({ title: "Valid title", priority: "URGENT" }).error,
  );
  assert.ok(validateTaskInput({ title: "Valid title", status: "BLOCKED" }).error);
});

test("rejects malformed or impossible due dates", () => {
  for (const dueDate of ["2026-2-03", "2026-02-30", "not-a-date"]) {
    assert.ok(
      validateTaskInput({ title: "Valid title", dueDate }).error,
    );
  }

  assert.equal(
    validateTaskInput({ title: "Valid title", dueDate: null }).error,
    undefined,
  );
});

test("rejects malformed bodies, unknown fields, and empty patches", () => {
  assert.ok(validateTaskInput(null).error);
  assert.ok(validateTaskInput([]).error);
  assert.ok(validateTaskInput({ title: "Valid title", extra: true }).error);
  assert.ok(validateTaskInput({}, { partial: true }).error);
  assert.equal(
    validateTaskInput({ status: "DONE" }, { partial: true }).error,
    undefined,
  );
});

test("accepts CUID-format task IDs and rejects malformed IDs", () => {
  assert.equal(isValidTaskId(`c${"a".repeat(24)}`), true);
  assert.equal(isValidTaskId("not-a-cuid"), false);
  assert.equal(isValidTaskId(null), false);
});

test("accepts project assignments and explicit unassignment", () => {
  const projectId = `c${"a".repeat(24)}`;

  assert.equal(
    validateTaskInput({ title: "Assigned task", projectId }).data.projectId,
    projectId,
  );
  assert.equal(
    validateTaskInput({ projectId: null }, { partial: true }).data.projectId,
    null,
  );
  assert.ok(validateTaskInput({ title: "Task", projectId: "invalid" }).error);
});
