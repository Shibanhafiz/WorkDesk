import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { requireWorkspaceMember } from "@/app/lib/session";
import { isJsonObjectBody } from "@/app/lib/requestBody";

export async function GET(_request, { params }) {
  const { id } = await params;
  if (!id) return errorResponse("Workspace ID is required.", 400);

  const access = await requireWorkspaceMember(prisma, id, "MEMBER");
  if (access.error) return errorResponse(access.error, access.status);

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, email: true } },
        _count: { select: { members: true, projects: true } },
      },
    });
    if (!workspace) return errorResponse("Workspace not found.", 404);
    return Response.json(workspace);
  } catch (error) {
    logApiError("Workspace", "load details", error);
    return errorResponse("Unable to load workspace. Please try again.", 500);
  }
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const access = await requireWorkspaceMember(prisma, id, "ADMIN");
  if (access.error) return errorResponse(access.error, access.status);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  if (!isJsonObjectBody(body)) {
    return errorResponse("Request body must be a JSON object.", 400);
  }

  const { name, description } = body;
  if (
    name !== undefined &&
    (typeof name !== "string" || name.trim().length === 0 || name.trim().length > 100)
  ) {
    return errorResponse("Workspace name must be between 1 and 100 characters.", 400);
  }
  if (
    description !== undefined &&
    description !== null &&
    (typeof description !== "string" || description.length > 1000)
  ) {
    return errorResponse("Workspace description is too long.", 400);
  }
  if (name === undefined && description === undefined) {
    return errorResponse("No workspace changes were provided.", 400);
  }

  try {
    const workspace = await prisma.workspace.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        description: description !== undefined ? description : undefined,
      },
    });
    return Response.json(workspace);
  } catch (error) {
    logApiError("Workspace", "update", error);
    return errorResponse("Unable to update workspace. Please try again.", 500);
  }
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const access = await requireWorkspaceMember(prisma, id, "ADMIN");
  if (access.error) return errorResponse(access.error, access.status);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const [projectCount, taskCount] = await Promise.all([
        tx.project.count({ where: { workspaceId: id } }),
        tx.task.count({ where: { workspaceId: id } }),
      ]);
      if (projectCount > 0 || taskCount > 0) {
        return {
          error: "Remove or reassign all projects and tasks before deleting this workspace.",
          status: 400,
        };
      }
      await tx.user.updateMany({
        where: { workspaceId: id },
        data: { workspaceId: null },
      });
      await tx.workspace.delete({ where: { id } });
      return { deleted: true };
    });
    if (result.error) return errorResponse(result.error, result.status);
    return Response.json(result);
  } catch (error) {
    logApiError("Workspace", "delete", error);
    return errorResponse("Unable to delete workspace. Please try again.", 500);
  }
}
