"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "../components/PageHeader";
import LifecycleActionDialog from "../components/LifecycleActionDialog";
import { useSession } from "../components/SessionProvider";
import { useWorkspaces } from "../lib/useWorkspaces";
import { useTasks } from "../lib/useTasks";
import {
  STATUS_LABELS,
  STATUS_TONES,
  availableLifecycleActions,
} from "../lib/taskLifecycle";
import {
  filterAssignedTasks,
  summarizeAssignedTasks,
  isOverdue,
} from "../lib/myTasks";

const priorityLabels = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };

const groups = [
  { key: "todo", label: "To do", statuses: ["TODO", "REOPENED"] },
  {
    key: "progress",
    label: "In progress",
    statuses: ["IN_PROGRESS", "TESTING", "TESTING_FAILED"],
  },
  { key: "done", label: "Completed", statuses: ["DONE"] },
];

function formatDate(value) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(`${String(value).slice(0, 10)}T00:00:00`),
  );
}

export default function MyTasksPage() {
  const { user } = useSession();
  const { workspaces } = useWorkspaces();
  const {
    tasks,
    todayDateKey,
    isLoading,
    error,
    reloadTasks,
  } = useTasks();
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [lifecycle, setLifecycle] = useState(null);
  const [actionError, setActionError] = useState("");
  const [feedback, setFeedback] = useState(null);

  const assignedTasks = filterAssignedTasks(tasks, {
    userId: user?.id,
    todayDateKey,
  });
  const summary = summarizeAssignedTasks(tasks, user?.id, todayDateKey);
  const projects = [
    ...new Map(
      assignedTasks
        .filter((task) => task.project)
        .map((task) => [task.project.id, task.project.name]),
    ),
  ];
  const workspaceNames = new Map(
    workspaces.map((workspace) => [workspace.id, workspace.name]),
  );

  const visibleTasks = filterAssignedTasks(tasks, {
    userId: user?.id,
    todayDateKey,
    search,
    status: statusFilter,
    priority: priorityFilter,
    project: projectFilter,
    due: dueFilter,
  });

  function actionsFor(task) {
    return availableLifecycleActions({
      status: task.status,
      assigneeId: task.assignee?.id ?? null,
      userId: user?.id,
      role: user?.role,
    });
  }

  async function performAction({ action, reason, reviewComment }) {
    if (!lifecycle) return;
    setActionError("");
    try {
      const response = await fetch(
        `/api/tasks/${lifecycle.task.id}/transitions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reason, reviewComment }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to update task.");
      await reloadTasks();
      setFeedback({ type: "success", message: `Task updated: ${action}.` });
      setLifecycle(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Unable to update task.");
    }
  }

  return (
    <div className="page-frame">
      <PageHeader
        number="08"
        title="My Tasks"
        description="Tasks assigned to you across the workspaces you can access."
        meta={`${summary.assigned} ASSIGNED · ${summary.overdue} OVERDUE · ${summary.upcoming} UPCOMING`}
      />

      {feedback ? (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={`feedback${feedback.type === "error" ? " feedback-error" : ""}`}
        >
          {feedback.message}
        </div>
      ) : null}

      <section aria-labelledby="my-tasks-heading">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">01 / ASSIGNMENTS</p>
            <h2 id="my-tasks-heading" className="section-title">
              Your assignments
            </h2>
            <p className="section-description">
              Showing {visibleTasks.length} of {assignedTasks.length} assigned tasks
              {summary.overdue > 0 ? ` · ${summary.overdue} overdue` : ""}
              {summary.upcoming > 0 ? ` · ${summary.upcoming} due soon` : ""}
            </p>
          </div>
        </div>

        <div className="assignment-filters">
          <label>
            <span className="sr-only">Search assigned tasks</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tasks"
              className="form-control"
            />
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="form-control"
            >
              <option value="all">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by priority</span>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="form-control"
            >
              <option value="all">All priorities</option>
              {Object.entries(priorityLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by project</span>
            <select
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              className="form-control"
            >
              <option value="all">All projects</option>
              <option value="none">No project</option>
              {projects.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by due date</span>
            <select
              value={dueFilter}
              onChange={(event) => setDueFilter(event.target.value)}
              className="form-control"
            >
              <option value="all">Any due date</option>
              <option value="overdue">Overdue</option>
              <option value="upcoming">Due within 7 days</option>
              <option value="scheduled">Scheduled</option>
              <option value="none">No due date</option>
            </select>
          </label>
        </div>

        {isLoading ? (
          <p role="status" className="state-panel">Loading your tasks...</p>
        ) : error ? (
          <div className="state-panel">
            <p role="alert" className="state-error">
              Tasks could not be loaded. {error}
            </p>
            <button type="button" onClick={reloadTasks} className="text-link-button">
              Try again
            </button>
          </div>
        ) : (
          groups.map((group) => {
            const groupTasks = visibleTasks.filter((task) =>
              group.statuses.includes(task.status),
            );
            return (
              <div key={group.key} className="my-task-group">
                <div className="section-heading-row">
                  <h3 className="section-title">
                    {group.label} <span className="section-kicker">({groupTasks.length})</span>
                  </h3>
                </div>
                {groupTasks.length > 0 ? (
                  <div className="assignment-table">
                    <div className="assignment-row assignment-head" aria-hidden="true">
                      <span>Task</span>
                      <span>Project</span>
                      <span>Priority</span>
                      <span>Status</span>
                      <span>Due date</span>
                      <span>Workspace</span>
                    </div>
                    {groupTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`assignment-row${isOverdue(task, todayDateKey) ? " is-overdue" : ""}`}
                      >
                        <Link href={`/tasks?task=${task.id}`} className="assignment-title">
                          {task.title}
                        </Link>
                        <span>{task.project?.name ?? "No project"}</span>
                        <span className={`priority-tag priority-${String(task.priority).toLowerCase()}`}>
                          {priorityLabels[task.priority] ?? task.priority}
                        </span>
                        <span className={`status-tag ${STATUS_TONES[task.status] ?? ""}`}>
                          {STATUS_LABELS[task.status] ?? task.status}
                        </span>
                        <span>{formatDate(task.dueDate)}</span>
                        <span className="assignment-row-actions">
                          <span>{workspaceNames.get(task.workspaceId) ?? "Workspace"}</span>
                          {actionsFor(task).map((action) => (
                            <button
                              key={action.key}
                              type="button"
                              className={`record-action${action.danger ? " record-action-danger" : ""}`}
                              onClick={() => {
                                setLifecycle({ task, action: action.key });
                                setActionError("");
                              }}
                            >
                              {action.label}
                            </button>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <p className="empty-state-copy">
                      {assignedTasks.length
                        ? `No ${group.label.toLowerCase()} tasks match these filters.`
                        : "Tasks assigned to you will appear here."}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {lifecycle ? (
        <LifecycleActionDialog
          action={lifecycle.action}
          task={lifecycle.task}
          onSubmit={performAction}
          onClose={() => setLifecycle(null)}
          error={actionError}
        />
      ) : null}
    </div>
  );
}
