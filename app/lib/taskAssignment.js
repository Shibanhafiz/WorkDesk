import { canManageWork, verifyAssignableMember } from "./workspacePermissions.js";

/**
 * Authorize who may set the assignee of a task.
 *
 * Rules:
 * - MANAGER and ADMIN may assign any current workspace member, or clear the
 *   assignee (unassigned).
 * - Any workspace member may assign the task to themselves (self-claim) and
 *   may leave the task unassigned.
 * - The target must be a member of the same workspace; cross-workspace
 *   assignment is always rejected.
 *
 * Returns { error } on rejection or { error: null, assigneeId } where
 * `assigneeId` is null when the task should be unassigned.
 */
export async function authorizeAssignment(
  prisma,
  { workspaceId, actorId, actorRole, assigneeId },
) {
  if (assigneeId === null || assigneeId === undefined) {
    return { error: null, assigneeId: null };
  }

  if (assigneeId === actorId) {
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: actorId, workspaceId },
    });
    if (!membership) {
      return { error: "Assignee must be a member of this workspace." };
    }
    return { error: null, assigneeId };
  }

  if (!canManageWork(actorRole)) {
    return {
      error: "Only managers and admins can assign tasks to other members.",
    };
  }

  const assignable = await verifyAssignableMember(
    prisma,
    workspaceId,
    assigneeId,
    actorId,
    actorRole,
  );
  if (assignable.error) {
    return { error: assignable.error };
  }

  return { error: null, assigneeId };
}

/**
 * Whether a member may edit the non-status fields of a task.
 * Members may edit tasks they are assigned; managers and admins may edit
 * every workspace task. Self-assignment of an unassigned task is allowed so
 * a member can claim work.
 */
export function canEditTask({ actorRole, actorId, taskAssigneeId, isSelfAssignment = false }) {
  return (
    taskAssigneeId === actorId ||
    canManageWork(actorRole) ||
    (isSelfAssignment && taskAssigneeId == null)
  );
}
