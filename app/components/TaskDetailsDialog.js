import Dialog from "./Dialog";
import Link from "next/link";
import {
  getSpecializationLabel,
  getSpecializationTone,
} from "../lib/workspacePermissions";
import {
  STATUS_LABELS,
  STATUS_TONES,
} from "../lib/taskLifecycle";
import TaskCollaboration from "./TaskCollaboration";

function formatDate(value) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

function formatTimestamp(value) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function TaskDetailsDialog({
  task,
  onClose,
  availableActions = [],
  onAction,
  isBusy = false,
  actionError = "",
  workspaceId = null,
  userId = null,
  canManage = false,
}) {
  const history = Array.isArray(task.history) ? task.history : [];

  return (
    <Dialog labelledBy="task-details-heading" onClose={onClose}>
      <header className="dialog-top-row">
        <div className="task-record-main">
          <p className="section-kicker">TASK REGISTER / RECORD</p>
          <h2 id="task-details-heading" className="dialog-heading">
            {task.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close task details"
          className="dialog-close"
        >
          Close
        </button>
      </header>

      <p className="details-copy">
        {task.description || "No description provided."}
      </p>

      <dl className="details-list">
        <div>
          <dt>Status</dt>
          <dd>
            <span className={`status-tag ${STATUS_TONES[task.status] ?? "status-todo"}`}>
              {STATUS_LABELS[task.status] ?? task.status}
            </span>
          </dd>
        </div>
        <div>
          <dt>Priority</dt>
          <dd>{task.priority}</dd>
        </div>
        <div>
          <dt>Reopen count</dt>
          <dd>{task.reopenCount ?? 0}</dd>
        </div>
        <div>
          <dt>Due date</dt>
          <dd>{formatDate(task.dueDate)}</dd>
        </div>
        <div>
          <dt>Project</dt>
          <dd>
            {task.project ? (
              <Link href={`/projects/${task.project.id}`} className="task-link">
                {task.project.name}
              </Link>
            ) : (
              "No project"
            )}
          </dd>
        </div>
        <div>
          <dt>Assignee</dt>
          <dd>
            {task.assignee ? (
              <>
                {task.assignee.name || task.assignee.email}
                {task.assignee.specialization ? (
                  <span
                    className={`priority-tag ${
                      getSpecializationTone(task.assignee.specialization)
                    }`}
                    style={{ fontSize: "10px", marginLeft: "6px" }}
                  >
                    {getSpecializationLabel(task.assignee.specialization)}
                  </span>
                ) : null}
              </>
            ) : (
              "Unassigned"
            )}
          </dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatTimestamp(task.createdAt)}</dd>
        </div>
        <div className="details-wide">
          <dt>Last updated</dt>
          <dd>{formatTimestamp(task.updatedAt)}</dd>
        </div>
      </dl>

      {availableActions.length > 0 ? (
        <section aria-labelledby="task-actions-heading" className="lifecycle-actions">
          <h3 id="task-actions-heading" className="section-title">
            Workflow actions
          </h3>
          {actionError ? (
            <p role="alert" className="feedback feedback-error">
              {actionError}
            </p>
          ) : null}
          <div className="form-actions">
            {availableActions.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => onAction(task, action.key)}
                disabled={isBusy}
                className={
                  action.danger ? "button-danger" : "button-secondary"
                }
              >
                {action.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="task-history-heading" className="task-history">
        <h3 id="task-history-heading" className="section-title">
          Task history
        </h3>
        {history.length === 0 ? (
          <p className="section-description">No status changes recorded yet.</p>
        ) : (
          <ol className="history-timeline">
            {history.map((entry) => (
              <li key={entry.id} className="history-entry">
                <div className="history-entry-header">
                  <strong>
                    {entry.fromStatus
                      ? `${STATUS_LABELS[entry.fromStatus] ?? entry.fromStatus} → `
                      : ""}
                    {STATUS_LABELS[entry.toStatus] ?? entry.toStatus}
                  </strong>
                  <time dateTime={entry.createdAt}>
                    {formatTimestamp(entry.createdAt)}
                  </time>
                </div>
                <p className="section-description">
                  by {entry.actor?.name || entry.actor?.email || "Unknown"}
                </p>
                {entry.reason ? (
                  <p className="details-copy">Reason: {entry.reason}</p>
                ) : null}
                {entry.reviewComment ? (
                  <p className="details-copy">
                    Review: {entry.reviewComment}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      {workspaceId && userId ? (
        <TaskCollaboration
          taskId={task.id}
          workspaceId={workspaceId}
          userId={userId}
          canManage={canManage}
        />
      ) : null}
    </Dialog>
  );
}
