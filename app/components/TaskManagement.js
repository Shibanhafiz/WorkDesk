"use client";

import { useCallback, useEffect, useState } from "react";
import { usePreferences } from "./PreferencesProvider";
import PageHeader from "./PageHeader";
import TaskCard from "./TaskCard";
import TaskDetailsDialog from "./TaskDetailsDialog";
import TaskForm from "./TaskForm";
import LifecycleActionDialog from "./LifecycleActionDialog";
import { sortTasks } from "../lib/taskInsights";
import {
  TASK_STATUSES,
  STATUS_LABELS,
  availableLifecycleActions,
} from "../lib/taskLifecycle";
import { useSession } from "./SessionProvider";
import { useProjects } from "../lib/useProjects";
import { useWorkspaces } from "../lib/useWorkspaces";

const taskPriorities = ["High", "Medium", "Low"];
const priorityLabels = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };
const priorityValues = { Low: "LOW", Medium: "MEDIUM", High: "HIGH" };

// Display labels for the status filter dropdown (API enum values).
const taskStatuses = TASK_STATUSES.map((status) => STATUS_LABELS[status]);
const statusLabelToValue = Object.fromEntries(
  TASK_STATUSES.map((status) => [STATUS_LABELS[status], status]),
);

function fromApiTask(task) {
  return {
    ...task,
    description: task.description ?? "",
    priority: priorityLabels[task.priority] ?? task.priority,
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : null,
  };
}

function toApiTask(task) {
  return {
    ...task,
    priority: priorityValues[task.priority] ?? task.priority,
  };
}

async function readApiResponse(response, fallbackMessage) {
  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(responseBody?.error || fallbackMessage);
  }

  return responseBody;
}

async function fetchTaskList(workspaceId = null) {
  const url = workspaceId
    ? `/api/tasks?workspaceId=${encodeURIComponent(workspaceId)}`
    : "/api/tasks";
  const response = await fetch(url, { cache: "no-store" });
  const data = await readApiResponse(response, "Unable to load tasks.");

  if (!Array.isArray(data)) {
    throw new Error("The server returned an invalid task list.");
  }

  return data.map(fromApiTask);
}

async function fetchMembers(workspaceId) {
  if (!workspaceId) return [];

  const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
    cache: "no-store",
  });
  const data = await readApiResponse(response, "Unable to load members.");

  if (!Array.isArray(data)) {
    throw new Error("The server returned an invalid member list.");
  }

  return data;
}

export default function TaskManagement({
  scopedProjectId = null,
  scopedProjectName = "",
  embedded = false,
  onTaskChange,
}) {
  const { preferences } = usePreferences();
  const { currentWorkspace } = useWorkspaces();
  const {
    projects,
    error: projectsError,
    reloadProjects,
  } = useProjects(currentWorkspace?.id ?? null);
  const { user: sessionUser } = useSession();
  const userId = sessionUser?.id ?? "";
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [priorityFilter, setPriorityFilter] = useState("All priorities");
  const [projectFilter, setProjectFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [viewingTask, setViewingTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [taskFormError, setTaskFormError] = useState("");
  const [busyTaskId, setBusyTaskId] = useState(null);
  const [lifecycleAction, setLifecycleAction] = useState(null);
  const [lifecycleTask, setLifecycleTask] = useState(null);
  const [lifecycleError, setLifecycleError] = useState("");

  // Current user's role in the selected workspace. Defaults to MEMBER;
  // the UI only hides actions — the backend re-validates every permission.
  const currentUserRole =
    members.find((m) => m.userId === userId)?.role ?? sessionUser?.role ?? "MEMBER";
  const workspaceId = currentWorkspace?.id ?? null;

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      setTasks(await fetchTaskList(workspaceId));
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to load tasks.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    let isMounted = true;

    fetchTaskList(workspaceId)
      .then((loadedTasks) => {
        if (isMounted) {
          setTasks(loadedTasks);
        }
      })
      .catch((error) => {
        if (isMounted) {
          setLoadError(
            error instanceof Error ? error.message : "Unable to load tasks.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [workspaceId]);

  // Load members when workspace changes
  useEffect(() => {
    if (!currentWorkspace?.id) return;

    let isMounted = true;

    fetchMembers(currentWorkspace.id)
      .then((loadedMembers) => {
        if (isMounted) {
          setMembers(loadedMembers);
        }
      })
      .catch(() => {
        // Members load failure is non-critical
      });

    return () => {
      isMounted = false;
    };
  }, [currentWorkspace?.id]);

  const scopedTasks = scopedProjectId
    ? tasks.filter((task) => task.projectId === scopedProjectId)
    : tasks;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredTasks = scopedTasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(normalizedSearch) ||
      task.description.toLowerCase().includes(normalizedSearch);
    const matchesStatus =
      statusFilter === "All statuses" ||
      task.status === (statusLabelToValue[statusFilter] ?? statusFilter);
    const matchesPriority =
      priorityFilter === "All priorities" || task.priority === priorityFilter;
    const matchesProject =
      scopedProjectId ||
      projectFilter === "all" ||
      (projectFilter === "unassigned"
        ? !task.projectId
        : task.projectId === projectFilter);
    const matchesAssignee =
      assigneeFilter === "all" ||
      (assigneeFilter === "unassigned"
        ? !task.assignee
        : task.assignee?.id === assigneeFilter);

    return (
      matchesSearch && matchesStatus && matchesPriority &&
      matchesProject && matchesAssignee
    );
  });
  const visibleTasks = sortTasks(filteredTasks, sortOrder);
  const hasNoScopedTasks = scopedTasks.length === 0;
  const hasActiveFilters =
    searchTerm !== "" ||
    statusFilter !== "All statuses" ||
    priorityFilter !== "All priorities" ||
    (!scopedProjectId && projectFilter !== "all") ||
    assigneeFilter !== "all" ||
    sortOrder !== "newest";

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("All statuses");
    setPriorityFilter("All priorities");
    setProjectFilter("all");
    setAssigneeFilter("all");
    setSortOrder("newest");
  }

  function openNewTaskForm() {
    setEditingTask(null);
    setFeedback(null);
    setTaskFormError("");
    setIsTaskFormOpen(true);
  }

  function openEditTaskForm(task) {
    setEditingTask(task);
    setFeedback(null);
    setTaskFormError("");
    setIsTaskFormOpen(true);
  }

  async function saveTask(taskDetails) {
    setFeedback(null);
    setTaskFormError("");

    try {
      const isEditing = Boolean(editingTask);
      const response = await fetch(
        isEditing ? `/api/tasks/${editingTask.id}` : "/api/tasks",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toApiTask(taskDetails)),
        },
      );
      const savedTask = fromApiTask(
        await readApiResponse(response, "Unable to save task."),
      );

      if (isEditing) {
        setTasks((currentTasks) =>
          currentTasks.map((task) =>
            task.id === savedTask.id ? savedTask : task,
          ),
        );
      } else {
        setTasks((currentTasks) => [savedTask, ...currentTasks]);
      }

      setFeedback({
        type: "success",
        message: isEditing ? "Task updated." : "Task created.",
      });
      onTaskChange?.();
      await reloadProjects();
      setIsTaskFormOpen(false);
      setEditingTask(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save task.";
      setTaskFormError(message);
      setFeedback({ type: "error", message });
    }
  }

  async function deleteTask(task) {
    if (
      preferences.confirmDelete &&
      !window.confirm(`Delete "${task.title}"? This action cannot be undone.`)
    ) {
      return;
    }

    setBusyTaskId(task.id);
    setFeedback(null);

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });
      await readApiResponse(response, "Unable to delete task.");
      setTasks((currentTasks) =>
        currentTasks.filter((currentTask) => currentTask.id !== task.id),
      );
      setFeedback({ type: "success", message: "Task deleted." });
      onTaskChange?.();
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to delete task.",
      });
    } finally {
      setBusyTaskId(null);
    }
  }

  function isReviewer() {
    return currentUserRole === "MANAGER" || currentUserRole === "ADMIN";
  }

  // Actions shown are a UX convenience only; the backend validates all of
  // these rules again before applying any transition.
  function availableActionsFor(task) {
    return availableLifecycleActions({
      status: task.status,
      assigneeId: task.assignee?.id ?? null,
      userId,
      role: currentUserRole,
    });
  }

  function requestLifecycleAction(task, action) {
    setLifecycleTask(task);
    setLifecycleAction(action);
    setLifecycleError("");
  }

  async function performLifecycleAction({ action, reason, reviewComment }) {
    if (!lifecycleTask) return;
    const taskId = lifecycleTask.id;
    const workspaceId = currentWorkspace?.id;

    setBusyTaskId(taskId);
    setLifecycleError("");
    setFeedback(null);

    try {
      const url = `/api/tasks/${taskId}/transitions`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason, reviewComment }),
      });
      const updatedTask = fromApiTask(
        await readApiResponse(response, "Unable to update task status."),
      );
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task,
        ),
      );
      setViewingTask((current) =>
        current && current.id === updatedTask.id ? updatedTask : current,
      );
      setFeedback({
        type: "success",
        message: `Task updated: ${STATUS_LABELS[updatedTask.status] ?? updatedTask.status}.`,
      });
      setLifecycleAction(null);
      setLifecycleTask(null);
      onTaskChange?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update task status.";
      setLifecycleError(message);
      setFeedback({ type: "error", message });
    } finally {
      setBusyTaskId(null);
    }
  }

  return (
    <div className={`page-frame${embedded ? " task-management-embedded" : ""}`}>
      {embedded ? (
        <div className="section-heading-row embedded-task-heading">
          <div>
            <p className="section-kicker">PROJECT / TASK REGISTER</p>
            <h2 className="section-title">Project tasks</h2>
            <p className="section-description">
              Showing {scopedTasks.length} {scopedTasks.length === 1 ? "task" : "tasks"}.
            </p>
          </div>
          <button
            type="button"
            onClick={openNewTaskForm}
            className="button-primary"
          >
            <span aria-hidden="true">+</span>
            Add task
          </button>
        </div>
      ) : (
        <PageHeader
          number="03"
          title="All Tasks"
          description="A searchable register for the work in your workspace."
          meta={`${tasks.length} ${tasks.length === 1 ? "RECORD" : "RECORDS"} · TITLE, STATUS, PRIORITY, ASSIGNEE`}
          action={
            <button
              type="button"
              onClick={openNewTaskForm}
              className="button-primary"
            >
              <span aria-hidden="true">+</span>
              Add task
            </button>
          }
        />
      )}

      {feedback && (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={`feedback${feedback.type === "error" ? " feedback-error" : ""}`}
        >
          {feedback.message}
        </div>
      )}

      <section aria-labelledby="tasks-heading">
        <div className="section-heading-row">
          <div>
            <p className="section-kicker">01 / REGISTER</p>
            <h2 id="tasks-heading" className="section-title">
              Task register
            </h2>
            <p className="section-description">
              Showing {visibleTasks.length} of {scopedTasks.length} tasks
            </p>
          </div>
        </div>

        <div className={`task-toolbar${scopedProjectId ? " task-toolbar-scoped" : ""}`}>
          <label>
            <span className="sr-only">
              Search tasks by title or description
            </span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search tasks"
              className="form-control"
            />
          </label>

          <label>
            <span className="sr-only">Filter tasks by status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="form-control"
            >
              <option>All statuses</option>
              {taskStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">Filter tasks by priority</span>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="form-control"
            >
              <option>All priorities</option>
              {taskPriorities.map((priority) => (
                <option key={priority}>{priority}</option>
              ))}
            </select>
          </label>

          {!scopedProjectId ? (
            <label>
              <span className="sr-only">Filter tasks by project</span>
              <select
                value={projectFilter}
                onChange={(event) => setProjectFilter(event.target.value)}
                className="form-control"
              >
                <option value="all">All projects</option>
                <option value="unassigned">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label>
            <span className="sr-only">Filter tasks by assignee</span>
            <select
              value={assigneeFilter}
              onChange={(event) => setAssigneeFilter(event.target.value)}
              className="form-control"
            >
              <option value="all">All assignees</option>
              <option value="unassigned">Unassigned</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name || member.email}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">Sort tasks</span>
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              className="form-control"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="due-date">Due date (earliest)</option>
              <option value="priority-high">Priority (high to low)</option>
              <option value="priority-low">Priority (low to high)</option>
            </select>
          </label>
        </div>

        {projectsError && !isLoading ? (
          <p role="alert" className="feedback feedback-error">
            Project filters and assignments are unavailable. {projectsError}{" "}
            <button
              type="button"
              onClick={reloadProjects}
              className="text-link-button"
            >
              Try again
            </button>
          </p>
        ) : null}

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-link-button"
          >
            Clear filters
          </button>
        )}

        {isLoading ? (
          <p role="status" className="state-panel">
            Loading your task register...
          </p>
        ) : loadError ? (
          <div className="state-panel">
            <p role="alert" className="state-error">
              Tasks could not be loaded. {loadError}
            </p>
            <button
              type="button"
              onClick={loadTasks}
              className="text-link-button"
            >
              Try again
            </button>
          </div>
        ) : visibleTasks.length > 0 ? (
          <div className="task-register">
            {visibleTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={openEditTaskForm}
                onViewTask={setViewingTask}
                onDelete={deleteTask}
                onAction={requestLifecycleAction}
                availableActions={availableActionsFor(task)}
                isBusy={busyTaskId === task.id}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3 className="empty-state-title">
              {hasNoScopedTasks ? "No tasks yet" : "No tasks match these filters"}
            </h3>
            <p className="empty-state-copy">
              {hasNoScopedTasks
                ? scopedProjectId
                  ? "Add a task to start organizing this project."
                  : "Add a task to start organizing your work."
                : "Clear the filters or try a different search."}
            </p>
            {hasNoScopedTasks ? (
              <button
                type="button"
                onClick={openNewTaskForm}
                className="button-primary empty-state-action"
              >
                Create your first task
              </button>
            ) : (
              <button
                type="button"
                onClick={clearFilters}
                className="text-link-button empty-state-action-secondary"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </section>

      {isTaskFormOpen && (
        <TaskForm
          key={editingTask ? editingTask.id : "new-task"}
          initialTask={editingTask}
          projects={projects}
          members={members}
          projectsError={projectsError}
          onReloadProjects={reloadProjects}
          defaultProjectId={scopedProjectId}
          defaultProjectName={scopedProjectName}
          defaultPriority={preferences.defaultPriority}
          onSave={saveTask}
          errorMessage={taskFormError}
          onClose={() => {
            setIsTaskFormOpen(false);
            setEditingTask(null);
            setTaskFormError("");
          }}
        />
      )}

      {viewingTask && (
        <TaskDetailsDialog
          task={viewingTask}
          onClose={() => setViewingTask(null)}
          availableActions={availableActionsFor(viewingTask)}
          onAction={requestLifecycleAction}
          isBusy={busyTaskId === viewingTask.id}
          actionError={lifecycleAction ? lifecycleError : ""}
          workspaceId={currentWorkspace?.id ?? null}
          userId={userId}
          canManage={isReviewer()}
        />
      )}

      {lifecycleAction && lifecycleTask && (
        <LifecycleActionDialog
          action={lifecycleAction}
          task={lifecycleTask}
          onSubmit={performLifecycleAction}
          onClose={() => {
            setLifecycleAction(null);
            setLifecycleTask(null);
            setLifecycleError("");
          }}
          error={lifecycleError}
        />
      )}
    </div>
  );
}
