import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { getSessionUser } from "@/app/lib/session";
import { acceptWorkspaceInvitation } from "@/app/lib/invitationAcceptance";

/**
 * POST /api/invitations/accept — accept by token using the session user.
 * The recipient is derived from the session, never from the request body.
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

  const result = await acceptWorkspaceInvitation(prisma, user, body?.token);
  if (result.error) {
    if (result.status === 500) logApiError("Invitation", "accept", result.cause);
    return errorResponse(result.error, result.status);
  }

  await prisma.session.update({
    where: { id: user.sessionId },
    data: { workspaceId: result.workspace.id },
  });

  return Response.json({
    success: true,
    workspace: result.workspace,
    role: result.role,
  });
}
