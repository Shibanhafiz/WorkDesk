"use client";

import { useCallback, useEffect, useState } from "react";
import { usePreferences } from "./PreferencesProvider";
import TaskCard from "./TaskCard";
import TaskDetailsDialog from "./TaskDetailsDialog";
import TaskForm from "./TaskForm";
import { sortTasks } from "../lib/taskInsights";

const taskStatuses = ["To Do", "In Progress", "Completed"];
const taskPriorities = ["High", "Medium", "Low"];
const priorityLabels = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };
const priorityValues = { Low: "LOW", Medium: "MEDIUM", High: "HIGH" };
const statusLabels = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  DONE: "Completed",
};
const statusValues = {
  "To Do": "TODO",
  "In Progress": "IN_PROGRESS",
  Completed: "DONE",
};

function fromApiTask(task) {
  return {
    ...task,
    description: task.description ?? "",
    priority: priorityLabels[task.priority],
    status: statusLabels[task.status],
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : null,
  };
}

function toApiTask(task) {
  return {
    ...task,
    priority: priorityValues[task.priority],
    status: statusValues[task.status],
  };
}

async function readApiResponse(response, fallbackMessage) {
  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(responseBody?.error || fallbackMessage);
  }

  return responseBody;
}

async function fetchTaskList() {
  const response = await fetch("/api/tasks", { cache: "no-store" });
  const data = await readApiResponse(response, "Unable to load tasks.");

  if (!Array.isArray(data)) {
    throw new Error("The server returned an invalid task list.");
  }

  return data.map(fromApiTask);
}

export default function TaskManagement() {
  const { preferences } = usePreferences();
  const [tasks, setTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [priorityFilter, setPriorityFilter] = useState("All priorities");
  const [sortOrder, setSortOrder] = useState("newest");
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [viewingTask, setViewingTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [taskFormError, setTaskFormError] = useState("");
  const [busyTaskId, setBusyTaskId] = useState(null);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      setTasks(await fetchTaskList());
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to load tasks.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetchTaskList()
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
  }, []);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredTasks = tasks.filter((task) => {
    const matchesTitle = task.title.toLowerCase().includes(normalizedSearch);
    const matchesStatus =
      statusFilter === "All statuses" || task.status === statusFilter;
    const matchesPriority =
      priorityFilter === "All priorities" || task.priority === priorityFilter;

    return matchesTitle && matchesStatus && matchesPriority;
  });
  const visibleTasks = sortTasks(filteredTasks, sortOrder);
  const hasActiveFilters =
    searchTerm !== "" ||
    statusFilter !== "All statuses" ||
    priorityFilter !== "All priorities" ||
    sortOrder !== "newest";

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("All statuses");
    setPriorityFilter("All priorities");
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
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to delete task.",
      });
    } finally {
      setBusyTaskId(null);
    }
  }

  async function changeTaskStatus(taskId, newStatus) {
    setBusyTaskId(taskId);
    setFeedback(null);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusValues[newStatus] }),
      });
      const updatedTask = fromApiTask(
        await readApiResponse(response, "Unable to update task status."),
      );
      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task.id === updatedTask.id ? updatedTask : task,
        ),
      );
      setFeedback({ type: "success", message: "Task status updated." });
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to update task status.",
      });
    } finally {
      setBusyTaskId(null);
    }
  }

  return (
    <div className="px-5 py-7 sm:px-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Workspace
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              All Tasks
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Search, organize, and update your tasks.
            </p>
          </div>
          <button
            type="button"
            onClick={openNewTaskForm}
            className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:self-auto"
          >
            <span aria-hidden="true" className="text-lg leading-none">+</span>
            Add Task
          </button>
        </header>

        {feedback && (
          <div
            role={feedback.type === "error" ? "alert" : "status"}
            className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
              feedback.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {feedback.message}
          </div>
        )}

        <section aria-labelledby="tasks-heading">
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2
                id="tasks-heading"
                className="text-xl font-semibold tracking-tight text-slate-900"
              >
                Tasks
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Showing {visibleTasks.length} of {tasks.length} tasks
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[min(100%,900px)] xl:grid-cols-4">
              <label className="relative block">
                <span className="sr-only">Search tasks by title</span>
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search tasks..."
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-3 focus:ring-blue-100"
                />
              </label>

              <label className="block">
                <span className="sr-only">Filter tasks by status</span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100"
                >
                  <option>All statuses</option>
                  {taskStatuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="sr-only">Filter tasks by priority</span>
                <select
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100"
                >
                  <option>All priorities</option>
                  {taskPriorities.map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="sr-only">Sort tasks</span>
                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="due-date">Due date (earliest)</option>
                  <option value="priority-high">Priority (high to low)</option>
                  <option value="priority-low">Priority (low to high)</option>
                </select>
              </label>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mb-4 text-sm font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-800"
            >
              Clear filters
            </button>
          )}

          {isLoading ? (
            <p
              role="status"
              className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500"
            >
              Loading tasks...
            </p>
          ) : loadError ? (
            <div className="rounded-xl border border-rose-200 bg-white px-6 py-12 text-center">
              <p className="text-sm text-slate-600">
                Tasks could not be loaded. {loadError}
              </p>
              <button
                type="button"
                onClick={loadTasks}
                className="mt-3 text-sm font-semibold text-blue-700 hover:text-blue-800"
              >
                Try again
              </button>
            </div>
          ) : visibleTasks.length > 0 ? (
            <div className="density-grid grid gap-4 xl:grid-cols-2">
              {visibleTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  statuses={taskStatuses}
                  onEdit={openEditTaskForm}
                  onViewTask={setViewingTask}
                  onDelete={deleteTask}
                  onStatusChange={changeTaskStatus}
                  isBusy={busyTaskId === task.id}
                />
              ))}
            </div>
          ) : (
            <div className="density-card rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <h3 className="font-semibold text-slate-800">
                {tasks.length === 0 ? "No tasks yet" : "No tasks match these filters"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {tasks.length === 0
                  ? "Add a task to start organizing your work."
                  : "Clear the filters or try a different search."}
              </p>
              {tasks.length === 0 ? (
                <button
                  type="button"
                  onClick={openNewTaskForm}
                  className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Create your first task
                </button>
              ) : (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 text-sm font-semibold text-blue-700 underline underline-offset-2"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      {isTaskFormOpen && (
        <TaskForm
          key={editingTask ? editingTask.id : "new-task"}
          initialTask={editingTask}
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
        />
      )}
    </div>
  );
}
