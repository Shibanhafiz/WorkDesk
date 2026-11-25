import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeOnboardingData,
  normalizeOnboardingStep,
  parseOnboardingData,
  validateProfileInput,
  validateWorkspaceChoiceInput,
} from "../app/lib/onboardingValidation.js";

test("onboarding step is limited to the guided steps", () => {
  assert.equal(normalizeOnboardingStep(0), 0);
  assert.equal(normalizeOnboardingStep("2"), 2);
  assert.equal(normalizeOnboardingStep(3), 3);
  assert.equal(normalizeOnboardingStep(4), null);
  assert.equal(normalizeOnboardingStep(-1), null);
  assert.equal(normalizeOnboardingStep("nope"), null);
});

test("onboarding progress ignores unknown and overlong values", () => {
  const normalized = normalizeOnboardingData({
    workspaceChoice: "team",
    teamName: "  Design Team  ",
    displayName: "A".repeat(200),
    specialization: "DEVELOPER",
    firstProject: {
      name: " Launch ",
      dueDate: "2026-02-30",
      startDate: "2026-03-01",
    },
    skipped: { invitations: true },
    unexpected: true,
  });

  assert.equal(normalized.workspaceChoice, "team");
  assert.equal(normalized.teamName, "Design Team");
  assert.equal(normalized.displayName.length, 80);
  assert.equal(normalized.specialization, "DEVELOPER");
  assert.equal(normalized.firstProject.dueDate, "");
  assert.equal(normalized.firstProject.startDate, "2026-03-01");
  assert.equal(normalized.skipped.invitations, true);
  assert.equal(Object.hasOwn(normalized, "unexpected"), false);
});

test("stored progress falls back safely on invalid JSON", () => {
  assert.deepEqual(parseOnboardingData("not json"), {});
  assert.deepEqual(parseOnboardingData(null), {});
});

test("profile input validates names, URLs and specializations", () => {
  const valid = validateProfileInput({
    displayName: "  Sam Lee ",
    avatarUrl: "https://example.com/avatar.png",
    specialization: "DESIGNER",
  });
  assert.equal(valid.error, undefined);
  assert.equal(valid.data.displayName, "Sam Lee");
  assert.equal(valid.data.specialization, "DESIGNER");

  assert.ok(validateProfileInput({ displayName: "x" }).error);
  assert.ok(validateProfileInput({ avatarUrl: "not-a-url" }).error);
  assert.ok(validateProfileInput({ specialization: "PILOT" }).error);
  assert.equal(validateProfileInput({ displayName: "", specialization: "" }).error, undefined);
});

test("workspace choice validates team names and invitation tokens", () => {
  assert.equal(validateWorkspaceChoiceInput({ choice: "personal" }).error, undefined);
  assert.equal(
    validateWorkspaceChoiceInput({ choice: "team", name: "Product" }).error,
    undefined,
  );
  assert.ok(validateWorkspaceChoiceInput({ choice: "team" }).error);
  assert.ok(validateWorkspaceChoiceInput({ choice: "join" }).error);
  assert.ok(validateWorkspaceChoiceInput({ choice: "guess" }).error);
});
