import { prisma } from "@/app/lib/prisma";
import { errorResponse, logTaskApiError } from "@/app/lib/taskApiResponse";
import { validateTaskInput } from "@/app/lib/taskValidation";
import { requireWorkspaceMember, getSessionUser } from "@/app/lib/session";
import { authorizeAssignment } from "@/app/lib/taskAssignment";
import {
  createNotificationOnce,
  taskAssignmentNotification,
} from "@/app/lib/notifications";
import { recordActivity, ACTIVITY_TYPES } from "@/app/lib/activityLog";
import { isJsonObjectBody } from "@/app/lib/requestBody";
import { paginationHeaders, parsePagination } from "@/app/lib/pagination";
import { isValidProjectId } from "@/app/lib/projectValidation";

const TASK_STATUSES = new Set([
  "TODO",
  "IN_PROGRESS",
  "TESTING",
  "TESTING_FAILED",
  "REOPENED",
  "DONE",
]);

class DuplicateTaskError extends Error {}

const taskInclude = {
  project: { select: { id: true, name: true, status: true } },
  assignee: {
    select: { id: true, name: true, email: true, avatarUrl: true, specialization: true },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
  history: {
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { actor: { select: { id: true, name: true, email: true } } },
  },
};

/**
 * GET /api/tasks — only tasks in workspaces the session user belongs to.
 */
export async function GET(request) {
  const user = await getSessionUser(prisma);
  if (!user) return errorResponse("Authentication required.", 401);

  const { searchParams } = new URL(request.url);
  const requestedWorkspaceId = searchParams.get("workspaceId");
  const { page, pageSize, skip, take } = parsePagination(searchParams);

  let workspaceIds;
  if (requestedWorkspaceId) {
    const access = await requireWorkspaceMember(prisma, requestedWorkspaceId, "MEMBER");
    if (access.error) return errorResponse(access.error, access.status);
    workspaceIds = [requestedWorkspaceId];
  } else {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      select: { workspaceId: true },
    });
    workspaceIds = memberships.map((m) => m.workspaceId);
  }

  if (workspaceIds.length === 0) {
    return Response.json([], { headers: paginationHeaders(page, pageSize, 0) });
  }

  const where = { workspaceId: { in: workspaceIds } };
  const status = searchParams.get("status");
  if (status && TASK_STATUSES.has(status)) where.status = status;
  const projectId = searchParams.get("projectId");
  if (projectId && isValidProjectId(projectId)) where.projectId = projectId;
  const assigneeId = searchParams.get("assigneeId");
  if (assigneeId && typeof assigneeId === "string") where.assigneeId = assigneeId;
  if (searchParams.get("mine") === "true") where.assigneeId = user.id;

  try {
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take,
        include: taskInclude,
      }),
      prisma.task.count({ where }),
    ]);
    return Response.json(tasks, {
      headers: paginationHeaders(page, pageSize, total),
    });
  } catch (error) {
    logTaskApiError("load", error);
    return errorResponse("Unable to load tasks. Please try again.", 500);
  }
}

export async function POST(request) {
  const user = await getSessionUser(prisma);
  if (!user) return errorResponse("Authentication required.", 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  if (!isJsonObjectBody(body)) {
    return errorResponse("Request body must be a JSON object.", 400);
  }
  if (Object.hasOwn(body, "status")) {
    return errorResponse("Status cannot be set directly. New tasks start in TODO.", 400);
  }

  const validation = validateTaskInput(body);
  if (validation.error) return errorResponse(validation.error, 400);

  const { searchParams } = new URL(request.url);
  const requestedWorkspaceId = searchParams.get("workspaceId");
  let workspaceId;

  if (validation.data.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: validation.data.projectId },
      select: { id: true, workspaceId: true },
    });
    if (!project) return errorResponse("Project not found.", 404);
    if (!project.workspaceId) return errorResponse("Project has no workspace.", 400);
    if (requestedWorkspaceId && requestedWorkspaceId !== project.workspaceId) {
      return errorResponse("Project does not belong to the selected workspace.", 403);
    }
    workspaceId = project.workspaceId;
  } else if (requestedWorkspaceId) {
    workspaceId = requestedWorkspaceId;
  } else if (user.workspaceId) {
    workspaceId = user.workspaceId;
  } else {
    return errorResponse(
      "No active workspace. Select a workspace before creating a task.",
      400,
    );
  }

  const access = await requireWorkspaceMember(prisma, workspaceId, "MEMBER");
  if (access.error) return errorResponse(access.error, access.status);

  try {
    const assignment = await authorizeAssignment(prisma, {
      workspaceId,
      actorId: user.id,
      actorRole: access.role,
      assigneeId: validation.data.assigneeId ?? null,
    });
    if (assignment.error) return errorResponse(assignment.error, 403);

    const { links = [], ...taskFields } = validation.data;
    const task = await prisma.$transaction(async (tx) => {
      const duplicate = await tx.task.findFirst({
        where: {
          workspaceId,
          projectId: validation.data.projectId ?? null,
          title: validation.data.title,
        },
        select: { id: true },
      });
      if (duplicate) throw new DuplicateTaskError();
      return tx.task.create({
        data: {
          ...taskFields,
          assigneeId: assignment.assigneeId,
          workspaceId,
          createdById: user.id,
          ...(links.length > 0
            ? {
                links: {
                  create: links.map((url) => ({ url, createdById: user.id })),
                },
              }
            : {}),
        },
        include: taskInclude,
      });
    });

    await recordActivity(prisma, {
      workspaceId,
      actorId: user.id,
      type: ACTIVITY_TYPES.TASK_CREATED,
      targetId: task.id,
      targetType: "TASK",
      metadata: { title: task.title },
    });

    if (task.assigneeId) {
      const activity = await recordActivity(prisma, {
        workspaceId,
        actorId: user.id,
        type: ACTIVITY_TYPES.TASK_ASSIGNED,
        targetId: task.id,
        targetType: "TASK",
        metadata: {
          fromAssigneeId: null,
          toAssigneeId: task.assigneeId,
          title: task.title,
        },
      });
      const notification = taskAssignmentNotification({
        assigneeId: task.assigneeId,
        actorId: user.id,
        taskTitle: task.title,
        taskId: task.id,
        occurrence: activity?.id ?? "",
      });
      if (notification) await createNotificationOnce(prisma, notification);
    }

    return Response.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateTaskError) {
      return errorResponse("A task with this title already exists in this project.", 409);
    }
    logTaskApiError("create", error);
    return errorResponse("Unable to create task. Please try again.", 500);
  }
}
