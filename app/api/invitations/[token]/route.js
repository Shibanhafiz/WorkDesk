import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import {
  isInvitationExpired,
} from "@/app/lib/invitationToken";

/**
 * GET /api/invitations/[token]
 * Preview invitation details by token (no auth required - used by invitee).
 */
export async function GET(_request, { params }) {
  const { token } = await params;

  if (!token) {
    return errorResponse("Token is required.", 400);
  }

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        workspace: {
          select: { id: true, name: true, description: true },
        },
      },
    });

    if (!invitation) {
      return errorResponse("Invitation not found.", 404);
    }

    const expired = isInvitationExpired(invitation.expiresAt);
    const used = Boolean(invitation.acceptedAt);
    const declined = Boolean(invitation.rejectedAt);

    return Response.json({
      workspace: invitation.workspace,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      expired,
      used,
      declined,
      valid: !expired && !used && !declined,
    });
  } catch (error) {
    logApiError("Invitation", "preview", error);
    return errorResponse("Unable to load invitation. Please try again.", 500);
  }
}