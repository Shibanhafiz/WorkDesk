import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { validateCommentInput } from "@/app/lib/commentValidation";
import { requireTaskMember } from "@/app/lib/session";
import { recordActivity, ACTIVITY_TYPES } from "@/app/lib/activityLog";
import { createNotificationOnce, commentNotification } from "@/app/lib/notifications";

function serializeComment(comment) {
  return {
    id: comment.id,
    content: comment.content,
    taskId: comment.taskId,
    author: comment.author,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    isEdited: comment.createdAt.getTime() !== comment.updatedAt.getTime(),
  };
}

const includeAuthor = { author: { select: { id: true, name: true, email: true } } };

export async function GET(_request, { params }) {
  const { id } = await params;
  const access = await requireTaskMember(prisma, id, "MEMBER");
  if (access.error) return errorResponse(access.error, access.status);

  try {
    const comments = await prisma.comment.findMany({
      where: { taskId: id },
      orderBy: { createdAt: "asc" },
      include: includeAuthor,
    });
    return Response.json(comments.map(serializeComment));
  } catch (error) {
    logApiError("Comment", "load", error);
    return errorResponse("Unable to load comments. Please try again.", 500);
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

  const validation = validateCommentInput(body);
  if (validation.error) return errorResponse(validation.error, 400);

  try {
    const comment = await prisma.comment.create({
      data: {
        content: validation.data.content,
        taskId: id,
        authorId: access.userId,
      },
      include: includeAuthor,
    });

    await recordActivity(prisma, {
      workspaceId: access.workspaceId,
      actorId: access.userId,
      type: ACTIVITY_TYPES.COMMENT_ADDED,
      targetId: comment.id,
      targetType: "COMMENT",
      metadata: { taskId: id, taskTitle: access.task.title },
    });

    await createNotificationOnce(
      prisma,
      commentNotification({
        recipientId: access.task.assigneeId,
        actorId: access.userId,
        taskTitle: access.task.title,
        taskId: id,
        commentId: comment.id,
      }),
    );

    return Response.json(serializeComment(comment), { status: 201 });
  } catch (error) {
    logApiError("Comment", "create", error);
    return errorResponse("Unable to add comment. Please try again.", 500);
  }
}
