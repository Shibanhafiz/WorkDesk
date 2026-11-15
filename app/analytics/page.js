"use client";

import StatCard from "../components/StatCard";
import TaskLoadState from "../components/TaskLoadState";
import { useTasks } from "../lib/useTasks";
import { calculateTaskMetrics } from "../lib/taskInsights";

const statusItems = [
  { value: "TODO", label: "To do", color: "bg-slate-500" },
  { value: "IN_PROGRESS", label: "In progress", color: "bg-blue-600" },
  { value: "DONE", label: "Completed", color: "bg-emerald-600" },
];

const priorityItems = [
  { value: "LOW", label: "Low", color: "bg-slate-500" },
  { value: "MEDIUM", label: "Medium", color: "bg-amber-500" },
  { value: "HIGH", label: "High", color: "bg-rose-500" },
];

function DistributionPanel({ heading, items, counts, total }) {
  return (
    <section
      aria-label={`${heading} distribution`}
      className="density-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40"
    >
      <h2 className="text-lg font-semibold text-slate-900">{heading}</h2>
      <p className="mt-1 text-sm text-slate-500">
        Counts come from the current task list.
      </p>
      <div className="mt-6 space-y-5">
        {items.map((item) => {
          const count = counts[item.value];
          const percentage = total ? Math.round((count / total) * 100) : 0;

          return (
            <div key={item.value}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-700">{item.label}</span>
                <span className="text-slate-500">
                  {count} ({percentage}%)
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`${item.label}: ${count} tasks`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentage}
                className="h-2 overflow-hidden rounded-full bg-slate-100"
              >
                <div
                  className={`h-full rounded-full ${item.color}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function AnalyticsPage() {
  const { tasks, todayDateKey, isLoading, error, reloadTasks } = useTasks();
  const metrics = calculateTaskMetrics(tasks, todayDateKey);

  return (
    <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Workspace
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            A live summary of tasks saved in your workspace.
          </p>
        </header>

        <TaskLoadState
          isLoading={isLoading}
          error={error}
          onRetry={reloadTasks}
        >
          {tasks.length === 0 ? (
            <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              No task data is available yet. Create a task to populate these
              summaries.
            </div>
          ) : null}
          <div className="density-grid mb-6 grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Total tasks"
              value={metrics.total}
              detail="Database-backed records"
              accent
            />
            <StatCard
              label="Completed"
              value={`${metrics.completionPercentage}%`}
              detail={`${metrics.completed} completed task${metrics.completed === 1 ? "" : "s"}`}
            />
          </div>
          <div className="density-grid grid gap-6 xl:grid-cols-2">
            <DistributionPanel
              heading="Task distribution by status"
              items={statusItems}
              counts={{
                TODO: metrics.todo,
                IN_PROGRESS: metrics.inProgress,
                DONE: metrics.completed,
              }}
              total={metrics.total}
            />
            <DistributionPanel
              heading="Task distribution by priority"
              items={priorityItems}
              counts={metrics.priorities}
              total={metrics.total}
            />
          </div>
        </TaskLoadState>
      </div>
    </div>
  );
}
