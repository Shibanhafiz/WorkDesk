import assert from "node:assert/strict";
import test from "node:test";

import {
  buildNotificationRecord,
  createNotification,
  getUnreadCount,
  taskAssignmentNotification,
  NOTIFICATION_TYPES,
} from "../app/lib/notifications.js";

test("buildNotificationRecord: valid input returns data", () => {
  const result = buildNotificationRecord({
    userId: "user-a",
    type: NOTIFICATION_TYPES.TASK_ASSIGNED,
    title: "You were assigned a task",
    body: "Review the API",
    link: "/tasks",
  });
  assert.strictEqual(result.error, undefined);
  assert.strictEqual(result.data.userId, "user-a");
  assert.strictEqual(result.data.type, "TASK_ASSIGNED");
  assert.strictEqual(result.data.title, "You were assigned a task");
  assert.strictEqual(result.data.body, "Review the API");
  assert.strictEqual(result.data.link, "/tasks");
});

test("buildNotificationRecord: trims title, optional body/link", () => {
  const result = buildNotificationRecord({
    userId: "user-a",
    type: NOTIFICATION_TYPES.COMMENT_ADDED,
    title: "  New comment  ",
  });
  assert.strictEqual(result.error, undefined);
  assert.strictEqual(result.data.title, "New comment");
  assert.strictEqual(result.data.body, null);
  assert.strictEqual(result.data.link, null);
});

test("buildNotificationRecord: rejects unknown type", () => {
  const result = buildNotificationRecord({
    userId: "user-a",
    type: "NOT_A_REAL_TYPE",
    title: "T",
  });
  assert.ok(result.error);
  assert.strictEqual(result.error.includes("Unknown notification type"), true);
});

test("buildNotificationRecord: requires recipient and title", () => {
  assert.ok(
    buildNotificationRecord({
      userId: "",
      type: NOTIFICATION_TYPES.TASK_ASSIGNED,
      title: "T",
    }).error,
  );
  assert.ok(
    buildNotificationRecord({
      userId: "user-a",
      type: NOTIFICATION_TYPES.TASK_ASSIGNED,
      title: "   ",
    }).error,
  );
  assert.ok(
    buildNotificationRecord({
      userId: "user-a",
      type: NOTIFICATION_TYPES.TASK_ASSIGNED,
      title: "x".repeat(201),
    }).error,
  );
});

test("createNotification: creates notification via prisma", async () => {
  let createdInput = null;
  const prisma = {
    notification: {
      create: async ({ data }) => {
        createdInput = data;
        return { id: "n-1", ...data, read: false, createdAt: new Date() };
      },
    },
  };

  const created = await createNotification(prisma, {
    userId: "user-a",
    type: NOTIFICATION_TYPES.TASK_ASSIGNED,
    title: "Assigned",
    body: "Task X",
    link: "/tasks",
  });
  assert.ok(created);
  assert.strictEqual(created.userId, "user-a");
  assert.strictEqual(createdInput.title, "Assigned");
  assert.strictEqual(createdInput.body, "Task X");
  assert.strictEqual(createdInput.link, "/tasks");
});

test("createNotification: skips invalid input without calling prisma", async () => {
  let createCalled = false;
  const prisma = {
    notification: {
      create: async () => {
        createCalled = true;
        return {};
      },
    },
  };

  const result = await createNotification(prisma, {
    userId: "",
    type: "BAD",
    title: "",
  });
  assert.strictEqual(result, null);
  assert.strictEqual(createCalled, false);
});

test("createNotification: returns null when prisma fails (never throws)", async () => {
  const prisma = {
    notification: {
      create: async () => {
        throw new Error("db down");
      },
    },
  };
  const result = await createNotification(prisma, {
    userId: "user-a",
    type: NOTIFICATION_TYPES.TASK_ASSIGNED,
    title: "Assigned",
  });
  assert.strictEqual(result, null);
});

test("getUnreadCount: counts unread notifications via prisma", async () => {
  const seen = {};
  const prisma = {
    notification: {
      count: async ({ where }) => {
        seen.where = where;
        return 3;
      },
    },
  };
  const count = await getUnreadCount(prisma, "user-a");
  assert.strictEqual(count, 3);
  assert.deepStrictEqual(seen.where, { userId: "user-a", read: false });
});

test("taskAssignmentNotification is idempotent per assignment event", () => {
  const input = {
    assigneeId: "user-b",
    actorId: "user-a",
    taskTitle: "Design review",
    taskId: "task-1",
  };

  assert.strictEqual(taskAssignmentNotification({ ...input, assigneeId: "user-a" }), null);
  const first = taskAssignmentNotification({ ...input, occurrence: "activity-1" });
  const retry = taskAssignmentNotification({ ...input, occurrence: "activity-1" });
  const reassignment = taskAssignmentNotification({ ...input, occurrence: "activity-2" });

  assert.strictEqual(first.dedupeKey, retry.dedupeKey);
  assert.notStrictEqual(first.dedupeKey, reassignment.dedupeKey);
});
