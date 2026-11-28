import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { requireTaskMember } from "@/app/lib/session";
import { can } from "@/app/lib/workspacePermissions";
import { recordActivity, ACTIVITY_TYPES } from "@/app/lib/activityLog";

export async function DELETE(_request, { params }) {
  const { id, linkId } = await params;
  const access = await requireTaskMember(prisma, id, "MEMBER");
  if (access.error) return errorResponse(access.error, access.status);

  try {
    const link = await prisma.taskLink.findFirst({
      where: { id: linkId, taskId: id },
    });
    if (!link) return errorResponse("Link not found.", 404);
    if (link.createdById !== access.userId && !can(access.role, "MANAGER")) {
      return errorResponse("You cannot delete this link.", 403);
    }
    await prisma.taskLink.delete({ where: { id: linkId } });
    await recordActivity(prisma, {
      workspaceId: access.workspaceId,
      actorId: access.userId,
      type: ACTIVITY_TYPES.LINK_REMOVED,
      targetId: linkId,
      targetType: "LINK",
      metadata: { taskId: id, url: link.url },
    });
    return Response.json({ id: linkId });
  } catch (error) {
    logApiError("Link", "delete", error);
    return errorResponse("Unable to delete link.", 500);
  }
}
