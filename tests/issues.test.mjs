import assert from "node:assert/strict";
import test from "node:test";

import {
  validateIssueInput,
  ISSUE_SEVERITIES,
  ISSUE_RESOLUTIONS,
} from "../app/lib/issueValidation.js";
import {
  canRecordIssue,
  canUpdateIssue,
} from "../app/lib/issuePermissions.js";

test("validateIssueInput: valid issue defaults to MEDIUM and OPEN", () => {
  const result = validateIssueInput({ description: "  Broken layout  " });
  assert.strictEqual(result.error, undefined);
  assert.strictEqual(result.data.description, "Broken layout");
  assert.strictEqual(result.data.severity, undefined);
});

test("validateIssueInput: accepts all severities and resolutions", () => {
  for (const severity of ISSUE_SEVERITIES) {
    assert.strictEqual(
      validateIssueInput({ description: "Issue", severity }).error,
      undefined,
    );
  }
  for (const resolution of ISSUE_RESOLUTIONS) {
    assert.strictEqual(
      validateIssueInput({ resolution }, { partial: true }).error,
      undefined,
    );
  }
});

test("validateIssueInput: rejects bad fields", () => {
  assert.ok(validateIssueInput(null).error);
  assert.ok(validateIssueInput({}).error);
  assert.ok(validateIssueInput({ description: "   " }).error);
  assert.ok(validateIssueInput({ description: "x".repeat(2001) }).error);
  assert.ok(validateIssueInput({ description: "x", severity: "BOGUS" }).error);
  assert.ok(validateIssueInput({ description: "x", resolution: "BOGUS" }).error);
  assert.ok(validateIssueInput({ description: "x", actorId: "fake" }).error);
});

test("canRecordIssue: managers always, members only on assigned tasks", () => {
  assert.strictEqual(canRecordIssue("ADMIN", false), true);
  assert.strictEqual(canRecordIssue("MANAGER", false), true);
  assert.strictEqual(canRecordIssue("MEMBER", true), true);
  assert.strictEqual(canRecordIssue("MEMBER", false), false);
});

test("canUpdateIssue: managers or the reporter", () => {
  assert.strictEqual(canUpdateIssue("ADMIN", false), true);
  assert.strictEqual(canUpdateIssue("MANAGER", false), true);
  assert.strictEqual(canUpdateIssue("MEMBER", true), true);
  assert.strictEqual(canUpdateIssue("MEMBER", false), false);
});
