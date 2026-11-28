import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { requireTaskMember } from "@/app/lib/session";
import { buildTaskTimeline } from "@/app/lib/taskTimeline";

export async function GET(_request, { params }) {
  const { id } = await params;
  const access = await requireTaskMember(prisma, id, "MEMBER");
  if (access.error) return errorResponse(access.error, access.status);

  try {
    const task = await prisma.task.findFirst({
      where: { id, workspaceId: access.workspaceId },
      include: {
        history: {
          orderBy: { createdAt: "asc" },
          include: { actor: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    const activities = await prisma.activity.findMany({
      where: {
        workspaceId: access.workspaceId,
        OR: [
          { targetId: id },
          { metadata: { contains: `"taskId":"${id}"` } },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: { actor: { select: { id: true, name: true, email: true } } },
    });

    const taskActivities = activities.filter((activity) => {
      if (activity.targetId === id) return true;
      try {
        const metadata = activity.metadata ? JSON.parse(activity.metadata) : null;
        return metadata?.taskId === id;
      } catch {
        return false;
      }
    });

    return Response.json(buildTaskTimeline(task, taskActivities));
  } catch (error) {
    logApiError("Activity", "load", error);
    return errorResponse("Unable to load activity.", 500);
  }
}
