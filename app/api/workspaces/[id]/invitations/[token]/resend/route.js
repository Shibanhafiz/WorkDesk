import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { requireWorkspaceMember } from "@/app/lib/session";
import {
  generateInvitationToken,
  getDefaultExpiryDate,
} from "@/app/lib/invitationToken";
import { recordActivity, ACTIVITY_TYPES } from "@/app/lib/activityLog";

export async function POST(_request, { params }) {
  const { id, token } = await params;
  const access = await requireWorkspaceMember(prisma, id, "ADMIN");
  if (access.error) return errorResponse(access.error, access.status);

  try {
    const invitation = await prisma.invitation.findFirst({
      where: { token, workspaceId: id },
    });
    if (!invitation) return errorResponse("Invitation not found.", 404);
    if (invitation.acceptedAt) {
      return errorResponse("An accepted invitation cannot be resent.", 400);
    }

    if (invitation.email) {
      const duplicate = await prisma.invitation.findFirst({
        where: {
          workspaceId: id,
          email: invitation.email,
          id: { not: invitation.id },
          acceptedAt: null,
          rejectedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (duplicate) {
        return errorResponse("An active invitation already exists for this email.", 409);
      }
    }

    const updated = await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        token: generateInvitationToken(),
        expiresAt: getDefaultExpiryDate(),
        rejectedAt: null,
      },
    });

    const webhookUrl = process.env.INVITATION_WEBHOOK_URL;
    let delivered = false;
    if (webhookUrl && updated.email) {
      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: updated.email,
            token: updated.token,
            role: updated.role,
            workspaceId: id,
            expiresAt: updated.expiresAt,
          }),
        });
        delivered = response.ok;
      } catch (error) {
        logApiError("Invitation", "resend delivery", error);
      }
    }

    await recordActivity(prisma, {
      workspaceId: id,
      actorId: access.userId,
      type: ACTIVITY_TYPES.INVITATION_SENT,
      targetId: updated.id,
      targetType: "INVITATION",
      metadata: { email: updated.email, role: updated.role, resent: true },
    });

    return Response.json({
      id: updated.id,
      token: updated.token,
      email: updated.email,
      role: updated.role,
      expiresAt: updated.expiresAt,
      delivered,
    });
  } catch (error) {
    logApiError("Invitation", "resend", error);
    return errorResponse("Unable to resend invitation. Please try again.", 500);
  }
}
