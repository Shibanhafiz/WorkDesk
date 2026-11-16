const activeStatuses = new Set(["PLANNING", "ACTIVE"]);

function getDateKey(value) {
  return value ? String(value).slice(0, 10) : null;
}

function sortByDueDate(projects) {
  return [...projects].sort((first, second) => {
    const firstDate = getDateKey(first.dueDate);
    const secondDate = getDateKey(second.dueDate);

    if (!firstDate && !secondDate) return 0;
    if (!firstDate) return 1;
    if (!secondDate) return -1;
    return firstDate.localeCompare(secondDate);
  });
}

export function sortProjects(projects, sortOrder) {
  const sortedProjects = [...projects];

  switch (sortOrder) {
    case "oldest":
      return sortedProjects.sort(
        (first, second) =>
          new Date(first.createdAt).getTime() -
          new Date(second.createdAt).getTime(),
      );
    case "deadline":
      return sortByDueDate(sortedProjects);
    case "newest":
    default:
      return sortedProjects.sort(
        (first, second) =>
          new Date(second.createdAt).getTime() -
          new Date(first.createdAt).getTime(),
      );
  }
}

export function calculateProjectTaskMetrics(tasks) {
  const completed = tasks.filter((task) => task.status === "DONE").length;
  const total = tasks.length;

  return {
    total,
    completed,
    pending: total - completed,
    completionPercentage: total ? Math.round((completed / total) * 100) : 0,
  };
}

export function calculateProjectMetrics(projects, today) {
  const dueSoonThrough = today ? new Date(`${today}T00:00:00.000Z`) : null;
  dueSoonThrough?.setUTCDate(dueSoonThrough.getUTCDate() + 7);
  const dueSoonDateKey = dueSoonThrough
    ? dueSoonThrough.toISOString().slice(0, 10)
    : null;
  const approachingProjects = today
    ? sortByDueDate(
        projects.filter((project) => {
          const dueDate = getDateKey(project.dueDate);
          return (
            activeStatuses.has(project.status) &&
            dueDate &&
            dueDate >= today &&
            dueDate <= dueSoonDateKey
          );
        }),
      )
    : [];
  const recentlyUpdated = [...projects]
    .sort(
      (first, second) =>
        new Date(second.updatedAt).getTime() -
        new Date(first.updatedAt).getTime(),
    )
    .slice(0, 4);

  return {
    total: projects.length,
    active: projects.filter((project) => project.status === "ACTIVE").length,
    completed: projects.filter((project) => project.status === "COMPLETED").length,
    approachingDeadlines: approachingProjects.length,
    approachingProjects,
    recentlyUpdated,
  };
}
