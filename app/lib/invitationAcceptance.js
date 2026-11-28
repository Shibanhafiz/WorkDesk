import { isInvitationExpired } from "./invitationToken.js";
import { recordActivity, ACTIVITY_TYPES } from "./activityLog.js";
import {
  createNotificationOnce,
  NOTIFICATION_TYPES,
  eventDedupeKey,
} from "./notifications.js";

class InvitationRuleError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function acceptWorkspaceInvitation(prisma, user, token) {
  if (!token || typeof token !== "string") {
    return { error: "Token is required.", status: 400 };
  }

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { workspace: true },
    });
    if (!invitation) return { error: "Invitation not found.", status: 404 };
    if (invitation.acceptedAt) {
      return { error: "Invitation has already been used.", status: 410 };
    }
    if (invitation.rejectedAt) {
      return { error: "Invitation has been declined.", status: 410 };
    }
    if (isInvitationExpired(invitation.expiresAt)) {
      return { error: "Invitation has expired.", status: 410 };
    }
    if (invitation.email && invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return {
        error: "This invitation was sent to a different email address.",
        status: 403,
      };
    }

    const existing = await prisma.workspaceMember.findFirst({
      where: { userId: user.id, workspaceId: invitation.workspaceId },
    });
    if (existing) {
      return { error: "You are already a member of this workspace.", status: 409 };
    }

    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.invitation.updateMany({
        where: { id: invitation.id, acceptedAt: null, rejectedAt: null },
        data: { acceptedAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new InvitationRuleError("Invitation has already been used.", 410);
      }

      try {
        await tx.workspaceMember.create({
          data: {
            userId: user.id,
            workspaceId: invitation.workspaceId,
            role: invitation.role,
          },
        });
      } catch (error) {
        if (error && typeof error === "object" && error.code === "P2002") {
          throw new InvitationRuleError("You are already a member of this workspace.", 409);
        }
        throw error;
      }

      if (invitation.specialization) {
        await tx.user.update({
          where: { id: user.id },
          data: { specialization: invitation.specialization },
        });
      }
      await recordActivity(tx, {
        workspaceId: invitation.workspaceId,
        actorId: user.id,
        type: ACTIVITY_TYPES.MEMBER_JOINED,
        targetId: user.id,
        targetType: "MEMBER",
        metadata: { role: invitation.role },
      });

      await createNotificationOnce(tx, {
        userId: invitation.invitedById,
        type: NOTIFICATION_TYPES.INVITATION_RECEIVED,
        title: "Invitation accepted",
        body: `${user.name || user.email} joined ${invitation.workspace.name}`,
        link: "/team",
        dedupeKey: eventDedupeKey("invite-accepted", invitation.id, invitation.invitedById),
      });

      return { workspace: invitation.workspace, role: invitation.role };
    });

    return result;
  } catch (error) {
    if (error instanceof InvitationRuleError) {
      return { error: error.message, status: error.status };
    }
    return {
      error: "Unable to accept invitation. Please try again.",
      status: 500,
      cause: error,
    };
  }
}
