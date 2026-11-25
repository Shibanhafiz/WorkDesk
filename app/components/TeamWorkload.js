"use client";

import Image from "next/image";
import { useState } from "react";
import Dialog from "./Dialog";
import { STATUS_LABELS } from "../lib/taskLifecycle";

const priorityLabels = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };

function isOverdue(task, todayDateKey) {
  return (
    task.status !== "DONE" &&
    Boolean(task.dueDate) &&
    String(task.dueDate).slice(0, 10) < (todayDateKey ?? "")
  );
}

export default function TeamWorkload({
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

  const rows = members.map((member) => {
    const memberTasks = tasks.filter((task) => task.assigneeId === member.userId);
    return {
      member,
      total: memberTasks.length,
      inProgress: memberTasks.filter((task) => task.status === "IN_PROGRESS").length,
      completed: memberTasks.filter((task) => task.status === "DONE").length,
      overdue: memberTasks.filter((task) => isOverdue(task, todayDateKey)).length,
    };
  });

  const selected = rows.find((row) => row.member.userId === selectedMemberId) ?? null;
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
        .filter((task) => task.assigneeId === selected.member.userId)
        .filter((task) => {
          if (statFilter === "inProgress") return task.status === "IN_PROGRESS";
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
      setSelectedMemberId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reassign task.");
    } finally {
      setBusyTaskId(null);
    }
  }

  const statColumns = [
    { key: "total", label: "Assigned" },
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

      {rows.length > 0 ? (
        <div className="assignment-table">
          <div className="assignment-row assignment-head" aria-hidden="true">
            <span>Member</span>
            {statColumns.map((column) => (
              <span key={column.key}>{column.label}</span>
            ))}
          </div>
          {rows.map(({ member, total, inProgress, completed, overdue }) => (
            <div key={member.userId} className="assignment-row">
              <button
                type="button"
                className="workload-member workload-link"
                onClick={() => openMember(member.userId)}
              >
                {member.avatarUrl ? (
                  <Image
                    src={member.avatarUrl}
                    alt=""
                    width={28}
                    height={28}
                    unoptimized
                    className="assignee-avatar"
                  />
                ) : (
                  <span className="assignee-avatar" aria-hidden="true">
                    {(member.name || member.email || "?").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span>{member.name || member.email}</span>
              </button>
              {statColumns.map((column) => {
                const value = { total, inProgress, completed, overdue }[column.key];
                return (
                  <button
                    key={column.key}
                    type="button"
                    className="workload-stat"
                    onClick={() => openMember(member.userId, column.key)}
                    aria-label={`${column.label} tasks for ${member.name || member.email}: ${value}`}
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
              {selected.member.name || selected.member.email}
            </h2>
            <p className="dialog-description">
              {selected.total} assigned · {selected.inProgress} in progress · {selected.completed} completed · {selected.overdue} overdue
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
