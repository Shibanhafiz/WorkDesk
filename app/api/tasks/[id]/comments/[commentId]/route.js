import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { validateCommentInput } from "@/app/lib/commentValidation";
import { requireTaskMember } from "@/app/lib/session";
import { canEditComment, canDeleteComment } from "@/app/lib/commentPermissions";
import { recordActivity, ACTIVITY_TYPES } from "@/app/lib/activityLog";

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

async function loadComment(taskId, commentId) {
  return prisma.comment.findFirst({
    where: { id: commentId, taskId },
    include: includeAuthor,
  });
}

export async function PATCH(request, { params }) {
  const { id, commentId } = await params;
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
    const comment = await loadComment(id, commentId);
    if (!comment) return errorResponse("Comment not found.", 404);
    if (!canEditComment(comment, access.userId)) {
      return errorResponse("You can only edit your own comments.", 403);
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { content: validation.data.content },
      include: includeAuthor,
    });
    await recordActivity(prisma, {
      workspaceId: access.workspaceId,
      actorId: access.userId,
      type: ACTIVITY_TYPES.COMMENT_EDITED,
      targetId: commentId,
      targetType: "COMMENT",
      metadata: { taskId: id },
    });
    return Response.json(serializeComment(updated));
  } catch (error) {
    logApiError("Comment", "update", error);
    return errorResponse("Unable to update comment. Please try again.", 500);
  }
}

export async function DELETE(_request, { params }) {
  const { id, commentId } = await params;
  const access = await requireTaskMember(prisma, id, "MEMBER");
  if (access.error) return errorResponse(access.error, access.status);

  try {
    const comment = await loadComment(id, commentId);
    if (!comment) return errorResponse("Comment not found.", 404);
    if (!canDeleteComment(comment, access.userId, access.role)) {
      return errorResponse(
        "You can only delete your own comments or comments in your workspace as an admin.",
        403,
      );
    }
    await prisma.comment.delete({ where: { id: commentId } });
    await recordActivity(prisma, {
      workspaceId: access.workspaceId,
      actorId: access.userId,
      type: ACTIVITY_TYPES.COMMENT_DELETED,
      targetId: commentId,
      targetType: "COMMENT",
      metadata: { taskId: id },
    });
    return Response.json({ id: commentId });
  } catch (error) {
    logApiError("Comment", "delete", error);
    return errorResponse("Unable to delete comment. Please try again.", 500);
  }
}
