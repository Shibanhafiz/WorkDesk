"use client";

import TaskLoadState from "../components/TaskLoadState";
import TaskSummaryCard from "../components/TaskSummaryCard";
import { useTasks } from "../lib/useTasks";
import { groupTasksByDueDate } from "../lib/taskInsights";

function TaskGroup({ heading, description, tasks, emptyMessage }) {
  return (
    <section aria-labelledby={`${heading.toLowerCase().replaceAll(" ", "-")}-heading`}>
      <div className="mb-4">
        <h2
          id={`${heading.toLowerCase().replaceAll(" ", "-")}-heading`}
          className="text-xl font-semibold tracking-tight text-slate-900"
        >
          {heading} <span className="text-sm font-medium text-slate-500">({tasks.length})</span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {tasks.length > 0 ? (
        <div className="density-grid grid gap-3 md:grid-cols-2">
          {tasks.map((task) => (
            <TaskSummaryCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <p className="density-card rounded-xl border border-dashed border-slate-300 bg-white px-5 py-7 text-sm text-slate-500">
          {emptyMessage}
        </p>
      )}
    </section>
  );
}

export default function UpcomingPage() {
  const { tasks, todayDateKey, isLoading, error, reloadTasks } = useTasks();
  const groups = groupTasksByDueDate(tasks, todayDateKey);

  return (
    <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Workspace
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Upcoming
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Due dates are compared with today&apos;s local date. Completed dated
            tasks are not counted as overdue or upcoming.
          </p>
        </header>

        <TaskLoadState
          isLoading={isLoading}
          error={error}
          onRetry={reloadTasks}
        >
          {tasks.length === 0 ? (
            <div className="density-card rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <h2 className="font-semibold text-slate-800">No tasks yet</h2>
              <p className="mt-1 text-sm text-slate-500">
                Tasks with due dates will appear here.
              </p>
            </div>
          ) : (
            <div className="density-grid grid gap-8">
              <TaskGroup
                heading="Overdue"
                description="Open tasks with a due date before today."
                tasks={groups.overdue}
                emptyMessage="No overdue tasks."
              />
              <TaskGroup
                heading="Upcoming tasks"
                description="Open tasks due today or later, sorted by due date."
                tasks={groups.upcoming}
                emptyMessage="No upcoming tasks with a due date."
              />
              <TaskGroup
                heading="No due date"
                description="Tasks without a scheduled due date."
                tasks={groups.unscheduled}
                emptyMessage="Every task has a due date."
              />
            </div>
          )}
        </TaskLoadState>
      </div>
    </div>
  );
}
