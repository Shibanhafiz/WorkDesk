import { STATUS_LABELS } from "./taskLifecycle.js";

/**
 * Merge activity records and task-history records into one chronological
 * timeline. Each entry has: id, type, label, actor, timestamp, details.
 */
export function buildTaskTimeline(task, activities = []) {
  const entries = [];

  for (const activity of activities) {
    let metadata = null;
    try {
      metadata = activity.metadata ? JSON.parse(activity.metadata) : null;
    } catch {
      metadata = null;
    }
    entries.push({
      id: `activity-${activity.id}`,
      kind: "ACTIVITY",
      type: activity.type,
      label: activityLabel(activity.type, metadata),
      actor: activity.actor
        ? { id: activity.actor.id, name: activity.actor.name, email: activity.actor.email }
        : null,
      createdAt: activity.createdAt,
      details: metadata,
    });
  }

  const history = Array.isArray(task.history) ? task.history : [];
  for (const entry of history) {
    const from = entry.fromStatus ? STATUS_LABELS[entry.fromStatus] ?? entry.fromStatus : null;
    const to = STATUS_LABELS[entry.toStatus] ?? entry.toStatus;
    entries.push({
      id: `history-${entry.id}`,
      kind: "STATUS",
      type: "STATUS_CHANGED",
      label: from ? `Status: ${from} → ${to}` : `Status: ${to}`,
      actor: entry.actor
        ? { id: entry.actor.id, name: entry.actor.name, email: entry.actor.email }
        : null,
      createdAt: entry.createdAt,
      details: {
        reason: entry.reason,
        reviewComment: entry.reviewComment,
        fromStatus: entry.fromStatus,
        toStatus: entry.toStatus,
      },
    });
  }

  entries.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return entries;
}

function activityLabel(type, metadata) {
  switch (type) {
    case "TASK_CREATED":
      return "Task created";
    case "TASK_ASSIGNED":
      return metadata?.toAssigneeId ? "Task assigned" : "Task assignment changed";
    case "STATUS_CHANGED":
      return metadata?.action ? `Status: ${metadata.action}` : "Status changed";
    case "TESTING_DECISION":
      return metadata?.toStatus === "DONE" ? "Testing approved" : "Testing rejected";
    case "TASK_REOPENED":
      return "Task reopened";
    case "COMMENT_ADDED":
      return "Comment added";
    case "COMMENT_EDITED":
      return "Comment edited";
    case "COMMENT_DELETED":
      return "Comment deleted";
    case "ISSUE_ADDED":
      return "Issue recorded";
    case "ISSUE_UPDATED":
      return "Issue updated";
    case "ATTACHMENT_ADDED":
      return `Attachment added${metadata?.fileName ? `: ${metadata.fileName}` : ""}`;
    case "ATTACHMENT_DELETED":
      return "Attachment deleted";
    default:
      return type.replaceAll("_", " ").toLowerCase();
  }
}
