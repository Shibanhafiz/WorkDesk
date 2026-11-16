import Link from "next/link";

const statusClasses = {
  "To Do": "status-todo",
  "In Progress": "status-in-progress",
  Completed: "status-done",
};

const priorityClasses = {
  High: "priority-high",
  Medium: "priority-medium",
  Low: "priority-low",
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
  statuses,
  onEdit,
  onViewTask,
  onDelete,
  onStatusChange,
  isBusy = false,
}) {
  return (
    <article id={`task-${task.id}`} className="task-register-row">
      <div className="task-record-main">
        <h3 className="task-summary-title">{task.title}</h3>
        {task.description ? (
          <p className="task-description">{task.description}</p>
        ) : null}
        <div className="task-summary-footer">
          <span className={`priority-tag ${priorityClasses[task.priority]}`}>
            {task.priority} priority
          </span>
          {task.project ? (
            <Link
              href={`/projects/${task.project.id}`}
              className="task-project-link"
            >
              {task.project.name}
              {task.project.status === "ARCHIVED" ? " · Archived" : ""}
            </Link>
          ) : (
            <span className="task-project-unassigned">Unassigned</span>
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
        <label className="sr-only" htmlFor={`status-${task.id}`}>
          Status for {task.title}
        </label>
        <select
          id={`status-${task.id}`}
          value={task.status}
          disabled={isBusy}
          onChange={(event) => onStatusChange(task.id, event.target.value)}
          className={`status-control ${statusClasses[task.status]}`}
        >
          {statuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
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
