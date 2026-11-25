export const NOTIFICATION_TYPES = {
  TASK_ASSIGNED: "TASK_ASSIGNED",
  COMMENT_ADDED: "COMMENT_ADDED",
  MENTIONED: "MENTIONED",
  INVITATION_RECEIVED: "INVITATION_RECEIVED",
  TASK_SUBMITTED_FOR_TESTING: "TASK_SUBMITTED_FOR_TESTING",
  TESTING_FAILED: "TESTING_FAILED",
  TASK_APPROVED: "TASK_APPROVED",
  TASK_REOPENED: "TASK_REOPENED",
};

const VALID_TYPES = new Set(Object.values(NOTIFICATION_TYPES));

/**
 * Ownership check: a user may only read/update notifications
 * addressed to them.
 */
export function canAccessNotification(notification, userId) {
  if (!notification || !userId || typeof userId !== "string") {
    return false;
  }
  return notification.userId === userId;
}

/**
 * Build a validated notification record.
 * userId is always the recipient, supplied by the server.
 * Returns { error } or { data }.
 */
export function buildNotificationRecord({
  userId,
  type,
  title,
  body = null,
  link = null,
  dedupeKey = null,
}) {
  if (!userId || typeof userId !== "string") {
    return { error: "Notification requires a recipient user ID." };
  }

  if (!VALID_TYPES.has(type)) {
    return { error: `Unknown notification type: ${type}` };
  }

  if (!title || typeof title !== "string" || title.trim().length === 0) {
    return { error: "Notification requires a title." };
  }

  if (title.length > 200) {
    return { error: "Notification title is too long." };
  }

  return {
    data: {
      userId,
      type,
      title: title.trim(),
      body: typeof body === "string" && body.length > 0 ? body : null,
      link: typeof link === "string" && link.length > 0 ? link : null,
      dedupeKey:
        typeof dedupeKey === "string" && dedupeKey.length > 0
          ? dedupeKey.slice(0, 255)
          : null,
    },
  };
}

/**
 * Create a notification on the server. Never throws — notification
 * delivery must not break the primary operation.
 * Skips self-notifications (no point notifying the actor).
 */
export async function createNotification(prisma, input) {
  const built = buildNotificationRecord(input);
  if (built.error) {
    console.error(`[Notification] Skipped creating: ${built.error}`);
    return null;
  }

  try {
    return await prisma.notification.create({ data: built.data });
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`[Notification] Failed to create: ${errorName}`);
    return null;
  }
}

/**
 * Idempotent notification creation. Uses a unique dedupeKey so retrying the
 * same server-side event never produces a duplicate notification.
 * Returns the existing notification when the key was already used.
 */
export async function createNotificationOnce(prisma, input) {
  if (!input || !input.dedupeKey) {
    return createNotification(prisma, input);
  }

  const built = buildNotificationRecord(input);
  if (built.error) {
    console.error(`[Notification] Skipped creating: ${built.error}`);
    return null;
  }

  try {
    const existing = await prisma.notification.findUnique({
      where: { dedupeKey: built.data.dedupeKey },
    });
    if (existing) return existing;

    return await prisma.notification.create({ data: built.data });
  } catch (error) {
    // A concurrent retry may hit the unique constraint; treat as success.
    if (error && typeof error === "object" && error.code === "P2002") {
      try {
        return await prisma.notification.findUnique({
          where: { dedupeKey: built.data.dedupeKey },
        });
      } catch {
        return null;
      }
    }
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`[Notification] Failed to create: ${errorName}`);
    return null;
  }
}

/**
 * Build a stable dedupe key for a server-side event.
 */
export function eventDedupeKey(eventType, entityId, recipientId, occurrence = "") {
  return [eventType, entityId, recipientId, occurrence]
    .filter((part) => part !== undefined && part !== null && String(part).length > 0)
    .join(":");
}

/**
 * Notify a set of recipients, skipping the actor and null/empty ids.
 */
export async function notifyRecipients(prisma, recipients, buildInput) {
  const unique = [...new Set(recipients.filter(Boolean))];
  const results = [];
  for (const userId of unique) {
    const input = buildInput(userId);
    if (!input) continue;
    results.push(await createNotificationOnce(prisma, input));
  }
  return results;
}

/**
 * Build a task-assignment notification input, or null if recipient
 * is the actor (no self-notification).
 */
export function taskAssignmentNotification({
  assigneeId,
  actorId,
  taskTitle,
  taskId,
  occurrence = "",
}) {
  if (!assigneeId || assigneeId === actorId) return null;
  return {
    userId: assigneeId,
    type: NOTIFICATION_TYPES.TASK_ASSIGNED,
    title: "You were assigned a task",
    body: taskTitle,
    link: `/tasks?task=${taskId ?? ""}`,
    dedupeKey: eventDedupeKey("assignment", taskId, assigneeId, occurrence),
  };
}

/**
 * Build a comment notification input for the task assignee,
 * or null if recipient is the author/actor.
 */
export function commentNotification({
  recipientId,
  actorId,
  taskTitle,
  taskId,
  commentId,
}) {
  if (!recipientId || recipientId === actorId) return null;
  return {
    userId: recipientId,
    type: NOTIFICATION_TYPES.COMMENT_ADDED,
    title: "New comment on your task",
    body: taskTitle,
    link: `/tasks?task=${taskId}`,
    dedupeKey: eventDedupeKey("comment", commentId || taskId, recipientId),
  };
}

/**
 * Build a mention notification input, or null if recipient is the author.
 */
export function mentionNotification({ recipientId, actorId, taskTitle, taskId }) {
  if (!recipientId || recipientId === actorId) return null;
  return {
    userId: recipientId,
    type: NOTIFICATION_TYPES.MENTIONED,
    title: "You were mentioned in a comment",
    body: taskTitle,
    link: `/tasks?task=${taskId}`,
  };
}

/**
 * Build an invitation notification input, or null if recipient is the inviter.
 */
export function invitationNotification({ recipientId, actorId, workspaceName, role }) {
  if (!recipientId || recipientId === actorId) return null;
  return {
    userId: recipientId,
    type: NOTIFICATION_TYPES.INVITATION_RECEIVED,
    title: "You have a workspace invitation",
    body: `${workspaceName} (${role})`,
    link: "/team",
  };
}

/**
 * Count unread notifications for a user.
 */
export async function getUnreadCount(prisma, userId) {
  return prisma.notification.count({
    where: { userId, read: false },
  });
}

/**
 * Build a "submitted for testing" notification for a reviewer.
 */
export function testingSubmissionNotification({ recipientId, actorId, taskTitle, taskId, occurrence = "" }) {
  if (!recipientId || recipientId === actorId) return null;
  return {
    userId: recipientId,
    type: NOTIFICATION_TYPES.TASK_SUBMITTED_FOR_TESTING,
    title: "Task submitted for testing",
    body: taskTitle,
    link: `/tasks?task=${taskId}`,
    dedupeKey: eventDedupeKey("submit-testing", taskId, recipientId, occurrence),
  };
}

/**
 * Build a "testing failed" notification. Sent to the manager on rejection
 * and to the assignee so they know the task must be reopened and fixed.
 */
export function testingFailureNotification({ recipientId, actorId, taskTitle, taskId, reason, occurrence = "" }) {
  if (!recipientId || recipientId === actorId) return null;
  return {
    userId: recipientId,
    type: NOTIFICATION_TYPES.TESTING_FAILED,
    title: "Testing failed",
    body: reason ? `${taskTitle} — ${reason}` : taskTitle,
    link: `/tasks?task=${taskId}`,
    dedupeKey: eventDedupeKey("testing-failed", taskId, recipientId, occurrence),
  };
}

/**
 * Build a "task reopened" notification for the assignee.
 */
export function taskReopenedNotification({ recipientId, actorId, taskTitle, taskId, reason, occurrence = "" }) {
  if (!recipientId || recipientId === actorId) return null;
  return {
    userId: recipientId,
    type: NOTIFICATION_TYPES.TASK_REOPENED,
    title: "Task reopened for fixes",
    body: reason ? `${taskTitle} — ${reason}` : taskTitle,
    link: `/tasks?task=${taskId}`,
    dedupeKey: eventDedupeKey("reopened", taskId, recipientId, occurrence),
  };
}

/**
 * Build a "task approved" notification for the assignee.
 */
export function taskApprovedNotification({ recipientId, actorId, taskTitle, taskId, occurrence = "" }) {
  if (!recipientId || recipientId === actorId) return null;
  return {
    userId: recipientId,
    type: NOTIFICATION_TYPES.TASK_APPROVED,
    title: "Task approved",
    body: taskTitle,
    link: `/tasks?task=${taskId}`,
    dedupeKey: eventDedupeKey("approved", taskId, recipientId, occurrence),
  };
}
