import assert from "node:assert/strict";
import test from "node:test";

import { canEditTask } from "../app/lib/taskAssignment.js";

test("member cannot claim a task already assigned to someone else", () => {
  assert.strictEqual(
    canEditTask({
      actorRole: "MEMBER",
      actorId: "member-b",
      taskAssigneeId: "member-a",
      isSelfAssignment: true,
    }),
    false,
  );
});

test("member can claim an unassigned task", () => {
  assert.strictEqual(
    canEditTask({
      actorRole: "MEMBER",
      actorId: "member-b",
      taskAssigneeId: null,
      isSelfAssignment: true,
    }),
    true,
  );
});

test("member can edit a task assigned to them", () => {
  assert.strictEqual(
    canEditTask({
      actorRole: "MEMBER",
      actorId: "member-a",
      taskAssigneeId: "member-a",
      isSelfAssignment: false,
    }),
    true,
  );
});

test("manager and admin can edit any task", () => {
  for (const actorRole of ["MANAGER", "ADMIN"]) {
    assert.strictEqual(
      canEditTask({
        actorRole,
        actorId: "manager",
        taskAssigneeId: "member-a",
        isSelfAssignment: false,
      }),
      true,
    );
  }
});

test("member cannot clear another member's assignment", () => {
  assert.strictEqual(
    canEditTask({
      actorRole: "MEMBER",
      actorId: "member-b",
      taskAssigneeId: "member-a",
      isSelfAssignment: false,
    }),
    false,
  );
});
