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
    <div className="fixed inset-0 z-20 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-details-heading"
        className="my-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Task details
            </p>
            <h2
              id="task-details-heading"
              className="mt-1 wrap-anywhere text-xl font-semibold text-slate-900"
            >
              {task.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close task details"
            className="rounded-md px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <p className="mt-5 wrap-anywhere whitespace-pre-wrap text-sm leading-6 text-slate-600">
          {task.description || "No description provided."}
        </p>

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-200 pt-5 text-sm">
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd className="mt-1 font-medium text-slate-900">{task.status}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Priority</dt>
            <dd className="mt-1 font-medium text-slate-900">{task.priority}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Due date</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {formatDate(task.dueDate)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Created</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {formatTimestamp(task.createdAt)}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-slate-500">Last updated</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {formatTimestamp(task.updatedAt)}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
