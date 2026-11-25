import assert from "node:assert/strict";
import test from "node:test";

import { buildTaskTimeline } from "../app/lib/taskTimeline.js";

const actor = { id: "u1", name: "Alice", email: "alice@example.com" };

test("buildTaskTimeline: merges activities and status history chronologically", () => {
  const task = {
    id: "t1",
    history: [
      {
        id: "h2",
        fromStatus: "IN_PROGRESS",
        toStatus: "TESTING",
        actor,
        createdAt: "2026-01-02T00:00:00.000Z",
        reason: null,
        reviewComment: null,
      },
      {
        id: "h1",
        fromStatus: "TODO",
        toStatus: "IN_PROGRESS",
        actor,
        createdAt: "2026-01-01T00:00:00.000Z",
        reason: null,
        reviewComment: null,
      },
    ],
  };

  const activities = [
    {
      id: "a1",
      type: "TASK_CREATED",
      actor,
      createdAt: "2025-12-31T00:00:00.000Z",
      metadata: JSON.stringify({ title: "Task" }),
    },
    {
      id: "a2",
      type: "COMMENT_ADDED",
      actor,
      createdAt: "2026-01-03T00:00:00.000Z",
      metadata: JSON.stringify({ taskId: "t1" }),
    },
  ];

  const timeline = buildTaskTimeline(task, activities);
  assert.strictEqual(timeline.length, 4);
  assert.strictEqual(timeline[0].type, "TASK_CREATED");
  assert.strictEqual(timeline[1].kind, "STATUS");
  assert.strictEqual(timeline[2].kind, "STATUS");
  assert.strictEqual(timeline[3].type, "COMMENT_ADDED");
});

test("buildTaskTimeline: labels testing decisions and reopenings", () => {
  const task = { id: "t1", history: [] };
  const activities = [
    {
      id: "a1",
      type: "TESTING_DECISION",
      actor,
      createdAt: "2026-01-01T00:00:00.000Z",
      metadata: JSON.stringify({ toStatus: "DONE" }),
    },
    {
      id: "a2",
      type: "TASK_REOPENED",
      actor,
      createdAt: "2026-01-02T00:00:00.000Z",
      metadata: JSON.stringify({ fromStatus: "TESTING_FAILED", toStatus: "REOPENED" }),
    },
    {
      id: "a3",
      type: "ISSUE_ADDED",
      actor,
      createdAt: "2026-01-03T00:00:00.000Z",
      metadata: JSON.stringify({ severity: "HIGH" }),
    },
  ];

  const timeline = buildTaskTimeline(task, activities);
  assert.strictEqual(timeline[0].label, "Testing approved");
  assert.strictEqual(timeline[1].label, "Task reopened");
  assert.strictEqual(timeline[2].label, "Issue recorded");
});

test("buildTaskTimeline: handles malformed metadata safely", () => {
  const timeline = buildTaskTimeline(
    { id: "t1", history: [] },
    [
      {
        id: "a1",
        type: "TASK_UPDATED",
        actor: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        metadata: "{not json",
      },
    ],
  );
  assert.strictEqual(timeline.length, 1);
  assert.strictEqual(timeline[0].actor, null);
  assert.strictEqual(timeline[0].label, "task updated");
});
