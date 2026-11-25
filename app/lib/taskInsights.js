const priorityOrder = { LOW: 1, MEDIUM: 2, HIGH: 3 };

export function getTodayDateKey(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function getDueDateKey(task) {
  return task.dueDate ? task.dueDate.slice(0, 10) : null;
}

function getPriorityRank(priority) {
  const priorityKey = typeof priority === "string" ? priority.toUpperCase() : "";
  return priorityOrder[priorityKey] ?? 0;
}

function sortByDueDate(tasks) {
  return [...tasks].sort((first, second) => {
    const firstDate = getDueDateKey(first);
    const secondDate = getDueDateKey(second);

    if (!firstDate && !secondDate) return 0;
    if (!firstDate) return 1;
    if (!secondDate) return -1;
    return firstDate.localeCompare(secondDate);
  });
}

export function calculateTaskMetrics(tasks, today) {
  const completed = tasks.filter((task) => task.status === "DONE").length;
  const total = tasks.length;

  return {
    total,
    todo: tasks.filter((task) => task.status === "TODO").length,
    inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
    testing: tasks.filter((task) => task.status === "TESTING").length,
    testingFailed: tasks.filter((task) => task.status === "TESTING_FAILED").length,
    reopened: tasks.filter((task) => task.status === "REOPENED").length,
    completed,
    completionPercentage: total ? Math.round((completed / total) * 100) : 0,
    overdue: today
      ? tasks.filter((task) => {
          const dueDate = getDueDateKey(task);
          return dueDate && dueDate < today && task.status !== "DONE";
        }).length
      : 0,
    upcoming: today
      ? tasks.filter((task) => {
          const dueDate = getDueDateKey(task);
          return dueDate && dueDate >= today && task.status !== "DONE";
        }).length
      : 0,
    priorities: {
      LOW: tasks.filter((task) => task.priority === "LOW").length,
      MEDIUM: tasks.filter((task) => task.priority === "MEDIUM").length,
      HIGH: tasks.filter((task) => task.priority === "HIGH").length,
    },
  };
}

export function groupTasksByDueDate(tasks, today) {
  const datedOpenTasks = tasks.filter(
    (task) => task.dueDate && task.status !== "DONE",
  );
  const dueSoonThrough = today
    ? new Date(`${today}T00:00:00`)
    : null;

  dueSoonThrough?.setDate(dueSoonThrough.getDate() + 7);
  const dueSoonDateKey = dueSoonThrough
    ? getTodayDateKey(dueSoonThrough)
    : null;

  return {
    overdue: today
      ? sortByDueDate(
          datedOpenTasks.filter((task) => getDueDateKey(task) < today),
        )
      : [],
    dueSoon: today
      ? sortByDueDate(
          datedOpenTasks.filter(
            (task) =>
              getDueDateKey(task) >= today &&
              getDueDateKey(task) <= dueSoonDateKey,
          ),
        )
      : [],
    upcoming: today
      ? sortByDueDate(
          datedOpenTasks.filter(
            (task) => getDueDateKey(task) > dueSoonDateKey,
          ),
        )
      : [],
    unscheduled: tasks.filter((task) => !task.dueDate),
  };
}

export function sortTasks(tasks, sortOrder) {
  const sortedTasks = [...tasks];

  switch (sortOrder) {
    case "oldest":
      return sortedTasks.sort(
        (first, second) =>
          new Date(first.createdAt).getTime() -
          new Date(second.createdAt).getTime(),
      );
    case "due-date":
      return sortByDueDate(sortedTasks);
    case "priority-high":
      return sortedTasks.sort(
        (first, second) =>
          getPriorityRank(second.priority) - getPriorityRank(first.priority),
      );
    case "priority-low":
      return sortedTasks.sort(
        (first, second) =>
          getPriorityRank(first.priority) - getPriorityRank(second.priority),
      );
    case "newest":
    default:
      return sortedTasks.sort(
        (first, second) =>
          new Date(second.createdAt).getTime() -
          new Date(first.createdAt).getTime(),
      );
  }
}
