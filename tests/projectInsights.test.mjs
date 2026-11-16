import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateProjectMetrics,
  calculateProjectTaskMetrics,
  sortProjects,
} from "../app/lib/projectInsights.js";

const projects = [
  {
    id: "due-soon",
    status: "ACTIVE",
    dueDate: "2026-03-22T00:00:00.000Z",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-03-18T00:00:00.000Z",
  },
  {
    id: "planning",
    status: "PLANNING",
    dueDate: "2026-03-19T00:00:00.000Z",
    createdAt: "2026-03-02T00:00:00.000Z",
    updatedAt: "2026-03-17T00:00:00.000Z",
  },
  {
    id: "completed",
    status: "COMPLETED",
    dueDate: "2026-03-20T00:00:00.000Z",
    createdAt: "2026-03-03T00:00:00.000Z",
    updatedAt: "2026-03-16T00:00:00.000Z",
  },
  {
    id: "archived",
    status: "ARCHIVED",
    dueDate: "2026-03-21T00:00:00.000Z",
    createdAt: "2026-03-04T00:00:00.000Z",
    updatedAt: "2026-03-15T00:00:00.000Z",
  },
  {
    id: "later",
    status: "ACTIVE",
    dueDate: "2026-03-23T00:00:00.000Z",
    createdAt: "2026-03-05T00:00:00.000Z",
    updatedAt: "2026-03-14T00:00:00.000Z",
  },
];

test("calculates overview project counts and upcoming deadlines", () => {
  const metrics = calculateProjectMetrics(projects, "2026-03-15");

  assert.equal(metrics.total, 5);
  assert.equal(metrics.active, 2);
  assert.equal(metrics.completed, 1);
  assert.equal(metrics.approachingDeadlines, 2);
  assert.deepEqual(
    metrics.approachingProjects.map((project) => project.id),
    ["planning", "due-soon"],
  );
  assert.deepEqual(
    metrics.recentlyUpdated.map((project) => project.id),
    ["due-soon", "planning", "completed", "archived"],
  );
});

test("calculates completed, pending, and zero-task project progress", () => {
  assert.deepEqual(
    calculateProjectTaskMetrics([
      { status: "DONE" },
      { status: "TODO" },
      { status: "IN_PROGRESS" },
    ]),
    { total: 3, completed: 1, pending: 2, completionPercentage: 33 },
  );
  assert.equal(
    calculateProjectTaskMetrics([]).completionPercentage,
    0,
  );
});

test("sorts projects by creation time and deadline with undated projects last", () => {
  assert.deepEqual(
    sortProjects(projects, "deadline").map((project) => project.id),
    ["planning", "completed", "archived", "due-soon", "later"],
  );
  assert.deepEqual(
    sortProjects(projects, "oldest").map((project) => project.id),
    ["due-soon", "planning", "completed", "archived", "later"],
  );
});
