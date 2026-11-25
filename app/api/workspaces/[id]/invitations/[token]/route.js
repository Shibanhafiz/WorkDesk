import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { requireWorkspaceMember } from "@/app/lib/session";
import { recordActivity, ACTIVITY_TYPES } from "@/app/lib/activityLog";

/**
 * DELETE /api/workspaces/[id]/invitations/[token] — ADMIN only.
 */
export async function DELETE(_request, { params }) {
  const { id, token } = await params;
  const access = await requireWorkspaceMember(prisma, id, "ADMIN");
  if (access.error) return errorResponse(access.error, access.status);

  try {
    const invitation = await prisma.invitation.findFirst({
      where: { token, workspaceId: id },
    });
    if (!invitation) return errorResponse("Invitation not found.", 404);
    if (invitation.acceptedAt) {
      return errorResponse("Cannot revoke an already-accepted invitation.", 400);
    }
    await prisma.invitation.delete({ where: { id: invitation.id } });
    await recordActivity(prisma, {
      workspaceId: id,
      actorId: access.userId,
      type: ACTIVITY_TYPES.INVITATION_REVOKED,
      targetId: invitation.id,
      targetType: "INVITATION",
      metadata: { email: invitation.email, role: invitation.role },
    });
    return Response.json({ revoked: true });
  } catch (error) {
    logApiError("Invitation", "revoke", error);
    return errorResponse("Unable to revoke invitation. Please try again.", 500);
  }
}
