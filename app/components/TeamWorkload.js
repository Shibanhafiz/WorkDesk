"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Dialog from "./Dialog";
import { STATUS_LABELS } from "../lib/taskLifecycle";
import { WORKLOAD_STATUS_GROUPS } from "../lib/teamWorkload";

const priorityLabels = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };

function isOverdue(task, todayDateKey) {
  return (
    task.status !== "DONE" &&
    Boolean(task.dueDate) &&
    String(task.dueDate).slice(0, 10) < (todayDateKey ?? "")
  );
}

export default function TeamWorkload({
  workspaceId = null,
  members,
  tasks,
  todayDateKey,
  workspaceName,
  canManage = false,
  onTasksChanged,
}) {
  const [selectedMemberId, setSelectedMemberId] = useState(null);
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statFilter, setStatFilter] = useState("all");
  const [error, setError] = useState("");
  const [busyTaskId, setBusyTaskId] = useState(null);
  const [workload, setWorkload] = useState(null);
  const [workloadError, setWorkloadError] = useState("");
  const [workloadVersion, setWorkloadVersion] = useState(0);

  useEffect(() => {
    if (!workspaceId) return;

    let isMounted = true;

    fetch(`/api/workspaces/${workspaceId}/workload`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || "Unable to load team workload.");
        }
        return data;
      })
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setWorkload(data);
          setWorkloadError("");
        }
      })
      .catch((loadError) => {
        if (isMounted) {
          setWorkloadError(
            loadError instanceof Error ? loadError.message : "Unable to load team workload.",
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [workspaceId, workloadVersion]);

  const rows = workload ?? [];
  const isWorkloadLoading = workload === null && !workloadError;

  const selected = rows.find((row) => row.userId === selectedMemberId) ?? null;
  const projects = [...new Map(
    tasks.filter((task) => task.project).map((task) => [task.project.id, task.project.name]),
  )];

  function openMember(memberId, filter = "all") {
    setSelectedMemberId(memberId);
    setStatFilter(filter);
    setProjectFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
    setError("");
  }

  const selectedTasks = selected
    ? tasks
        .filter((task) => task.assigneeId === selected.userId)
        .filter((task) => {
          if (statFilter === "todo") return WORKLOAD_STATUS_GROUPS.todo.includes(task.status);
          if (statFilter === "inProgress") return WORKLOAD_STATUS_GROUPS.inProgress.includes(task.status);
          if (statFilter === "completed") return task.status === "DONE";
          if (statFilter === "overdue") return isOverdue(task, todayDateKey);
          return true;
        })
        .filter((task) => projectFilter === "all" || task.projectId === projectFilter)
        .filter((task) => statusFilter === "all" || task.status === statusFilter)
        .filter((task) => priorityFilter === "all" || task.priority === priorityFilter)
    : [];

  async function reassign(task, assigneeId) {
    setBusyTaskId(task.id);
    setError("");
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId: assigneeId || null }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to reassign task.");
      await onTasksChanged?.();
      setWorkloadVersion((version) => version + 1);
      setSelectedMemberId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reassign task.");
    } finally {
      setBusyTaskId(null);
    }
  }

  const statColumns = [
    { key: "total", label: "Assigned" },
    { key: "todo", label: "To do" },
    { key: "inProgress", label: "In progress" },
    { key: "completed", label: "Completed" },
    { key: "overdue", label: "Overdue" },
  ];

  return (
    <section aria-labelledby="workload-heading">
      <div className="section-heading-row">
        <div>
          <p className="section-kicker">03 / WORKLOAD</p>
          <h2 id="workload-heading" className="section-title">
            Team workload
          </h2>
          <p className="section-description">
            Assignment counts for {workspaceName || "this workspace"}. Select a member or count to inspect tasks.
          </p>
        </div>
      </div>

      {isWorkloadLoading ? (
        <p role="status" className="state-panel">Loading workload...</p>
      ) : workloadError ? (
        <div className="state-panel">
          <p role="alert" className="state-error">{workloadError}</p>
        </div>
      ) : rows.length > 0 ? (
        <div className="assignment-table">
          <div className="assignment-row assignment-head" aria-hidden="true">
            <span>Member</span>
            {statColumns.map((column) => (
              <span key={column.key}>{column.label}</span>
            ))}
          </div>
          {rows.map((row) => (
            <div key={row.userId} className="assignment-row">
              <button
                type="button"
                className="workload-member workload-link"
                onClick={() => openMember(row.userId)}
              >
                {row.avatarUrl ? (
                  <Image
                    src={row.avatarUrl}
                    alt=""
                    width={28}
                    height={28}
                    unoptimized
                    className="assignee-avatar"
                  />
                ) : (
                  <span className="assignee-avatar" aria-hidden="true">
                    {(row.name || row.email || "?").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span>{row.name || row.email}</span>
              </button>
              {statColumns.map((column) => {
                const value = row[column.key] ?? 0;
                return (
                  <button
                    key={column.key}
                    type="button"
                    className="workload-stat"
                    onClick={() => openMember(row.userId, column.key)}
                    aria-label={`${column.label} tasks for ${row.name || row.email}: ${value}`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p className="empty-state-copy">No members are visible in this workspace.</p>
        </div>
      )}

      {selected ? (
        <Dialog labelledBy="member-detail-heading" onClose={() => setSelectedMemberId(null)}>
          <div>
            <p className="section-kicker">WORKLOAD / MEMBER</p>
            <h2 id="member-detail-heading" className="dialog-heading">
              {selected.name || selected.email}
            </h2>
            <p className="dialog-description">
              {selected.total} assigned · {selected.todo} to do · {selected.inProgress} in progress · {selected.completed} completed · {selected.overdue} overdue
            </p>
          </div>

          {error ? (
            <p role="alert" className="feedback feedback-error dialog-feedback">{error}</p>
          ) : null}

          <div className="assignment-filters">
            <label>
              <span className="sr-only">Filter by project</span>
              <select
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
                className="form-control"
              >
                <option value="all">All projects</option>
                {projects.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
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
          </div>

          {selectedTasks.length > 0 ? (
            <div className="member-task-list">
              {selectedTasks.map((task) => (
                <div key={task.id} className="member-task-row">
                  <div>
                    <strong>{task.title}</strong>
                    <span className="section-description">
                      {task.project?.name ?? "No project"} · {STATUS_LABELS[task.status] ?? task.status} · {priorityLabels[task.priority] ?? task.priority}
                      {isOverdue(task, todayDateKey) ? " · Overdue" : ""}
                    </span>
                  </div>
                  {canManage ? (
                    <select
                      className="form-control"
                      value={task.assigneeId ?? ""}
                      disabled={busyTaskId === task.id}
                      onChange={(event) => reassign(task, event.target.value)}
                    >
                      {members.map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.name || member.email}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="empty-state-title">No matching assignments</p>
              <p className="empty-state-copy">
                This member has no tasks matching the selected filters.
              </p>
            </div>
          )}

          <div className="form-actions">
            <button type="button" onClick={() => setSelectedMemberId(null)} className="button-secondary">
              Close
            </button>
          </div>
        </Dialog>
      ) : null}
    </section>
  );
}
