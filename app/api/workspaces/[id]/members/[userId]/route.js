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

class MemberRuleError extends Error {}

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
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse("Request body must be a JSON object.", 400);
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
  if (role === undefined && specialization === undefined) {
    return errorResponse("No member changes were provided.", 400);
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const membership = await tx.workspaceMember.findFirst({
        where: { userId: targetUserId, workspaceId: id },
        include: { user: true },
      });
      if (!membership) throw new MemberRuleError("Member not found.");

      if (role !== undefined && role !== membership.role) {
        if (targetUserId === access.userId) {
          throw new MemberRuleError("You cannot change your own role.");
        }
        if (membership.role === "ADMIN" && role !== "ADMIN") {
          const adminCount = await tx.workspaceMember.count({
            where: { workspaceId: id, role: "ADMIN" },
          });
          if (adminCount <= 1) {
            throw new MemberRuleError("Cannot demote the last admin.");
          }
        }
        await tx.workspaceMember.update({
          where: { id: membership.id },
          data: { role },
        });
        await recordActivity(tx, {
          workspaceId: id,
          actorId: access.userId,
          type: ACTIVITY_TYPES.MEMBER_ROLE_CHANGED,
          targetId: targetUserId,
          targetType: "MEMBER",
          metadata: { from: membership.role, to: role },
        });
      }

      if (specialization !== undefined) {
        await tx.user.update({
          where: { id: targetUserId },
          data: { specialization },
        });
      }

      return tx.workspaceMember.findFirst({
        where: { userId: targetUserId, workspaceId: id },
        include: {
          user: { select: { id: true, name: true, email: true, specialization: true } },
        },
      });
    });

    return Response.json({
      userId: updated.userId,
      name: updated.user.name,
      email: updated.user.email,
      role: updated.role,
      specialization: updated.user.specialization,
    });
  } catch (error) {
    if (error instanceof MemberRuleError) {
      return errorResponse(error.message, error.message === "Member not found." ? 404 : 400);
    }
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
    await prisma.$transaction(async (tx) => {
      const membership = await tx.workspaceMember.findFirst({
        where: { userId: targetUserId, workspaceId: id },
      });
      if (!membership) throw new MemberRuleError("Member not found.");

      if (membership.role === "ADMIN") {
        const adminCount = await tx.workspaceMember.count({
          where: { workspaceId: id, role: "ADMIN" },
        });
        if (adminCount <= 1) {
          throw new MemberRuleError("Cannot remove the last admin.");
        }
      }

      await tx.workspaceMember.delete({ where: { id: membership.id } });
      await tx.task.updateMany({
        where: { assigneeId: targetUserId, workspaceId: id },
        data: { assigneeId: null },
      });
      await recordActivity(tx, {
        workspaceId: id,
        actorId: access.userId,
        type: ACTIVITY_TYPES.MEMBER_REMOVED,
        targetId: targetUserId,
        targetType: "MEMBER",
        metadata: { role: membership.role },
      });
    });

    return Response.json({ removed: true });
  } catch (error) {
    if (error instanceof MemberRuleError) {
      return errorResponse(error.message, error.message === "Member not found." ? 404 : 400);
    }
    logApiError("Member", "remove", error);
    return errorResponse("Unable to remove member. Please try again.", 500);
  }
}
