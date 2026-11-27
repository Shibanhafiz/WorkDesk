import { getTodayDateKey } from "./taskInsights.js";

// Column grouping for the workload table. Together the three groups cover
// every task status, so the columns always sum to the assigned total.
export const WORKLOAD_STATUS_GROUPS = {
  todo: ["TODO", "REOPENED"],
  inProgress: ["IN_PROGRESS", "TESTING", "TESTING_FAILED"],
  completed: ["DONE"],
};

/**
 * Combine raw database aggregates into one workload row per member.
 * - members: workspace member records (userId, user{...}, role)
 * - statusCounts: rows of { assigneeId, status, _count: { _all } }
 * - overdueCounts: rows of { assigneeId, _count: { _all } } for overdue tasks
 */
export function buildWorkloadRows({ members = [], statusCounts = [], overdueCounts = [] }) {
  const rows = new Map();

  for (const member of members) {
    rows.set(member.userId, {
      userId: member.userId,
      name: member.user?.name ?? member.name ?? null,
      email: member.user?.email ?? member.email ?? null,
      avatarUrl: member.user?.avatarUrl ?? member.avatarUrl ?? null,
      specialization: member.user?.specialization ?? member.specialization ?? null,
      role: member.role,
      total: 0,
      todo: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
    });
  }

  const groupForStatus = Object.entries(WORKLOAD_STATUS_GROUPS).flatMap(
    ([group, statuses]) => statuses.map((status) => [status, group]),
  );
  const statusToGroup = new Map(groupForStatus);

  for (const countRow of statusCounts) {
    const row = rows.get(countRow.assigneeId);
    if (!row) continue;
    const amount = countRow._count?._all ?? countRow._count ?? 0;
    row.total += amount;
    const group = statusToGroup.get(countRow.status);
    if (group) row[group] += amount;
  }

  for (const overdueRow of overdueCounts) {
    const row = rows.get(overdueRow.assigneeId);
    if (!row) continue;
    row.overdue = overdueRow._count?._all ?? overdueRow._count ?? 0;
  }

  return [...rows.values()];
}

/**
 * Load team workload with database queries: one pass over members, one
 * grouped count of assigned tasks by status, and one grouped count of
 * overdue tasks. No values are computed from sample or client data.
 */
export async function getTeamWorkload(prisma, workspaceId, { todayDateKey } = {}) {
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          specialization: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const statusCounts = await prisma.task.groupBy({
    by: ["assigneeId", "status"],
    where: {
      workspaceId,
      assigneeId: { not: null },
    },
    _count: { _all: true },
  });

  const today = todayDateKey ?? getTodayDateKey();
  const overdueCounts = today
    ? await prisma.task.groupBy({
        by: ["assigneeId"],
        where: {
          workspaceId,
          assigneeId: { not: null },
          status: { notIn: WORKLOAD_STATUS_GROUPS.completed },
          dueDate: { lt: new Date(`${today}T00:00:00.000Z`) },
        },
        _count: { _all: true },
      })
    : [];

  return buildWorkloadRows({ members, statusCounts, overdueCounts });
}
