import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { requireTaskMember } from "@/app/lib/session";
import { validateIssueInput } from "@/app/lib/issueValidation";
import { canUpdateIssue } from "@/app/lib/issuePermissions";
import { recordActivity, ACTIVITY_TYPES } from "@/app/lib/activityLog";

const includeRelations = {
  createdBy: { select: { id: true, name: true, email: true } },
  resolvedBy: { select: { id: true, name: true, email: true } },
};

function serializeIssue(issue) {
  return {
    id: issue.id,
    taskId: issue.taskId,
    description: issue.description,
    severity: issue.severity,
    resolution: issue.resolution,
    createdBy: issue.createdBy,
    resolvedBy: issue.resolvedBy,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    resolvedAt: issue.resolvedAt,
  };
}

export async function PATCH(request, { params }) {
  const { id, issueId } = await params;
  const access = await requireTaskMember(prisma, id, "MEMBER");
  if (access.error) return errorResponse(access.error, access.status);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }
  const validation = validateIssueInput(body, { partial: true });
  if (validation.error) return errorResponse(validation.error, 400);

  try {
    const issue = await prisma.issue.findFirst({ where: { id: issueId, taskId: id } });
    if (!issue) return errorResponse("Issue not found.", 404);
    if (!canUpdateIssue(access.role, issue.createdById === access.userId)) {
      return errorResponse("You cannot update this issue.", 403);
    }

    const data = { ...validation.data };
    if (data.resolution && data.resolution !== "OPEN") {
      data.resolvedById = access.userId;
      data.resolvedAt = new Date();
    } else if (data.resolution === "OPEN") {
      data.resolvedById = null;
      data.resolvedAt = null;
    }

    const updated = await prisma.issue.update({
      where: { id: issueId },
      data,
      include: includeRelations,
    });
    await recordActivity(prisma, {
      workspaceId: access.workspaceId,
      actorId: access.userId,
      type: ACTIVITY_TYPES.ISSUE_UPDATED,
      targetId: issueId,
      targetType: "ISSUE",
      metadata: { taskId: id, resolution: updated.resolution, severity: updated.severity },
    });
    return Response.json(serializeIssue(updated));
  } catch (error) {
    logApiError("Issue", "update", error);
    return errorResponse("Unable to update issue.", 500);
  }
}
