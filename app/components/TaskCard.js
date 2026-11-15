const statusStyles = {
  "To Do": "bg-slate-100 text-slate-700",
  "In Progress": "bg-blue-50 text-blue-700",
  Completed: "bg-emerald-50 text-emerald-700",
};

const priorityStyles = {
  High: "bg-rose-50 text-rose-700",
  Medium: "bg-amber-50 text-amber-700",
  Low: "bg-slate-100 text-slate-600",
};

function formatDueDate(dateValue) {
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
    <article
      id={`task-${task.id}`}
      className="density-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="wrap-anywhere font-semibold text-slate-900">
            {task.title}
          </h3>
          {task.description && (
            <p className="mt-1.5 wrap-anywhere text-sm leading-6 text-slate-500">
              {task.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onViewTask(task)}
            aria-label={`View details for ${task.title}`}
            className="rounded-md px-2 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => onEdit(task)}
            disabled={isBusy}
            aria-label={`Edit ${task.title}`}
            className="rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(task)}
            disabled={isBusy}
            aria-label={`Delete ${task.title}`}
            className="rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-rose-600"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityStyles[task.priority]}`}
        >
          {task.priority} priority
        </span>
        <label className="sr-only" htmlFor={`status-${task.id}`}>
          Status for {task.title}
        </label>
        <select
          id={`status-${task.id}`}
          value={task.status}
          disabled={isBusy}
          onChange={(event) => onStatusChange(task.id, event.target.value)}
          className={`rounded-full border-0 py-1 pl-2.5 pr-7 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${statusStyles[task.status]}`}
        >
          {statuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-slate-500">
          {task.dueDate ? `Due ${formatDueDate(task.dueDate)}` : "No due date"}
        </span>
      </div>
    </article>
  );
}
