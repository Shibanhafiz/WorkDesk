import Link from "next/link";

const priorityStyles = {
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-amber-50 text-amber-700",
  HIGH: "bg-rose-50 text-rose-700",
};

const statusStyles = {
  TODO: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  DONE: "bg-emerald-50 text-emerald-700",
};

const priorityLabels = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };
const statusLabels = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
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
    <article className="density-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href={`/tasks#task-${task.id}`}
            className="wrap-anywhere font-semibold text-slate-900 hover:text-blue-700"
          >
            {task.title}
          </Link>
          {task.description && (
            <p className="mt-1 wrap-anywhere text-sm leading-6 text-slate-500">
              {task.description}
            </p>
          )}
        </div>
        <p className="shrink-0 text-xs text-slate-500">
          {formatDueDate(task.dueDate)}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityStyles[task.priority]}`}
        >
          {priorityLabels[task.priority]} priority
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[task.status]}`}
        >
          {statusLabels[task.status]}
        </span>
        <Link
          href={`/tasks#task-${task.id}`}
          className="ml-auto text-xs font-semibold text-blue-700 underline underline-offset-2"
        >
          View task
        </Link>
      </div>
    </article>
  );
}
