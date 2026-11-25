import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { getSessionUser } from "@/app/lib/session";
import { validateWorkspaceChoiceInput } from "@/app/lib/onboardingValidation";
import { acceptWorkspaceInvitation } from "@/app/lib/invitationAcceptance";

export async function POST(request) {
  const caller = await getSessionUser(prisma);
  if (!caller) return errorResponse("Authentication required.", 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const validation = validateWorkspaceChoiceInput(body);
  if (validation.error) return errorResponse(validation.error, 400);
  const { choice } = validation.data;

  try {
    let workspace;
    let role = "ADMIN";

    if (choice === "team") {
      workspace = await prisma.workspace.create({
        data: {
          name: validation.data.name,
          description: validation.data.description || null,
          isPersonal: false,
          ownerId: caller.id,
        },
      });
      await prisma.workspaceMember.create({
        data: { userId: caller.id, workspaceId: workspace.id, role: "ADMIN" },
      });
    } else if (choice === "personal") {
      const membership = await prisma.workspaceMember.findFirst({
        where: { userId: caller.id, workspace: { isPersonal: true } },
        orderBy: { joinedAt: "asc" },
        include: { workspace: true },
      });

      if (membership) {
        workspace = membership.workspace;
        role = membership.role;
      } else {
        workspace = await prisma.workspace.create({
          data: {
            name: `${caller.name || "My"}'s workspace`,
            description: "Personal workspace",
            isPersonal: true,
            ownerId: caller.id,
          },
        });
        await prisma.workspaceMember.create({
          data: { userId: caller.id, workspaceId: workspace.id, role: "ADMIN" },
        });
        await prisma.user.update({
          where: { id: caller.id },
          data: { workspaceId: workspace.id },
        });
      }
    } else {
      const accepted = await acceptWorkspaceInvitation(prisma, caller, validation.data.token);
      if (accepted.error) {
        if (accepted.status === 500) logApiError("Onboarding", "join", accepted.cause);
        return errorResponse(accepted.error, accepted.status);
      }
      workspace = accepted.workspace;
      role = accepted.role;
    }

    await prisma.session.update({
      where: { id: caller.sessionId },
      data: { workspaceId: workspace.id },
    });

    return Response.json({
      workspaceId: workspace.id,
      name: workspace.name,
      isPersonal: workspace.isPersonal,
      role,
    });
  } catch (error) {
    logApiError("Onboarding", "workspace choice", error);
    return errorResponse("Unable to set up that workspace. Please try again.", 500);
  }
}
