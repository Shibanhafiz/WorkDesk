import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { validateProjectInput } from "@/app/lib/projectValidation";
import { getSessionUser, requireWorkspaceMember } from "@/app/lib/session";
import { recordActivity, ACTIVITY_TYPES } from "@/app/lib/activityLog";
import { paginationHeaders, parsePagination } from "@/app/lib/pagination";

const PROJECT_STATUSES = new Set(["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"]);

export async function GET(request) {
  const user = await getSessionUser(prisma);
  if (!user) return errorResponse("Authentication required.", 401);

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  const { page, pageSize, skip, take } = parsePagination(searchParams);

  let where = {};
  if (workspaceId) {
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id, workspaceId },
    });
    if (!membership) return errorResponse("You are not a member of this workspace.", 403);
    where = { workspaceId };
  } else {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      select: { workspaceId: true },
    });
    where = { workspaceId: { in: memberships.map((m) => m.workspaceId) } };
  }

  const status = searchParams.get("status");
  if (status && PROJECT_STATUSES.has(status)) where.status = status;

  try {
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        skip,
        take,
        include: { _count: { select: { tasks: true } } },
      }),
      prisma.project.count({ where }),
    ]);
    return Response.json(projects, {
      headers: paginationHeaders(page, pageSize, total),
    });
  } catch (error) {
    logApiError("Project", "load", error);
    return errorResponse("Unable to load projects. Please try again.", 500);
  }
}

export async function POST(request) {
  const user = await getSessionUser(prisma);
  if (!user) return errorResponse("Authentication required.", 401);

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) return errorResponse("workspaceId is required.", 400);

  const access = await requireWorkspaceMember(prisma, workspaceId, "MANAGER");
  if (access.error) {
    return errorResponse(
      access.error === "Insufficient permissions."
        ? "Only managers and admins can create projects."
        : access.error,
      access.status,
    );
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const validation = validateProjectInput(input);
  if (validation.error) return errorResponse(validation.error, 400);

  try {
    const project = await prisma.project.create({
      data: { ...validation.data, workspaceId },
      include: { _count: { select: { tasks: true } } },
    });
    await recordActivity(prisma, {
      workspaceId,
      actorId: user.id,
      type: ACTIVITY_TYPES.PROJECT_CREATED,
      targetId: project.id,
      targetType: "PROJECT",
      metadata: { name: project.name },
    });
    return Response.json(project, { status: 201 });
  } catch (error) {
    logApiError("Project", "create", error);
    return errorResponse("Unable to create project. Please try again.", 500);
  }
}
