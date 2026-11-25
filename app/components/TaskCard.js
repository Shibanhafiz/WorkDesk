import Link from "next/link";
import {
  STATUS_LABELS,
  STATUS_TONES,
} from "../lib/taskLifecycle";

const priorityClasses = {
  HIGH: "priority-high",
  MEDIUM: "priority-medium",
  LOW: "priority-low",
};

function formatDueDate(dateValue) {
  if (!dateValue) {
    return "No due date";
  }

  const date = new Date(`${dateValue}T00:00:00`);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function TaskCard({
  task,
  onEdit,
  onViewTask,
  onDelete,
  onAction,
  availableActions = [],
  isBusy = false,
}) {
  const statusLabel = STATUS_LABELS[task.status] ?? task.status;
  const statusTone = STATUS_TONES[task.status] ?? "status-todo";

  return (
    <article id={`task-${task.id}`} className="task-register-row">
      <div className="task-record-main">
        <h3 className="task-summary-title">{task.title}</h3>
        {task.description ? (
          <p className="task-description">{task.description}</p>
        ) : null}
        <div className="task-summary-footer">
          <span className={`status-tag ${statusTone}`} data-status={task.status}>
            {statusLabel}
          </span>
          <span className={`priority-tag ${priorityClasses[task.priority]}`}>
            {task.priority} priority
          </span>
          {task.reopenCount > 0 ? (
            <span className="priority-tag priority-medium">
              Reopened {task.reopenCount}x
            </span>
          ) : null}
          {task.assignee ? (
            <span className="task-assignee" title={task.assignee.email}>
              {task.assignee.name || task.assignee.email}
            </span>
          ) : (
            <span className="task-assignee task-assignee-none">
              Unassigned
            </span>
          )}
          {task.project ? (
            <Link
              href={`/projects/${task.project.id}`}
              className="task-project-link"
            >
              {task.project.name}
              {task.project.status === "ARCHIVED" ? " · Archived" : ""}
            </Link>
          ) : (
            <span className="task-project-unassigned">No project</span>
          )}
          <time
            className="task-summary-date"
            dateTime={task.dueDate ?? undefined}
          >
            {formatDueDate(task.dueDate)}
          </time>
        </div>
      </div>

      <div className="task-record-actions">
        {availableActions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={() => onAction(task, action.key)}
            disabled={isBusy}
            aria-label={`${action.label} ${task.title}`}
            className={`record-action ${action.danger ? "record-action-danger" : ""}`}
          >
            {action.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onViewTask(task)}
          aria-label={`View details for ${task.title}`}
          className="record-action"
        >
          Details
        </button>
        <button
          type="button"
          onClick={() => onEdit(task)}
          disabled={isBusy}
          aria-label={`Edit ${task.title}`}
          className="record-action"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(task)}
          disabled={isBusy}
          aria-label={`Delete ${task.title}`}
          className="record-action record-action-danger"
        >
          Delete
        </button>
      </div>
    </article>
  );
}
