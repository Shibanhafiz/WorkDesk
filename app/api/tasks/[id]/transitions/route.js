import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { requireTaskMember } from "@/app/lib/session";
import {
  validateLifecycleAction,
  LIFECYCLE_ACTIONS,
} from "@/app/lib/taskLifecycle";
import {
  createNotificationOnce,
  testingSubmissionNotification,
  testingFailureNotification,
  taskApprovedNotification,
  taskReopenedNotification,
} from "@/app/lib/notifications";
import { recordActivity, ACTIVITY_TYPES } from "@/app/lib/activityLog";
import { can } from "@/app/lib/workspacePermissions";

function isRecordNotFound(error) {
  return error && typeof error === "object" && error.code === "P2025";
}

export async function POST(request, { params }) {
  const { id } = await params;
  const access = await requireTaskMember(prisma, id, "MEMBER");
  if (access.error) return errorResponse(access.error, access.status);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const { action, reason, reviewComment } = body;
  if (!action || !LIFECYCLE_ACTIONS[action]) {
    return errorResponse("A valid lifecycle action is required.", 400);
  }

  const task = access.task;
  const isAssignee = task.assigneeId === access.userId;

  const decision = validateLifecycleAction({
    action,
    currentStatus: task.status,
    actorRole: access.role,
    isAssignee,
    reason,
    reviewComment,
  });
  if (decision.error) return errorResponse(decision.error, 403);

  try {
    const isReopen = decision.to === "REOPENED";
    const [updatedTask] = await prisma.$transaction([
      prisma.task.update({
        where: { id },
        data: {
          status: decision.to,
          ...(isReopen ? { reopenCount: { increment: 1 } } : {}),
        },
        include: {
          project: { select: { id: true, name: true, status: true } },
          assignee: {
            select: { id: true, name: true, email: true, specialization: true },
          },
          history: {
            orderBy: { createdAt: "asc" },
            include: { actor: { select: { id: true, name: true, email: true } } },
          },
        },
      }),
      prisma.taskHistory.create({
        data: {
          taskId: id,
          fromStatus: decision.from,
          toStatus: decision.to,
          actorId: access.userId,
          reason: decision.reason,
          reviewComment: decision.reviewComment,
        },
      }),
    ]);

    const occurrence = `${task.reopenCount}`;
    const taskTitle = task.title;
    const workspaceId = access.workspaceId;

    if (action === "SUBMIT_FOR_TESTING") {
      const managers = await prisma.workspaceMember.findMany({
        where: { workspaceId, role: { in: ["MANAGER", "ADMIN"] } },
        select: { userId: true },
      });
      for (const manager of managers) {
        await createNotificationOnce(prisma, testingSubmissionNotification({
          recipientId: manager.userId, actorId: access.userId,
          taskTitle, taskId: id, occurrence,
        }));
      }
    } else if (action === "REJECT") {
      const recipients = new Set([
        task.assigneeId,
        ...(await prisma.workspaceMember.findMany({
          where: { workspaceId, role: { in: ["MANAGER", "ADMIN"] } },
          select: { userId: true },
        })).map((m) => m.userId),
      ]);
      for (const recipientId of recipients) {
        await createNotificationOnce(prisma, testingFailureNotification({
          recipientId, actorId: access.userId, taskTitle, taskId: id,
          reason: decision.reason, occurrence,
        }));
      }
    } else if (action === "APPROVE") {
      await createNotificationOnce(prisma, taskApprovedNotification({
        recipientId: task.assigneeId, actorId: access.userId,
        taskTitle, taskId: id, occurrence,
      }));
    } else if (action === "REOPEN") {
      await createNotificationOnce(prisma, taskReopenedNotification({
        recipientId: task.assigneeId, actorId: access.userId,
        taskTitle, taskId: id, reason: decision.reason, occurrence,
      }));
    }

    if (can(access.role, "MANAGER") || isAssignee) {
      let activityType = ACTIVITY_TYPES.STATUS_CHANGED;
      if (action === "APPROVE" || action === "REJECT") activityType = ACTIVITY_TYPES.TESTING_DECISION;
      if (action === "REOPEN") activityType = ACTIVITY_TYPES.TASK_REOPENED;
      if (decision.to === "DONE") activityType = ACTIVITY_TYPES.TASK_COMPLETED;

      await recordActivity(prisma, {
        workspaceId,
        actorId: access.userId,
        type: activityType,
        targetId: id,
        targetType: "TASK",
        metadata: { action, fromStatus: decision.from, toStatus: decision.to },
      });
    }

    return Response.json(updatedTask);
  } catch (error) {
    if (isRecordNotFound(error)) return errorResponse("Task not found.", 404);
    logApiError("Task transition", action, error);
    return errorResponse("Unable to update task status. Please try again.", 500);
  }
}
