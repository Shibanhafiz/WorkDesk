import { can } from "./workspacePermissions.js";

export const TASK_STATUSES = [
  "TODO",
  "IN_PROGRESS",
  "TESTING",
  "TESTING_FAILED",
  "REOPENED",
  "DONE",
];

export const STATUS_LABELS = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  TESTING: "Testing",
  TESTING_FAILED: "Testing failed",
  REOPENED: "Reopened",
  DONE: "Done",
};

export const STATUS_TONES = {
  TODO: "status-todo",
  IN_PROGRESS: "status-in-progress",
  TESTING: "status-testing",
  TESTING_FAILED: "status-testing-failed",
  REOPENED: "status-reopened",
  DONE: "status-done",
};

export function availableLifecycleActions({ status, assigneeId, userId, role }) {
  const actions = [];
  const assigned = Boolean(userId) && assigneeId === userId;
  const reviewer = can(role, "MANAGER");

  if (assigned || reviewer) {
    if (status === "TODO") actions.push({ key: "START_WORK", label: "Start work" });
    if (status === "IN_PROGRESS") {
      actions.push({ key: "SUBMIT_FOR_TESTING", label: "Submit for testing" });
    }
    if (status === "REOPENED") actions.push({ key: "RESUME", label: "Resume work" });
  }

  if (reviewer) {
    if (status === "TESTING") {
      actions.push({ key: "APPROVE", label: "Approve" });
      actions.push({ key: "REJECT", label: "Reject", danger: true });
    }
    if (status === "TESTING_FAILED") {
      actions.push({ key: "REOPEN", label: "Reopen" });
    }
  }

  return actions;
}

// Allowed lifecycle transitions. There is deliberately no direct path to
// DONE from execution states: everything must pass through TESTING review.
// Reopening only happens from TESTING_FAILED and re-enters execution via
// REOPENED -> IN_PROGRESS.
export const ALLOWED_TRANSITIONS = {
  TODO: ["IN_PROGRESS"],
  IN_PROGRESS: ["TESTING"],
  TESTING: ["DONE", "TESTING_FAILED"],
  TESTING_FAILED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS"],
  DONE: [],
};

// Who may perform each transition.
// "ASSIGNEE" = the assigned employee; "REVIEWER" = MANAGER+ reviewer.
const TRANSITION_ACTORS = {
  "TODO>IN_PROGRESS": "ASSIGNEE",
  "IN_PROGRESS>TESTING": "ASSIGNEE",
  "TESTING>DONE": "REVIEWER",
  "TESTING>TESTING_FAILED": "REVIEWER",
  "TESTING_FAILED>REOPENED": "REVIEWER",
  "REOPENED>IN_PROGRESS": "ASSIGNEE",
};

// Actions exposed by the API, mapped to their target status.
export const LIFECYCLE_ACTIONS = {
  START_WORK: { from: "TODO", to: "IN_PROGRESS" },
  SUBMIT_FOR_TESTING: { from: "IN_PROGRESS", to: "TESTING" },
  APPROVE: { from: "TESTING", to: "DONE" },
  REJECT: { from: "TESTING", to: "TESTING_FAILED" },
  REOPEN: { from: "TESTING_FAILED", to: "REOPENED" },
  RESUME: { from: "REOPENED", to: "IN_PROGRESS" },
};

const REASON_REQUIRED = new Set(["REJECT", "REOPEN"]);

export function isValidStatus(status) {
  return TASK_STATUSES.includes(status);
}

export function isValidStatusTransition(from, to) {
  if (!isValidStatus(from) || !isValidStatus(to)) return false;
  return (ALLOWED_TRANSITIONS[from] || []).includes(to);
}

/**
 * Validate a lifecycle action against the task's current status and the
 * actor's role/assignment. Returns { error } or { ok: true, from, to }.
 *
 * This is the single server-side authority for status changes — API routes
 * must call it rather than accepting raw status values from clients.
 */
export function validateLifecycleAction({
  action,
  currentStatus,
  actorRole,
  isAssignee,
  reason,
  reviewComment,
}) {
  const definition = LIFECYCLE_ACTIONS[action];
  if (!definition) {
    return { error: `Unknown lifecycle action: ${action}.` };
  }

  if (currentStatus !== definition.from) {
    return {
      error: `Action ${action} requires status ${definition.from}, but task is ${currentStatus}.`,
    };
  }

  if (!isValidStatusTransition(definition.from, definition.to)) {
    return {
      error: `Transition from ${definition.from} to ${definition.to} is not allowed.`,
    };
  }

  const actorType = TRANSITION_ACTORS[`${definition.from}>${definition.to}`];

  if (actorType === "ASSIGNEE") {
    // Execution actions require the actor to be the assigned employee,
    // or a MANAGER+ acting on their behalf.
    if (!isAssignee && !can(actorRole, "MANAGER")) {
      return {
        error: "Only the assigned employee or a manager can perform this action.",
      };
    }
  } else if (actorType === "REVIEWER") {
    // Review, rejection and reopening always require MANAGER+.
    if (!can(actorRole, "MANAGER")) {
      return {
        error: "Only managers and admins can review, reject, or reopen tasks.",
      };
    }
  }

  if (REASON_REQUIRED.has(action)) {
    const text = typeof reason === "string" ? reason.trim() : "";
    if (text.length === 0) {
      return { error: `A reason is required for ${action}.` };
    }
    if (text.length > 1000) {
      return { error: "Reason must be 1,000 characters or fewer." };
    }
  }

  if (reviewComment !== undefined && reviewComment !== null) {
    if (typeof reviewComment !== "string") {
      return { error: "Review comment must be a string." };
    }
    if (reviewComment.trim().length > 2000) {
      return { error: "Review comment must be 2,000 characters or fewer." };
    }
  }

  return {
    ok: true,
    from: definition.from,
    to: definition.to,
    reason: typeof reason === "string" && reason.trim() ? reason.trim() : null,
    reviewComment:
      typeof reviewComment === "string" && reviewComment.trim()
        ? reviewComment.trim()
        : null,
  };
}

/**
 * Derive the reopen count from history (traceable source of truth).
 * A reopening is recorded as a transition into REOPENED.
 */
export function countReopensFromHistory(history) {
  if (!Array.isArray(history)) return 0;
  return history.filter((entry) => entry.toStatus === "REOPENED").length;
}
