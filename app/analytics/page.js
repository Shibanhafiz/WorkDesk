"use client";

import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import TaskLoadState from "../components/TaskLoadState";
import { useTasks } from "../lib/useTasks";
import { calculateTaskMetrics } from "../lib/taskInsights";

const statusItems = [
  { value: "TODO", label: "To do", tone: "status-todo" },
  { value: "IN_PROGRESS", label: "In progress", tone: "status-in-progress" },
  { value: "DONE", label: "Completed", tone: "status-done" },
];

const priorityItems = [
  { value: "LOW", label: "Low", tone: "priority-low" },
  { value: "MEDIUM", label: "Medium", tone: "priority-medium" },
  { value: "HIGH", label: "High", tone: "priority-high" },
];

function DistributionPanel({ number, heading, items, counts, total }) {
  return (
    <section aria-label={`${heading} distribution`} className="section-block">
      <div className="section-heading-row">
        <div>
          <p className="section-kicker">{number} / DISTRIBUTION</p>
          <h2 className="section-title">{heading}</h2>
          <p className="section-description">
            Counts come from the current task list.
          </p>
        </div>
      </div>
      <div className="distribution-list">
        {items.map((item) => {
          const count = counts[item.value];
          const percentage = total ? Math.round((count / total) * 100) : 0;

          return (
            <div key={item.value} className="distribution-row">
              <div className="distribution-copy">
                <strong>{item.label}</strong>
                <span className="distribution-count">
                  {count} · {percentage}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`${item.label}: ${count} tasks`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentage}
                className="progress-track"
              >
                <div
                  className={`progress-fill ${item.tone}`}
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
  const stats = [
    {
      label: "Total tasks",
      value: metrics.total,
      detail: "Saved in this workspace",
    },
    {
      label: "Completed",
      value: metrics.completed,
      detail: "Marked complete",
    },
    {
      label: "Pending",
      value: metrics.total - metrics.completed,
      detail: "To do or in progress",
    },
    {
      label: "Completion",
      value: `${metrics.completionPercentage}%`,
      detail: "Of all recorded tasks",
    },
  ];

  return (
    <div className="page-frame">
      <PageHeader
        number="05"
        title="Analytics"
        description="A measured summary of task status and priority across the workspace."
        meta="LIVE SUMMARY · DATABASE-BACKED TASKS"
      />

      <TaskLoadState
        isLoading={isLoading}
        error={error}
        onRetry={reloadTasks}
      >
        <section aria-label="Task totals" className="metric-grid">
          {stats.map((stat, index) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              detail={stat.detail}
              accent={index === 0 || index === 3}
            />
          ))}
        </section>

        <div className="analytics-grid">
          <DistributionPanel
            number="01"
            heading="Status distribution"
            items={statusItems}
            counts={{
              TODO: metrics.todo,
              IN_PROGRESS: metrics.inProgress,
              DONE: metrics.completed,
            }}
            total={metrics.total}
          />
          <DistributionPanel
            number="02"
            heading="Priority distribution"
            items={priorityItems}
            counts={metrics.priorities}
            total={metrics.total}
          />
        </div>
      </TaskLoadState>
    </div>
  );
}
