// Role hierarchy: ADMIN > MANAGER > MEMBER
export const ROLE_HIERARCHY = {
  ADMIN: 3,
  MANAGER: 2,
  MEMBER: 1,
};

// Employee specializations (separate from workspace role).
// Developer and Designer inherit Member-level permissions.
export const SPECIALIZATIONS = {
  DEVELOPER: "DEVELOPER",
  DESIGNER: "DESIGNER",
  OTHER: "OTHER",
};

// Specializations eligible for task assignment.
export const ASSIGNABLE_SPECIALIZATIONS = new Set([
  SPECIALIZATIONS.DEVELOPER,
  SPECIALIZATIONS.DESIGNER,
]);

export const SPECIALIZATION_LABELS = {
  [SPECIALIZATIONS.DEVELOPER]: "Developer",
  [SPECIALIZATIONS.DESIGNER]: "Designer",
  [SPECIALIZATIONS.OTHER]: "Other",
};

export const SPECIALIZATION_TONES = {
  [SPECIALIZATIONS.DEVELOPER]: "priority-medium",
  [SPECIALIZATIONS.DESIGNER]: "priority-high",
  [SPECIALIZATIONS.OTHER]: "priority-low",
};

export const ROLE_LABELS = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  MEMBER: "Member",
};

/**
 * Check if a user role has permission for a required role.
 */
export function can(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[userRole];
  const requiredLevel = ROLE_HIERARCHY[requiredRole];

  if (userLevel === undefined || requiredLevel === undefined) {
    return false;
  }

  return userLevel >= requiredLevel;
}

/**
 * Check if a specialization makes a user eligible for task assignment.
 */
export function canBeAssigned(specialization) {
  return ASSIGNABLE_SPECIALIZATIONS.has(specialization);
}

/**
 * Get the display label for a specialization.
 */
export function getSpecializationLabel(specialization) {
  return SPECIALIZATION_LABELS[specialization] || specialization;
}

/**
 * Get the CSS tone class for a specialization badge.
 */
export function getSpecializationTone(specialization) {
  return SPECIALIZATION_TONES[specialization] || "priority-low";
}

/**
 * Check whether a workspace role can manage members (invite, update, remove).
 * Only ADMIN can manage workspace members and settings.
 */
export function canManageMembers(userRole) {
  return can(userRole, "ADMIN");
}

/**
 * Check whether a workspace role can manage projects and tasks.
 * ADMIN and MANAGER can manage; MEMBER can only execute assigned work.
 */
export function canManageWork(userRole) {
  return can(userRole, "MANAGER");
}

/**
 * Verify workspace membership and role.
 * Also returns the user's specialization from the membership record.
 * Returns { error, role, specialization } or { error: null, role, specialization }.
 */
export async function verifyWorkspaceAccess(
  prisma,
  workspaceId,
  userId,
  requiredRole = "MEMBER"
) {
  // Validate workspaceId format (UUID check)
  if (!workspaceId || typeof workspaceId !== "string") {
    return { error: "Invalid workspace ID.", role: null, specialization: null };
  }

  // Check if user is a member of the workspace
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: userId,
      workspaceId: workspaceId,
    },
    include: {
      user: true,
    },
  });

  if (!membership) {
    return { error: "You are not a member of this workspace.", role: null, specialization: null };
  }

  const userRole = membership.role;
  const specialization = membership.user ? membership.user.specialization : null;

  // Check if user has required role
  if (!can(userRole, requiredRole)) {
    return {
      error: `Insufficient permissions. Required: ${requiredRole}, Your role: ${userRole}.`,
      role: userRole,
      specialization,
    };
  }

  return { error: null, role: userRole, specialization };
}

/**
 * Verify project workspace ownership
 */
export async function verifyProjectWorkspace(
  prisma,
  projectId,
  workspaceId,
  userId,
  requiredRole = "MEMBER"
) {
  // Check project belongs to workspace
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { workspace: true },
  });

  if (!project || project.workspaceId !== workspaceId) {
    return { error: "Project not found in this workspace.", role: null, specialization: null };
  }

  // Check user membership in workspace
  const result = await verifyWorkspaceAccess(prisma, workspaceId, userId, requiredRole);
  if (result.error) return result;

  return { error: null, role: result.role, specialization: result.specialization };
}

/**
 * Verify task workspace and membership
 */
export async function verifyTaskAccess(
  prisma,
  taskId,
  workspaceId,
  userId,
  requiredRole = "MEMBER"
) {
  // Check task belongs to workspace
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      workspaceId: workspaceId,
    },
    include: {
      project: {
        include: { workspace: true },
      },
      assignee: true,
    },
  });

  if (!task) {
    return { error: "Task not found in this workspace.", role: null, specialization: null, task: null };
  }

  // Check user membership in workspace
  const result = await verifyWorkspaceAccess(prisma, workspaceId, userId, requiredRole);
  if (result.error) return result;

  // If assigning/updating task assignee, check assignee is in same workspace
  if (task.assigneeId && task.assigneeId !== userId) {
    const assigneeMembership = await prisma.workspaceMember.findFirst({
      where: {
        userId: task.assigneeId,
        workspaceId: workspaceId,
      },
      include: {
        user: true,
      },
    });
    if (!assigneeMembership) {
      return {
        error: "Task assignee is not a member of this workspace.",
        role: null,
        specialization: null,
        task,
      };
    }
  }

  return { error: null, role: result.role, specialization: result.specialization, task };
}

/**
 * Verify that a target user can be assigned a task in the workspace.
 * The target must be a workspace member with an assignable specialization
 * (Developer or Designer).
 * Returns { error, member, specialization } or { error: null, member, specialization }.
 */
export async function verifyAssignableMember(
  prisma,
  workspaceId,
  targetUserId,
  actorUserId,
  actorRole
) {
  // Only MANAGER+ can assign tasks
  if (!canManageWork(actorRole)) {
    return {
      error: "Only managers and admins can assign tasks.",
      member: null,
      specialization: null,
    };
  }

  // Target must be a member of the same workspace (prevents cross-workspace assignment)
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: targetUserId,
      workspaceId: workspaceId,
    },
    include: {
      user: true,
    },
  });

  if (!membership) {
    return {
      error: "User is not a member of this workspace.",
      member: null,
      specialization: null,
    };
  }

  const specialization = membership.user ? membership.user.specialization : null;

  // Target must have an assignable specialization (Developer or Designer)
  if (!canBeAssigned(specialization)) {
    return {
      error: "Only Developers and Designers can be assigned tasks.",
      member: membership,
      specialization,
    };
  }

  return { error: null, member: membership, specialization };
}

/**
 * Prevent privilege escalation: a user cannot change their own role to a
 * higher level without ADMIN authorization. Returns an error if the requested
 * role would exceed the actor's own role.
 */
export function validateRoleChange(actorRole, requestedRole, targetRole) {
  const actorLevel = ROLE_HIERARCHY[actorRole];
  const requestedLevel = ROLE_HIERARCHY[requestedRole];

  if (actorLevel === undefined || requestedLevel === undefined) {
    return { error: "Invalid role." };
  }

  // Cannot escalate beyond your own role
  if (requestedLevel > actorLevel) {
    return {
      error: `Cannot assign role "${requestedRole}". Your role is "${actorRole}".`,
    };
  }

  // Cannot change your own role without ADMIN authorization
  if (requestedRole === actorRole && targetRole !== undefined) {
    // Same-role change is allowed for ADMIN managing others
  }

  return { error: null };
}
