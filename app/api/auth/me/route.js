import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/session";

/**
 * GET /api/auth/me — current session identity and workspace context.
 */
export async function GET() {
  const user = await getSessionUser(prisma);
  if (!user) {
    return Response.json({ user: null }, { status: 200 });
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      onboardingCompleted: true,
      onboardingStep: true,
      checklistDismissed: true,
      avatarUrl: true,
    },
  });

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: user.id },
    select: { workspaceId: true, role: true },
    orderBy: { joinedAt: "asc" },
  });

  const activeMembership =
    memberships.find((item) => item.workspaceId === user.workspaceId) ??
    memberships[0] ??
    null;

  return Response.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: activeMembership?.role ?? user.role,
      specialization: user.specialization,
      avatarUrl: profile?.avatarUrl ?? null,
      onboardingCompleted: profile?.onboardingCompleted ?? true,
      onboardingStep: profile?.onboardingStep ?? 3,
      checklistDismissed: profile?.checklistDismissed ?? false,
    },
    workspaceId: activeMembership?.workspaceId ?? null,
  });
}
