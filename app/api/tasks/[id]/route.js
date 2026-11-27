import { prisma } from "@/app/lib/prisma";
import { errorResponse, logTaskApiError } from "@/app/lib/taskApiResponse";
import { validateTaskInput } from "@/app/lib/taskValidation";
import { requireWorkspaceMember } from "@/app/lib/session";
import { authorizeAssignment, canEditTask } from "@/app/lib/taskAssignment";
import {
  createNotificationOnce,
  taskAssignmentNotification,
} from "@/app/lib/notifications";
import { recordActivity, ACTIVITY_TYPES } from "@/app/lib/activityLog";

function isRecordNotFound(error) {
  return error && typeof error === "object" && error.code === "P2025";
}

const taskInclude = {
  project: { select: { id: true, name: true, status: true } },
  assignee: {
    select: { id: true, name: true, email: true, avatarUrl: true, specialization: true },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
  history: {
    orderBy: { createdAt: "asc" },
    include: { actor: { select: { id: true, name: true, email: true } } },
  },
};

export async function PATCH(request, { params }) {
  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  if (Object.hasOwn(body, "status")) {
    return errorResponse(
      "Status cannot be edited directly. Use a lifecycle action instead.",
      400,
    );
  }

  const validation = validateTaskInput(body, { partial: true });
  if (validation.error) return errorResponse(validation.error, 400);

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return errorResponse("Task not found.", 404);

  const access = await requireWorkspaceMember(prisma, task.workspaceId, "MEMBER");
  if (access.error) return errorResponse(access.error, access.status);

  const isSelfAssignment =
    validation.data.assigneeId === access.userId &&
    Object.keys(validation.data).every((field) => field === "assigneeId");

  if (
    !canEditTask({
      actorRole: access.role,
      actorId: access.userId,
      taskAssigneeId: task.assigneeId,
      isSelfAssignment,
    })
  ) {
    return errorResponse("You cannot edit this task.", 403);
  }

  try {
    if (validation.data.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: validation.data.projectId, workspaceId: task.workspaceId },
      });
      if (!project) return errorResponse("Project not found in this workspace.", 404);
    }

    let assigneeId;
    if (Object.hasOwn(validation.data, "assigneeId")) {
      const assignment = await authorizeAssignment(prisma, {
        workspaceId: task.workspaceId,
        actorId: access.userId,
        actorRole: access.role,
        assigneeId: validation.data.assigneeId,
      });
      if (assignment.error) return errorResponse(assignment.error, 403);
      assigneeId = assignment.assigneeId;
    }

    const previousAssigneeId = task.assigneeId;
    const updatedTask = await prisma.task.update({
      where: { id },
      data: { ...validation.data, assigneeId },
      include: taskInclude,
    });

    if (
      validation.data.assigneeId !== undefined &&
      validation.data.assigneeId !== previousAssigneeId
    ) {
      const activity = await recordActivity(prisma, {
        workspaceId: task.workspaceId,
        actorId: access.userId,
        type: ACTIVITY_TYPES.TASK_ASSIGNED,
        targetId: id,
        targetType: "TASK",
        metadata: {
          fromAssigneeId: previousAssigneeId,
          toAssigneeId: validation.data.assigneeId,
          title: task.title,
        },
      });
      const notification = taskAssignmentNotification({
        assigneeId: validation.data.assigneeId,
        actorId: access.userId,
        taskTitle: task.title,
        taskId: id,
        occurrence: activity?.id ?? "",
      });
      if (notification) await createNotificationOnce(prisma, notification);
    }

    return Response.json(updatedTask);
  } catch (error) {
    if (isRecordNotFound(error)) return errorResponse("Task not found.", 404);
    logTaskApiError("update", error);
    return errorResponse("Unable to update task. Please try again.", 500);
  }
}

export async function DELETE(_request, { params }) {
  const { id } = await params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return errorResponse("Task not found.", 404);

  const access = await requireWorkspaceMember(prisma, task.workspaceId, "MANAGER");
  if (access.error) return errorResponse(access.error, access.status);

  try {
    await prisma.task.delete({ where: { id } });
    return Response.json({ id });
  } catch (error) {
    if (isRecordNotFound(error)) return errorResponse("Task not found.", 404);
    logTaskApiError("delete", error);
    return errorResponse("Unable to delete task. Please try again.", 500);
  }
}
