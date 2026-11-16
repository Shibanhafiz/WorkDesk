import Link from "next/link";

const priorityClasses = {
  LOW: "priority-low",
  MEDIUM: "priority-medium",
  HIGH: "priority-high",
};

const statusClasses = {
  TODO: "status-todo",
  IN_PROGRESS: "status-in-progress",
  DONE: "status-done",
};

const priorityLabels = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };
const statusLabels = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Completed",
};

function formatDueDate(value) {
  if (!value) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

export default function TaskSummaryCard({ task }) {
  return (
    <article className="task-summary-row">
      <div className="task-summary-main">
        <Link
          href={`/tasks#task-${task.id}`}
          className="task-summary-title"
        >
          {task.title}
        </Link>
        {task.description ? (
          <p className="task-summary-description">{task.description}</p>
        ) : null}
        <div className="task-summary-footer">
          <span className={`priority-tag ${priorityClasses[task.priority]}`}>
            {priorityLabels[task.priority]} priority
          </span>
          <span className={`status-tag ${statusClasses[task.status]}`}>
            {statusLabels[task.status]}
          </span>
          {task.project ? (
            <Link href={`/projects/${task.project.id}`} className="task-link">
              {task.project.name}
            </Link>
          ) : (
            <span className="task-project-unassigned">Unassigned</span>
          )}
          <Link href={`/tasks#task-${task.id}`} className="task-link">
            View task
          </Link>
        </div>
      </div>
      <time className="task-summary-date" dateTime={task.dueDate ?? undefined}>
        {formatDueDate(task.dueDate)}
      </time>
    </article>
  );
}
