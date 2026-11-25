import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { requireTaskMember } from "@/app/lib/session";
import {
  validateUploadedFile,
  buildStoragePath,
} from "@/app/lib/fileValidation";
import { saveAttachmentFile, deleteAttachmentFile } from "@/app/lib/attachmentStorage";
import { recordActivity, ACTIVITY_TYPES } from "@/app/lib/activityLog";
import { createNotificationOnce, NOTIFICATION_TYPES } from "@/app/lib/notifications";

const includeUploader = { uploader: { select: { id: true, name: true, email: true } } };

function serializeAttachment(a) {
  return {
    id: a.id, taskId: a.taskId, fileName: a.fileName, mimeType: a.mimeType,
    size: a.size, createdAt: a.createdAt, uploader: a.uploader,
  };
}

export async function GET(_request, { params }) {
  const { id } = await params;
  const access = await requireTaskMember(prisma, id, "MEMBER");
  if (access.error) return errorResponse(access.error, access.status);

  try {
    const attachments = await prisma.attachment.findMany({
      where: { taskId: id },
      orderBy: { createdAt: "asc" },
      include: includeUploader,
    });
    return Response.json(attachments.map(serializeAttachment));
  } catch (error) {
    logApiError("Attachment", "load", error);
    return errorResponse("Unable to load attachments.", 500);
  }
}

export async function POST(request, { params }) {
  const { id } = await params;
  const access = await requireTaskMember(prisma, id, "MEMBER");
  if (access.error) return errorResponse(access.error, access.status);

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("Expected multipart form data.", 400);
  }

  const file = formData.get("file");
  const validation = validateUploadedFile(file);
  if (validation.error) return errorResponse(validation.error, 400);

  const { fileName, mimeType, size } = validation.data;
  const storagePath = buildStoragePath(mimeType);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length !== size) {
      return errorResponse("Uploaded file size does not match the declared size.", 400);
    }
    await saveAttachmentFile(storagePath, buffer);

    const attachment = await prisma.attachment.create({
      data: { taskId: id, uploaderId: access.userId, fileName, mimeType, size, storagePath },
      include: includeUploader,
    });

    await recordActivity(prisma, {
      workspaceId: access.workspaceId,
      actorId: access.userId,
      type: ACTIVITY_TYPES.ATTACHMENT_ADDED,
      targetId: attachment.id,
      targetType: "ATTACHMENT",
      metadata: { taskId: id, fileName },
    });

    if (access.task.assigneeId && access.task.assigneeId !== access.userId) {
      await createNotificationOnce(prisma, {
        userId: access.task.assigneeId,
        type: NOTIFICATION_TYPES.COMMENT_ADDED,
        title: "New attachment on your task",
        body: `${access.task.title} — ${fileName}`,
        link: `/tasks?task=${id}`,
        dedupeKey: `attachment:${attachment.id}:${access.task.assigneeId}`,
      });
    }

    return Response.json(serializeAttachment(attachment), { status: 201 });
  } catch (error) {
    await deleteAttachmentFile(storagePath).catch(() => {});
    logApiError("Attachment", "upload", error);
    return errorResponse("Unable to upload attachment.", 500);
  }
}
