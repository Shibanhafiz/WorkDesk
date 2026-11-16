import Dialog from "./Dialog";
import Link from "next/link";

const statusLabels = {
  TODO: "To do",
  "To Do": "To do",
  IN_PROGRESS: "In progress",
  "In Progress": "In progress",
  DONE: "Completed",
  Completed: "Completed",
};

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

export default function TaskDetailsDialog({ task, onClose }) {
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
          <dd>{statusLabels[task.status] ?? task.status}</dd>
        </div>
        <div>
          <dt>Priority</dt>
          <dd>{task.priority}</dd>
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
    </Dialog>
  );
}
