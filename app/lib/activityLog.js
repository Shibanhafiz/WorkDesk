export const ACTIVITY_TYPES = {
  TASK_CREATED: "TASK_CREATED",
  TASK_UPDATED: "TASK_UPDATED",
  TASK_DELETED: "TASK_DELETED",
  TASK_ASSIGNED: "TASK_ASSIGNED",
  TASK_COMPLETED: "TASK_COMPLETED",
  PROJECT_CREATED: "PROJECT_CREATED",
  PROJECT_UPDATED: "PROJECT_UPDATED",
  STATUS_CHANGED: "STATUS_CHANGED",
  TESTING_DECISION: "TESTING_DECISION",
  TASK_REOPENED: "TASK_REOPENED",
  COMMENT_ADDED: "COMMENT_ADDED",
  COMMENT_EDITED: "COMMENT_EDITED",
  COMMENT_DELETED: "COMMENT_DELETED",
  ISSUE_ADDED: "ISSUE_ADDED",
  ISSUE_UPDATED: "ISSUE_UPDATED",
  ATTACHMENT_ADDED: "ATTACHMENT_ADDED",
  ATTACHMENT_DELETED: "ATTACHMENT_DELETED",
  INVITATION_SENT: "INVITATION_SENT",
  INVITATION_REVOKED: "INVITATION_REVOKED",
  MEMBER_JOINED: "MEMBER_JOINED",
  MEMBER_ROLE_CHANGED: "MEMBER_ROLE_CHANGED",
  MEMBER_REMOVED: "MEMBER_REMOVED",
};

const VALID_TYPES = new Set(Object.values(ACTIVITY_TYPES));

/**
 * Build a validated activity record for server-side recording.
 * Returns { error } or { data }.
 *
 * The actorId is always supplied by the server from the requesting
 * user's identity — never taken from user-controlled payloads.
 */
export function buildActivityRecord({
  workspaceId,
  actorId,
  type,
  targetId = null,
  targetType = null,
  metadata = null,
}) {
  if (!workspaceId || typeof workspaceId !== "string") {
    return { error: "Activity requires a workspace ID." };
  }

  if (!actorId || typeof actorId !== "string") {
    return { error: "Activity requires an actor ID." };
  }

  if (!VALID_TYPES.has(type)) {
    return { error: `Unknown activity type: ${type}` };
  }

  let serializedMetadata = null;
  if (metadata !== null && metadata !== undefined) {
    try {
      serializedMetadata = JSON.stringify(metadata);
    } catch {
      return { error: "Activity metadata must be serializable." };
    }
  }

  return {
    data: {
      workspaceId,
      actorId,
      type,
      targetId,
      targetType,
      metadata: serializedMetadata,
    },
  };
}

/**
 * Parse a stored activity record for API responses.
 */
export function serializeActivity(activity) {
  let metadata = null;
  if (activity.metadata) {
    try {
      metadata = JSON.parse(activity.metadata);
    } catch {
      metadata = null;
    }
  }

  return {
    id: activity.id,
    type: activity.type,
    targetId: activity.targetId,
    targetType: activity.targetType,
    metadata,
    createdAt: activity.createdAt,
    actor: activity.actor
      ? {
          id: activity.actor.id,
          name: activity.actor.name,
          email: activity.actor.email,
        }
      : null,
  };
}

/**
 * Record an activity on the server. Never throws — activity recording
 * must not break the primary operation.
 */
export async function recordActivity(prisma, activityInput) {
  const built = buildActivityRecord(activityInput);
  if (built.error) {
    console.error(`[Activity] Skipped recording: ${built.error}`);
    return null;
  }

  try {
    return await prisma.activity.create({ data: built.data });
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`[Activity] Failed to record activity: ${errorName}`);
    return null;
  }
}
