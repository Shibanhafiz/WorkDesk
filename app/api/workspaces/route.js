import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { getSessionUser } from "@/app/lib/session";

export async function GET() {
  const user = await getSessionUser(prisma);
  if (!user) return errorResponse("Authentication required.", 401);

  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: { workspace: true },
    });
    return Response.json(
      memberships.map((membership) => ({
        ...membership.workspace,
        role: membership.role,
      })),
    );
  } catch (error) {
    logApiError("Workspace", "load", error);
    return errorResponse("Unable to load workspaces. Please try again.", 500);
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

  const { name, description } = body;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return errorResponse("Workspace name is required.", 400);
  }

  try {
    const workspace = await prisma.workspace.create({
      data: {
        name: name.trim(),
        description: description || "",
        isPersonal: false,
        ownerId: user.id,
      },
    });
    await prisma.workspaceMember.create({
      data: { userId: user.id, workspaceId: workspace.id, role: "ADMIN" },
    });
    return Response.json(workspace, { status: 201 });
  } catch (error) {
    logApiError("Workspace", "create", error);
    return errorResponse("Unable to create workspace. Please try again.", 500);
  }
}
