import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import {
  isValidProjectId,
  validateProjectDateRange,
  validateProjectInput,
} from "@/app/lib/projectValidation";
import { getSessionUser } from "@/app/lib/session";
import { recordActivity, ACTIVITY_TYPES } from "@/app/lib/activityLog";
import { can } from "@/app/lib/workspacePermissions";

function isRecordNotFound(error) {
  return error && typeof error === "object" && error.code === "P2025";
}

async function requireProjectAccess(prisma, projectId, userId) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "Project not found.", status: 404 };
  if (!project.workspaceId) return { error: "Project has no workspace.", status: 400 };
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, workspaceId: project.workspaceId },
  });
  if (!membership) return { error: "You are not a member of this workspace.", status: 403 };
  return { project };
}

export async function GET(_request, { params }) {
  const { id } = await params;
  if (!isValidProjectId(id)) return errorResponse("Project ID must be a valid CUID.", 400);

  const user = await getSessionUser(prisma);
  if (!user) return errorResponse("Authentication required.", 401);

  const access = await requireProjectAccess(prisma, id, user.id);
  if (access.error) return errorResponse(access.error, access.status);

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: { createdAt: "desc" },
          include: { assignee: { select: { id: true, name: true, email: true, specialization: true } } },
        },
        _count: { select: { tasks: true } },
      },
    });
    return Response.json(project);
  } catch (error) {
    logApiError("Project", "load details", error);
    return errorResponse("Unable to load project.", 500);
  }
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  if (!isValidProjectId(id)) return errorResponse("Project ID must be a valid CUID.", 400);

  const user = await getSessionUser(prisma);
  if (!user) return errorResponse("Authentication required.", 401);

  const access = await requireProjectAccess(prisma, id, user.id);
  if (access.error) return errorResponse(access.error, access.status);

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspaceId: access.project.workspaceId },
  });
  if (!membership || !can(membership.role, "MANAGER")) {
    return errorResponse("Only managers and admins can edit projects.", 403);
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const validation = validateProjectInput(input, { partial: true });
  if (validation.error) return errorResponse(validation.error, 400);

  try {
    const startDate = Object.hasOwn(validation.data, "startDate")
      ? validation.data.startDate
      : access.project.startDate;
    const dueDate = Object.hasOwn(validation.data, "dueDate")
      ? validation.data.dueDate
      : access.project.dueDate;
    const range = validateProjectDateRange(startDate, dueDate);
    if (range.error) return errorResponse(range.error, 400);

    const project = await prisma.project.update({
      where: { id },
      data: validation.data,
      include: { _count: { select: { tasks: true } } },
    });
    await recordActivity(prisma, {
      workspaceId: project.workspaceId,
      actorId: user.id,
      type: ACTIVITY_TYPES.PROJECT_UPDATED,
      targetId: project.id,
      targetType: "PROJECT",
      metadata: { name: project.name, status: project.status },
    });
    return Response.json(project);
  } catch (error) {
    if (isRecordNotFound(error)) return errorResponse("Project not found.", 404);
    logApiError("Project", "update", error);
    return errorResponse("Unable to update project.", 500);
  }
}
