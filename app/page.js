"use client";

import Link from "next/link";
import StatCard from "./components/StatCard";
import TaskLoadState from "./components/TaskLoadState";
import TaskSummaryCard from "./components/TaskSummaryCard";
import { usePreferences } from "./components/PreferencesProvider";
import { useTasks } from "./lib/useTasks";
import { calculateTaskMetrics, sortTasks } from "./lib/taskInsights";

const priorityItems = [
  { value: "LOW", label: "Low", color: "bg-slate-400" },
  { value: "MEDIUM", label: "Medium", color: "bg-amber-500" },
  { value: "HIGH", label: "High", color: "bg-rose-500" },
];

export default function OverviewPage() {
  const { preferences } = usePreferences();
  const { tasks, todayDateKey, isLoading, error, reloadTasks } = useTasks();
  const metrics = calculateTaskMetrics(tasks, todayDateKey);
  const recentTasks = sortTasks(tasks, "newest").slice(0, 4);
  const stats = [
    { label: "Total tasks", value: metrics.total, detail: "Across all statuses" },
    { label: "To do", value: metrics.todo, detail: "Ready to get started" },
    {
      label: "In progress",
      value: metrics.inProgress,
      detail: "Currently underway",
    },
    {
      label: "Completed",
      value: metrics.completed,
      detail: "Finished tasks",
    },
    {
      label: "Completion",
      value: `${metrics.completionPercentage}%`,
      detail: "Tasks marked complete",
    },
    {
      label: "Overdue",
      value: metrics.overdue,
      detail: "Open tasks past their due date",
    },
    {
      label: "Upcoming",
      value: metrics.upcoming,
      detail: "Open tasks due today or later",
    },
  ];

  return (
    <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Your workspace
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              {preferences.displayName
                ? `Welcome back, ${preferences.displayName}`
                : "Welcome back"}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Here&apos;s what&apos;s happening with your work today.
            </p>
          </div>
          <Link
            href="/tasks"
            className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:self-auto"
          >
            <span aria-hidden="true" className="text-lg leading-none">+</span>
            Add Task
          </Link>
        </header>

        <TaskLoadState
          isLoading={isLoading}
          error={error}
          onRetry={reloadTasks}
        >
          <section aria-label="Task statistics" className="mb-8">
            <div className="density-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat, index) => (
                <StatCard
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  detail={stat.detail}
                  accent={index === 0}
                />
              ))}
            </div>
          </section>

          <div className="density-grid grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
            <section aria-labelledby="recent-tasks-heading">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h2
                    id="recent-tasks-heading"
                    className="text-xl font-semibold tracking-tight text-slate-900"
                  >
                    Recent tasks
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    The latest tasks in your workspace.
                  </p>
                </div>
                <Link
                  href="/tasks"
                  className="shrink-0 text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  View all
                </Link>
              </div>

              {recentTasks.length > 0 ? (
                <div className="density-grid grid gap-3">
                  {recentTasks.map((task) => (
                    <TaskSummaryCard key={task.id} task={task} />
                  ))}
                </div>
              ) : (
                <div className="density-card rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
                  <p className="font-semibold text-slate-800">No tasks yet</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Create a task to see your recent work here.
                  </p>
                </div>
              )}
            </section>

            <section
              aria-labelledby="priority-summary-heading"
              className="density-card rounded-xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40"
            >
              <div className="mb-5">
                <h2
                  id="priority-summary-heading"
                  className="text-lg font-semibold text-slate-900"
                >
                  Priority summary
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Task counts by priority.
                </p>
              </div>
              <div className="space-y-5">
                {priorityItems.map((item) => {
                  const count = metrics.priorities[item.value];
                  const percentage = metrics.total
                    ? Math.round((count / metrics.total) * 100)
                    : 0;

                  return (
                    <div key={item.value}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">
                          {item.label}
                        </span>
                        <span className="text-slate-500">{count}</span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={`${item.label} priority tasks`}
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
              <Link
                href="/analytics"
                className="mt-6 inline-block text-sm font-semibold text-blue-700 hover:text-blue-800"
              >
                View analytics
              </Link>
            </section>
          </div>
        </TaskLoadState>
      </div>
    </div>
  );
}
