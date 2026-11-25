import assert from "node:assert/strict";
import test from "node:test";

import { availableLifecycleActions } from "../app/lib/taskLifecycle.js";

test("assignee can start work and submit it for testing", () => {
  const actions = availableLifecycleActions({
    status: "TODO",
    assigneeId: "user-a",
    userId: "user-a",
    role: "MEMBER",
  });
  assert.deepEqual(actions, [{ key: "START_WORK", label: "Start work" }]);
});

test("reviewer actions require manager or admin role", () => {
  const base = { status: "TESTING", assigneeId: "user-a", userId: "user-b" };
  assert.deepEqual(availableLifecycleActions({ ...base, role: "MEMBER" }), []);
  assert.deepEqual(
    availableLifecycleActions({ ...base, role: "MANAGER" }).map((action) => action.key),
    ["APPROVE", "REJECT"],
  );
});

test("unassigned members cannot act on someone else's task", () => {
  const actions = availableLifecycleActions({
    status: "IN_PROGRESS",
    assigneeId: "user-a",
    userId: "user-b",
    role: "MEMBER",
  });
  assert.deepEqual(actions, []);
});
