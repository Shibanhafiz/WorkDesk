import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { getSessionUser } from "@/app/lib/session";
import { isInvitationExpired } from "@/app/lib/invitationToken";
import { isJsonObjectBody } from "@/app/lib/requestBody";

/**
 * POST /api/invitations/reject — reject by token using the session user.
 */
export async function POST(request) {
  const user = await getSessionUser(prisma);
  if (!user) return errorResponse("Authentication required.", 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  if (!isJsonObjectBody(body)) {
    return errorResponse("Request body must be a JSON object.", 400);
  }

  const { token } = body;
  if (!token) return errorResponse("Token is required.", 400);

  try {
    const invitation = await prisma.invitation.findUnique({ where: { token } });
    if (!invitation) return errorResponse("Invitation not found.", 404);
    if (invitation.acceptedAt) return errorResponse("Invitation has already been used.", 410);
    if (invitation.rejectedAt) return errorResponse("Invitation has already been declined.", 410);
    if (isInvitationExpired(invitation.expiresAt)) {
      return errorResponse("Invitation has expired.", 410);
    }
    if (invitation.email && invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return errorResponse("This invitation was sent to a different email address.", 403);
    }

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { rejectedAt: new Date() },
    });
    return Response.json({ success: true });
  } catch (error) {
    logApiError("Invitation", "reject", error);
    return errorResponse("Unable to reject invitation. Please try again.", 500);
  }
}
