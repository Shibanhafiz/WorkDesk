import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { requireWorkspaceMember } from "@/app/lib/session";

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

  try {
    const { name, description } = body;
    const workspace = await prisma.workspace.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
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
    const projectCount = await prisma.project.count({ where: { workspaceId: id } });
    if (projectCount > 0) {
      return errorResponse(
        "Cannot delete workspace with existing projects. Remove or reassign projects first.",
        400,
      );
    }
    await prisma.workspace.delete({ where: { id } });
    await prisma.workspaceMember.deleteMany({ where: { workspaceId: id } });
    return Response.json({ deleted: true });
  } catch (error) {
    logApiError("Workspace", "delete", error);
    return errorResponse("Unable to delete workspace. Please try again.", 500);
  }
}
