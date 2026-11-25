import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { requireTaskMember } from "@/app/lib/session";
import { validateIssueInput } from "@/app/lib/issueValidation";
import { canRecordIssue } from "@/app/lib/issuePermissions";
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

export async function GET(_request, { params }) {
  const { id } = await params;
  const access = await requireTaskMember(prisma, id, "MEMBER");
  if (access.error) return errorResponse(access.error, access.status);

  try {
    const issues = await prisma.issue.findMany({
      where: { taskId: id },
      orderBy: { createdAt: "asc" },
      include: includeRelations,
    });
    return Response.json(issues.map(serializeIssue));
  } catch (error) {
    logApiError("Issue", "load", error);
    return errorResponse("Unable to load issues.", 500);
  }
}

export async function POST(request, { params }) {
  const { id } = await params;
  const access = await requireTaskMember(prisma, id, "MEMBER");
  if (access.error) return errorResponse(access.error, access.status);

  const isAssignee = access.task.assigneeId === access.userId;
  if (!canRecordIssue(access.role, isAssignee)) {
    return errorResponse("You cannot record issues on this task.", 403);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }
  const validation = validateIssueInput(body);
  if (validation.error) return errorResponse(validation.error, 400);

  try {
    const issue = await prisma.issue.create({
      data: {
        taskId: id,
        description: validation.data.description,
        severity: validation.data.severity ?? "MEDIUM",
        resolution: "OPEN",
        createdById: access.userId,
      },
      include: includeRelations,
    });
    await recordActivity(prisma, {
      workspaceId: access.workspaceId,
      actorId: access.userId,
      type: ACTIVITY_TYPES.ISSUE_ADDED,
      targetId: issue.id,
      targetType: "ISSUE",
      metadata: { taskId: id, severity: issue.severity },
    });
    return Response.json(serializeIssue(issue), { status: 201 });
  } catch (error) {
    logApiError("Issue", "create", error);
    return errorResponse("Unable to record issue.", 500);
  }
}
