import { prisma } from "@/app/lib/prisma";
import { errorResponse, logTaskApiError } from "@/app/lib/taskApiResponse";
import { isValidTaskId, validateTaskInput } from "@/app/lib/taskValidation";

function isRecordNotFound(error) {
  return error && typeof error === "object" && error.code === "P2025";
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  if (!isValidTaskId(id)) {
    return errorResponse("Task ID must be a valid CUID.", 400);
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const validation = validateTaskInput(input, { partial: true });
  if (validation.error) {
    return errorResponse(validation.error, 400);
  }

  try {
    const task = await prisma.task.update({
      where: { id },
      data: validation.data,
    });

    return Response.json(task);
  } catch (error) {
    if (isRecordNotFound(error)) {
      return errorResponse("Task not found.", 404);
    }

    logTaskApiError("update", error);
    return errorResponse("Unable to update task. Please try again.", 500);
  }
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  if (!isValidTaskId(id)) {
    return errorResponse("Task ID must be a valid CUID.", 400);
  }

  try {
    await prisma.task.delete({ where: { id } });
    return Response.json({ id });
  } catch (error) {
    if (isRecordNotFound(error)) {
      return errorResponse("Task not found.", 404);
    }

    logTaskApiError("delete", error);
    return errorResponse("Unable to delete task. Please try again.", 500);
  }
}
