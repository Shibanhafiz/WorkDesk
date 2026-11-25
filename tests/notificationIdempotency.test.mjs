import assert from "node:assert/strict";
import test from "node:test";

import {
  canAccessNotification,
  buildNotificationRecord,
  createNotificationOnce,
  eventDedupeKey,
  NOTIFICATION_TYPES,
} from "../app/lib/notifications.js";

test("canAccessNotification: users only access their own notifications", () => {
  assert.strictEqual(canAccessNotification({ userId: "u1" }, "u1"), true);
  assert.strictEqual(canAccessNotification({ userId: "u1" }, "u2"), false);
  assert.strictEqual(canAccessNotification(null, "u1"), false);
  assert.strictEqual(canAccessNotification({ userId: "u1" }, null), false);
});

test("eventDedupeKey: stable and ordered", () => {
  const key = eventDedupeKey("submit-testing", "task-1", "user-1", "2");
  assert.strictEqual(key, "submit-testing:task-1:user-1:2");
  assert.strictEqual(
    key,
    eventDedupeKey("submit-testing", "task-1", "user-1", "2"),
  );
});

test("buildNotificationRecord: includes dedupe key", () => {
  const result = buildNotificationRecord({
    userId: "u1",
    type: NOTIFICATION_TYPES.TASK_ASSIGNED,
    title: "Assigned",
    dedupeKey: "assignment:task-1:u1",
  });
  assert.strictEqual(result.error, undefined);
  assert.strictEqual(result.data.dedupeKey, "assignment:task-1:u1");
});

test("createNotificationOnce: creates once and reuses on retry", async () => {
  const store = new Map();
  const prisma = {
    notification: {
      findUnique: async ({ where }) => store.get(where.dedupeKey) ?? null,
      create: async ({ data }) => {
        const record = { id: `n-${store.size + 1}`, ...data, read: false };
        store.set(data.dedupeKey, record);
        return record;
      },
    },
  };

  const input = {
    userId: "u1",
    type: NOTIFICATION_TYPES.TASK_SUBMITTED_FOR_TESTING,
    title: "Submitted",
    dedupeKey: "submit:task-1:u1",
  };

  const first = await createNotificationOnce(prisma, input);
  const second = await createNotificationOnce(prisma, input);
  assert.ok(first);
  assert.strictEqual(second.id, first.id);
  assert.strictEqual(store.size, 1);
});

test("createNotificationOnce: distinct keys create distinct notifications", async () => {
  const store = new Map();
  const prisma = {
    notification: {
      findUnique: async ({ where }) => store.get(where.dedupeKey) ?? null,
      create: async ({ data }) => {
        const record = { id: `n-${store.size + 1}`, ...data, read: false };
        store.set(data.dedupeKey, record);
        return record;
      },
    },
  };

  const base = {
    userId: "u1",
    type: NOTIFICATION_TYPES.TASK_REOPENED,
    title: "Reopened",
  };
  await createNotificationOnce(prisma, {
    ...base,
    dedupeKey: eventDedupeKey("reopened", "t1", "u1", "0"),
  });
  await createNotificationOnce(prisma, {
    ...base,
    dedupeKey: eventDedupeKey("reopened", "t1", "u1", "1"),
  });
  assert.strictEqual(store.size, 2);
});
