import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { requireWorkspaceMember } from "@/app/lib/session";
import { SPECIALIZATIONS } from "@/app/lib/workspacePermissions";
import { recordActivity, ACTIVITY_TYPES } from "@/app/lib/activityLog";

const VALID_ROLES = ["ADMIN", "MANAGER", "MEMBER"];
const VALID_SPECIALIZATIONS = new Set([
  SPECIALIZATIONS.DEVELOPER,
  SPECIALIZATIONS.DESIGNER,
  SPECIALIZATIONS.OTHER,
]);

/**
 * PATCH /api/workspaces/[id]/members/[userId]
 * ADMIN only: change a member's workspace role and/or user specialization.
 */
export async function PATCH(request, { params }) {
  const { id, userId: targetUserId } = await params;
  const access = await requireWorkspaceMember(prisma, id, "ADMIN");
  if (access.error) return errorResponse(access.error, access.status);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const { role, specialization } = body;
  if (role !== undefined && !VALID_ROLES.includes(role)) {
    return errorResponse("Invalid role.", 400);
  }
  if (
    specialization !== undefined &&
    !VALID_SPECIALIZATIONS.has(specialization)
  ) {
    return errorResponse("Invalid specialization.", 400);
  }

  try {
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: targetUserId, workspaceId: id },
      include: { user: true },
    });
    if (!membership) return errorResponse("Member not found.", 404);

    if (role !== undefined) {
      await prisma.workspaceMember.update({
        where: { id: membership.id },
        data: { role },
      });
    }
    if (specialization !== undefined) {
      await prisma.user.update({
        where: { id: targetUserId },
        data: { specialization },
      });
    }
    if (role !== undefined && role !== membership.role) {
      await recordActivity(prisma, {
        workspaceId: id,
        actorId: access.userId,
        type: ACTIVITY_TYPES.MEMBER_ROLE_CHANGED,
        targetId: targetUserId,
        targetType: "MEMBER",
        metadata: { from: membership.role, to: role },
      });
    }

    const updated = await prisma.workspaceMember.findFirst({
      where: { userId: targetUserId, workspaceId: id },
      include: {
        user: { select: { id: true, name: true, email: true, specialization: true } },
      },
    });
    return Response.json({
      userId: updated.userId,
      name: updated.user.name,
      email: updated.user.email,
      role: updated.role,
      specialization: updated.user.specialization,
    });
  } catch (error) {
    logApiError("Member", "update", error);
    return errorResponse("Unable to update member.", 500);
  }
}

/**
 * DELETE /api/workspaces/[id]/members/[userId] — ADMIN only.
 */
export async function DELETE(_request, { params }) {
  const { id, userId: targetUserId } = await params;
  const access = await requireWorkspaceMember(prisma, id, "ADMIN");
  if (access.error) return errorResponse(access.error, access.status);

  try {
    if (targetUserId === access.userId) {
      const adminCount = await prisma.workspaceMember.count({
        where: { workspaceId: id, role: "ADMIN" },
      });
      if (adminCount <= 1) {
        return errorResponse("Cannot remove yourself as the last admin.", 400);
      }
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: targetUserId, workspaceId: id },
    });
    if (!membership) return errorResponse("Member not found.", 404);

    await prisma.workspaceMember.delete({ where: { id: membership.id } });
    await prisma.task.updateMany({
      where: { assigneeId: targetUserId, workspaceId: id },
      data: { assigneeId: null },
    });
    await recordActivity(prisma, {
      workspaceId: id,
      actorId: access.userId,
      type: ACTIVITY_TYPES.MEMBER_REMOVED,
      targetId: targetUserId,
      targetType: "MEMBER",
      metadata: { role: membership.role },
    });
    return Response.json({ removed: true });
  } catch (error) {
    logApiError("Member", "remove", error);
    return errorResponse("Unable to remove member. Please try again.", 500);
  }
}
