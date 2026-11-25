import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { requireTaskMember } from "@/app/lib/session";
import { readAttachmentFile, deleteAttachmentFile } from "@/app/lib/attachmentStorage";
import { can } from "@/app/lib/workspacePermissions";
import { recordActivity, ACTIVITY_TYPES } from "@/app/lib/activityLog";

function escapeFileName(name) {
  return String(name).replace(/["\\\r\n]/g, "_");
}

export async function GET(_request, { params }) {
  const { id, attachmentId } = await params;
  const access = await requireTaskMember(prisma, id, "MEMBER");
  if (access.error) return errorResponse(access.error, access.status);

  try {
    const attachment = await prisma.attachment.findFirst({ where: { id: attachmentId, taskId: id } });
    if (!attachment) return errorResponse("Attachment not found.", 404);
    const buffer = await readAttachmentFile(attachment.storagePath);
    return new Response(buffer, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": `attachment; filename="${escapeFileName(attachment.fileName)}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    logApiError("Attachment", "download", error);
    return errorResponse("Unable to read attachment.", 500);
  }
}

export async function DELETE(_request, { params }) {
  const { id, attachmentId } = await params;
  const access = await requireTaskMember(prisma, id, "MEMBER");
  if (access.error) return errorResponse(access.error, access.status);

  try {
    const attachment = await prisma.attachment.findFirst({ where: { id: attachmentId, taskId: id } });
    if (!attachment) return errorResponse("Attachment not found.", 404);
    if (
      attachment.uploaderId !== access.userId &&
      !can(access.role, "MANAGER")
    ) {
      return errorResponse("You cannot delete this attachment.", 403);
    }
    await prisma.attachment.delete({ where: { id: attachmentId } });
    await deleteAttachmentFile(attachment.storagePath);
    await recordActivity(prisma, {
      workspaceId: access.workspaceId,
      actorId: access.userId,
      type: ACTIVITY_TYPES.ATTACHMENT_DELETED,
      targetId: attachmentId,
      targetType: "ATTACHMENT",
      metadata: { taskId: id, fileName: attachment.fileName },
    });
    return Response.json({ id: attachmentId });
  } catch (error) {
    logApiError("Attachment", "delete", error);
    return errorResponse("Unable to delete attachment.", 500);
  }
}
