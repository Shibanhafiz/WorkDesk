import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { requireWorkspaceMember } from "@/app/lib/session";
import { serializeActivity } from "@/app/lib/activityLog";

export async function GET(request, { params }) {
  const { id } = await params;
  const access = await requireWorkspaceMember(prisma, id, "MEMBER");
  if (access.error) return errorResponse(access.error, access.status);

  const { searchParams } = new URL(request.url);
  const requestedLimit = Number(searchParams.get("limit"));
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), 100)
    : 50;

  try {
    const activities = await prisma.activity.findMany({
      where: { workspaceId: id },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { actor: { select: { id: true, name: true, email: true } } },
    });
    return Response.json(activities.map(serializeActivity));
  } catch (error) {
    logApiError("Activity", "load workspace history", error);
    return errorResponse("Unable to load activity history.", 500);
  }
}
