// Shared selection and filtering rules for the My Tasks page.
// Kept out of the component so the behaviour can be unit tested.

export const UPCOMING_WINDOW_DAYS = 7;

export function isOverdue(task, todayDateKey) {
  return (
    task.status !== "DONE" &&
    Boolean(task.dueDate) &&
    String(task.dueDate).slice(0, 10) < (todayDateKey ?? "")
  );
}

export function isUpcoming(task, todayDateKey, windowDays = UPCOMING_WINDOW_DAYS) {
  if (!todayDateKey || !task.dueDate || task.status === "DONE") return false;
  const due = String(task.dueDate).slice(0, 10);
  if (due < todayDateKey) return false;
  const horizon = addDays(todayDateKey, windowDays - 1);
  return due <= horizon;
}

function addDays(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Only tasks assigned to the signed-in user. */
export function selectAssignedTasks(tasks, userId) {
  if (!userId) return [];
  return tasks.filter((task) => task?.assignee?.id === userId);
}

/**
 * Apply the My Tasks filters to the assigned task list.
 * `dueFilter` supports: all | overdue | upcoming | scheduled | none
 */
export function filterAssignedTasks(
  tasks,
  {
    userId,
    todayDateKey = null,
    search = "",
    status = "all",
    priority = "all",
    project = "all",
    due = "all",
  },
) {
  const assigned = selectAssignedTasks(tasks, userId);
  const normalizedSearch = String(search).trim().toLowerCase();

  return assigned.filter((task) => {
    const dueDate = task.dueDate ? String(task.dueDate).slice(0, 10) : "";
    const matchesSearch =
      !normalizedSearch ||
      String(task.title ?? "").toLowerCase().includes(normalizedSearch) ||
      String(task.description ?? "").toLowerCase().includes(normalizedSearch) ||
      String(task.project?.name ?? "").toLowerCase().includes(normalizedSearch);
    const matchesStatus = status === "all" || task.status === status;
    const matchesPriority = priority === "all" || task.priority === priority;
    const matchesProject =
      project === "all" ||
      (project === "none" ? !task.projectId : task.projectId === project);
    const matchesDue =
      due === "all" ||
      (due === "overdue"
        ? isOverdue(task, todayDateKey)
        : due === "upcoming"
          ? isUpcoming(task, todayDateKey)
          : due === "none"
            ? !dueDate
            : Boolean(dueDate));

    return (
      matchesSearch && matchesStatus && matchesPriority &&
      matchesProject && matchesDue
    );
  });
}

/** Counts shown above the My Tasks list. */
export function summarizeAssignedTasks(tasks, userId, todayDateKey) {
  const assigned = selectAssignedTasks(tasks, userId);
  return {
    assigned: assigned.length,
    overdue: assigned.filter((task) => isOverdue(task, todayDateKey)).length,
    upcoming: assigned.filter((task) => isUpcoming(task, todayDateKey)).length,
  };
}
