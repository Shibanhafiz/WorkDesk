"use client";

import Link from "next/link";
import PageHeader from "../components/PageHeader";
import TaskLoadState from "../components/TaskLoadState";
import TaskSummaryCard from "../components/TaskSummaryCard";
import { useTasks } from "../lib/useTasks";
import { groupTasksByDueDate } from "../lib/taskInsights";
import { useWorkspaces } from "../lib/useWorkspaces";

function TaskGroup({ number, heading, description, tasks, emptyMessage }) {
  const headingId = `${heading.toLowerCase().replaceAll(" ", "-")}-heading`;

  return (
    <section aria-labelledby={headingId} className="section-block">
      <div className="section-heading-row">
        <div>
          <p className="section-kicker">{number} / DEADLINES</p>
          <h2 id={headingId} className="section-title">
            {heading} <span className="distribution-count">({tasks.length})</span>
          </h2>
          <p className="section-description">{description}</p>
        </div>
      </div>
      {tasks.length > 0 ? (
        <div className="task-list">
          {tasks.map((task) => (
            <TaskSummaryCard key={task.id} task={task} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p className="empty-state-copy">{emptyMessage}</p>
        </div>
      )}
    </section>
  );
}

export default function UpcomingPage() {
  const { currentWorkspace } = useWorkspaces();
  const { tasks, todayDateKey, isLoading, error, reloadTasks } = useTasks(
    currentWorkspace?.id ?? null,
    { pageSize: 100 },
  );
  const groups = groupTasksByDueDate(tasks, todayDateKey);

  return (
    <div className="page-frame">
      <PageHeader
        number="04"
        title="Upcoming"
        description="A date-led view of open work, ordered by when it is due."
        meta="DUE SOON · NEXT 7 DAYS, INCLUDING TODAY"
      />

      <TaskLoadState
        isLoading={isLoading}
        error={error}
        onRetry={reloadTasks}
      >
        {tasks.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-title">No tasks on the schedule</p>
            <p className="empty-state-copy">
              Add a task and assign a due date to see it here.
            </p>
            <Link href="/tasks" className="button-secondary empty-state-action">
              Open task register
            </Link>
          </div>
        ) : (
          <div className="deadline-groups">
            <TaskGroup
              number="01"
              heading="Overdue"
              description="Open tasks with a due date before today."
              tasks={groups.overdue}
              emptyMessage="No overdue tasks."
            />
            <TaskGroup
              number="02"
              heading="Due soon"
              description="Open tasks due today or within the next seven days."
              tasks={groups.dueSoon}
              emptyMessage="Nothing due in the next seven days."
            />
            <TaskGroup
              number="03"
              heading="Upcoming"
              description="Open tasks due more than seven days from today."
              tasks={groups.upcoming}
              emptyMessage="No later deadlines scheduled."
            />
            <TaskGroup
              number="04"
              heading="No due date"
              description="Tasks without a scheduled due date."
              tasks={groups.unscheduled}
              emptyMessage="Every task has a due date."
            />
          </div>
        )}
      </TaskLoadState>
    </div>
  );
}
