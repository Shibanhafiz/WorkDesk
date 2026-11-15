import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateTaskMetrics,
  groupTasksByDueDate,
  sortTasks,
} from "../app/lib/taskInsights.js";

const tasks = [
  {
    id: "overdue",
    status: "TODO",
    priority: "LOW",
    dueDate: "2026-11-14T00:00:00.000Z",
    createdAt: "2026-11-14T12:00:00.000Z",
  },
  {
    id: "upcoming",
    status: "IN_PROGRESS",
    priority: "HIGH",
    dueDate: "2026-11-16T00:00:00.000Z",
    createdAt: "2026-11-13T12:00:00.000Z",
  },
  {
    id: "completed-overdue",
    status: "DONE",
    priority: "HIGH",
    dueDate: "2026-11-10T00:00:00.000Z",
    createdAt: "2026-11-12T12:00:00.000Z",
  },
  {
    id: "unscheduled",
    status: "TODO",
    priority: "MEDIUM",
    dueDate: null,
    createdAt: "2026-11-11T12:00:00.000Z",
  },
  {
    id: "completed-upcoming",
    status: "DONE",
    priority: "LOW",
    dueDate: "2026-11-20T00:00:00.000Z",
    createdAt: "2026-11-10T12:00:00.000Z",
  },
];

test("calculates status, completion, due-date, and priority metrics", () => {
  assert.deepEqual(calculateTaskMetrics(tasks, "2026-11-15"), {
    total: 5,
    todo: 2,
    inProgress: 1,
    completed: 2,
    completionPercentage: 40,
    overdue: 1,
    upcoming: 1,
    priorities: { LOW: 2, MEDIUM: 1, HIGH: 2 },
  });
});

test("groups due dates in order and keeps undated tasks separate", () => {
  const groups = groupTasksByDueDate(tasks, "2026-11-15");

  assert.deepEqual(groups.overdue.map((task) => task.id), ["overdue"]);
  assert.deepEqual(groups.upcoming.map((task) => task.id), ["upcoming"]);
  assert.deepEqual(groups.unscheduled.map((task) => task.id), ["unscheduled"]);
});

test("sorts tasks by due date, priority, and creation time", () => {
  assert.deepEqual(
    sortTasks(tasks, "due-date").map((task) => task.id),
    ["completed-overdue", "overdue", "upcoming", "completed-upcoming", "unscheduled"],
  );
  assert.deepEqual(
    sortTasks(tasks, "priority-high").map((task) => task.priority),
    ["HIGH", "HIGH", "MEDIUM", "LOW", "LOW"],
  );
  assert.deepEqual(
    sortTasks(tasks, "oldest").map((task) => task.id),
    [
      "completed-upcoming",
      "unscheduled",
      "completed-overdue",
      "upcoming",
      "overdue",
    ],
  );
});

test("returns zero completion when there are no tasks", () => {
  assert.equal(calculateTaskMetrics([], "2026-11-15").completionPercentage, 0);
});
