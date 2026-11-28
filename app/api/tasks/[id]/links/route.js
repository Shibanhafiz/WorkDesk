import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { requireTaskMember } from "@/app/lib/session";
import { isJsonObjectBody } from "@/app/lib/requestBody";
import { validateTaskLinkInput } from "@/app/lib/taskLinkValidation";
import { recordActivity, ACTIVITY_TYPES } from "@/app/lib/activityLog";
import {
  createNotificationOnce,
  NOTIFICATION_TYPES,
} from "@/app/lib/notifications";

const includeCreator = {
  createdBy: { select: { id: true, name: true, email: true } },
};

function serializeLink(link) {
  return {
    id: link.id,
    taskId: link.taskId,
    url: link.url,
    title: link.title,
    createdAt: link.createdAt,
    createdBy: link.createdBy,
  };
}

export async function GET(_request, { params }) {
  const { id } = await params;
  const access = await requireTaskMember(prisma, id, "MEMBER");
  if (access.error) return errorResponse(access.error, access.status);

  try {
    const links = await prisma.taskLink.findMany({
      where: { taskId: id },
      orderBy: { createdAt: "asc" },
      include: includeCreator,
    });
    return Response.json(links.map(serializeLink));
  } catch (error) {
    logApiError("Link", "load", error);
    return errorResponse("Unable to load links.", 500);
  }
}

export async function POST(request, { params }) {
  const { id } = await params;
  const access = await requireTaskMember(prisma, id, "MEMBER");
  if (access.error) return errorResponse(access.error, access.status);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }
  if (!isJsonObjectBody(body)) {
    return errorResponse("Request body must be a JSON object.", 400);
  }

  const validation = validateTaskLinkInput(body);
  if (validation.error) return errorResponse(validation.error, 400);

  try {
    const link = await prisma.taskLink.create({
      data: {
        taskId: id,
        url: validation.data.url,
        title: validation.data.title,
        createdById: access.userId,
      },
      include: includeCreator,
    });

    await recordActivity(prisma, {
      workspaceId: access.workspaceId,
      actorId: access.userId,
      type: ACTIVITY_TYPES.LINK_ADDED,
      targetId: link.id,
      targetType: "LINK",
      metadata: { taskId: id, url: link.url },
    });

    if (access.task.assigneeId && access.task.assigneeId !== access.userId) {
      await createNotificationOnce(prisma, {
        userId: access.task.assigneeId,
        type: NOTIFICATION_TYPES.COMMENT_ADDED,
        title: "New link on your task",
        body: `${access.task.title} — ${link.url}`,
        link: `/tasks?task=${id}`,
        dedupeKey: `link:${link.id}:${access.task.assigneeId}`,
      });
    }

    return Response.json(serializeLink(link), { status: 201 });
  } catch (error) {
    logApiError("Link", "create", error);
    return errorResponse("Unable to add link.", 500);
  }
}
