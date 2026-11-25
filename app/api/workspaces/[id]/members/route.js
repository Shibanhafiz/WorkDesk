import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { requireWorkspaceMember } from "@/app/lib/session";

/**
 * GET /api/workspaces/[id]/members — list members with role and specialization.
 */
export async function GET(_request, { params }) {
  const { id } = await params;
  const access = await requireWorkspaceMember(prisma, id, "MEMBER");
  if (access.error) return errorResponse(access.error, access.status);

  try {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            specialization: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
    return Response.json(
      members.map((m) => ({
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        specialization: m.user.specialization,
        avatarUrl: m.user.avatarUrl,
        joinedAt: m.joinedAt,
      })),
    );
  } catch (error) {
    logApiError("Member", "load", error);
    return errorResponse("Unable to load members. Please try again.", 500);
  }
}
