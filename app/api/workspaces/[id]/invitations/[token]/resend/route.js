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
    const updated = await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findFirst({
        where: { token, workspaceId: id },
      });
      if (!invitation) return { error: "Invitation not found.", status: 404 };
      if (invitation.acceptedAt) {
        return { error: "An accepted invitation cannot be resent.", status: 400 };
      }
      if (invitation.rejectedAt) {
        return { error: "A declined invitation cannot be resent.", status: 400 };
      }

      if (invitation.email) {
        const duplicate = await tx.invitation.findFirst({
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
          return { error: "An active invitation already exists for this email.", status: 409 };
        }
      }

      return {
        invitation: await tx.invitation.update({
          where: { id: invitation.id },
          data: {
            token: generateInvitationToken(),
            expiresAt: getDefaultExpiryDate(),
          },
        }),
      };
    });

    if (updated.error) return errorResponse(updated.error, updated.status);
    const invitation = updated.invitation;

    const webhookUrl = process.env.INVITATION_WEBHOOK_URL;
    let delivered = false;
    if (webhookUrl && invitation.email) {
      try {
        if (process.env.NODE_ENV === "production" && !webhookUrl.startsWith("https://")) {
          throw new Error("Webhook URL must use HTTPS in production");
        }
        const headers = { "Content-Type": "application/json" };
        if (process.env.INVITATION_WEBHOOK_SECRET) {
          headers.Authorization = `Bearer ${process.env.INVITATION_WEBHOOK_SECRET}`;
        }
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            email: invitation.email,
            token: invitation.token,
            role: invitation.role,
            workspaceId: id,
            expiresAt: invitation.expiresAt,
          }),
        });
        delivered = response.ok;
        if (!delivered) {
          logApiError("Invitation", "resend delivery", new Error(`Webhook status ${response.status}`));
        }
      } catch (error) {
        logApiError("Invitation", "resend delivery", error);
      }
    }

    await recordActivity(prisma, {
      workspaceId: id,
      actorId: access.userId,
      type: ACTIVITY_TYPES.INVITATION_SENT,
      targetId: invitation.id,
      targetType: "INVITATION",
      metadata: { email: invitation.email, role: invitation.role, resent: true },
    });

    return Response.json({
      id: invitation.id,
      token: invitation.token,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      delivered,
    });
  } catch (error) {
    logApiError("Invitation", "resend", error);
    return errorResponse("Unable to resend invitation. Please try again.", 500);
  }
}
