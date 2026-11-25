"use client";

import { useEffect, useState } from "react";

const actionLabels = {
  TASK_CREATED: "created a task",
  TASK_COMPLETED: "completed a task",
  TASK_ASSIGNED: "assigned a task",
  TASK_UPDATED: "updated a task",
  TASK_DELETED: "deleted a task",
  STATUS_CHANGED: "changed task status",
  TESTING_DECISION: "recorded a testing decision",
  TASK_REOPENED: "reopened a task",
  PROJECT_CREATED: "created a project",
  PROJECT_UPDATED: "updated a project",
  COMMENT_ADDED: "commented on a task",
  COMMENT_EDITED: "edited a comment",
  COMMENT_DELETED: "deleted a comment",
  ISSUE_ADDED: "added an issue",
  ISSUE_UPDATED: "updated an issue",
  ATTACHMENT_ADDED: "added an attachment",
  ATTACHMENT_DELETED: "deleted an attachment",
  INVITATION_SENT: "sent an invitation",
  INVITATION_REVOKED: "revoked an invitation",
  MEMBER_JOINED: "joined the workspace",
  MEMBER_ROLE_CHANGED: "changed a member role",
  MEMBER_REMOVED: "removed a member",
};

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function targetLabel(activity) {
  if (activity.metadata?.name || activity.metadata?.title) {
    return activity.metadata.name || activity.metadata.title;
  }
  if (activity.targetType) return activity.targetType.toLowerCase();
  return "item";
}

export default function WorkspaceActivity({ workspaceId, workspaceName }) {
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!workspaceId) return;
    let active = true;

    fetch(`/api/workspaces/${workspaceId}/activity?limit=50`, { cache: "no-store" })
      .then((response) => response.json().catch(() => ({ error: "Unable to load activity." })))
      .then((result) => {
        if (!active) return;
        if (Array.isArray(result)) {
          setActivities(result);
        } else {
          setError(result.error || "Unable to load activity.");
        }
      })
      .catch(() => {
        if (active) setError("Unable to load activity.");
      });

    return () => {
      active = false;
    };
  }, [workspaceId]);

  if (!workspaceId) return null;

  return (
    <section aria-labelledby="activity-heading">
      <div className="section-heading-row">
        <div>
          <p className="section-kicker">04 / ACTIVITY</p>
          <h2 id="activity-heading" className="section-title">
            Recent activity
          </h2>
          <p className="section-description">
            What happened in {workspaceName || "this workspace"}.
          </p>
        </div>
      </div>

      {error ? (
        <p role="alert" className="feedback feedback-error">{error}</p>
      ) : activities.length > 0 ? (
        <ul className="activity-list">
          {activities.map((activity) => (
            <li key={activity.id} className="activity-row">
              <span className="activity-actor">
                {activity.actor?.name || activity.actor?.email || "Someone"}
              </span>
              <span>{actionLabels[activity.type] || "made a change"}</span>
              <span className="activity-target">{targetLabel(activity)}</span>
              <time dateTime={activity.createdAt}>{formatDate(activity.createdAt)}</time>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <p className="empty-state-copy">No activity has been recorded yet.</p>
        </div>
      )}
    </section>
  );
}
