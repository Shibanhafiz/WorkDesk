import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  SHORT_SESSION_TTL_SECONDS,
  createSessionToken,
  sessionCookieOptions,
} from "./sessionToken.js";

export {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  SHORT_SESSION_TTL_SECONDS,
  createSessionToken,
  sessionCookieOptions,
};

export async function createSession(prisma, userId, { remember = false, workspaceId = null } = {}) {
  const token = createSessionToken();
  const ttlSeconds = remember ? SESSION_TTL_SECONDS : SHORT_SESSION_TTL_SECONDS;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await prisma.session.create({
    data: { token, userId, workspaceId, expiresAt },
  });
  return { token, expiresAt };
}

/**
 * Resolve the current user from the session cookie. Returns null when the
 * session is missing, expired, or its user no longer exists.
 */
export async function getSessionUser(prisma) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }
    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      specialization: session.user.specialization,
      sessionId: session.id,
      workspaceId: session.workspaceId,
    };
  } catch {
    return null;
  }
}

/**
 * Route-handler guard. Returns { user } or { error: Response }.
 */
export async function requireSession(prisma) {
  const user = await getSessionUser(prisma);
  if (!user) {
    return {
      error: Response.json({ error: "Authentication required." }, { status: 401 }),
    };
  }
  return { user };
}

/**
 * Resolve the session user and verify membership in a workspace.
 * Returns { userId, role, specialization } or { error: string, status }.
 */
export async function requireWorkspaceMember(prisma, workspaceId, requiredRole = "MEMBER") {
  const user = await getSessionUser(prisma);
  if (!user) {
    return { error: "Authentication required.", status: 401 };
  }
  if (!workspaceId || typeof workspaceId !== "string") {
    return { error: "workspaceId is required.", status: 400 };
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspaceId },
    include: { user: true },
  });
  if (!membership) {
    return { error: "You are not a member of this workspace.", status: 403 };
  }

  const levels = { ADMIN: 3, MANAGER: 2, MEMBER: 1 };
  if ((levels[membership.role] ?? 0) < (levels[requiredRole] ?? 0)) {
    return { error: "Insufficient permissions.", status: 403 };
  }

  return {
    userId: user.id,
    role: membership.role,
    specialization: membership.user?.specialization ?? user.specialization,
  };
}

/**
 * Persist the active workspace on the current session after verifying that
 * the caller is a member of that workspace.
 */
export async function setActiveWorkspace(prisma, workspaceId) {
  const user = await getSessionUser(prisma);
  if (!user) return { error: "Authentication required.", status: 401 };

  const access = await requireWorkspaceMember(prisma, workspaceId, "MEMBER");
  if (access.error) return access;

  await prisma.session.update({
    where: { id: user.sessionId },
    data: { workspaceId },
  });

  return { workspaceId, status: 200 };
}

/**
 * Resolve the session user and verify membership in a task's workspace.
 * Returns { userId, role, task, workspaceId } or { error, status }.
 */
export async function requireTaskMember(prisma, taskId, requiredRole = "MEMBER") {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { error: "Task not found.", status: 404 };
  if (!task.workspaceId) {
    return { error: "Task has no workspace.", status: 400 };
  }
  const access = await requireWorkspaceMember(prisma, task.workspaceId, requiredRole);
  if (access.error) return access;
  return { ...access, task, workspaceId: task.workspaceId };
}

/**
 * Expire and delete the session identified by the current cookie.
 */
export async function destroySession(prisma) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
  }
  return token;
}
