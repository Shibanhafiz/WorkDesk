import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import {
  isValidProjectId,
  validateProjectDateRange,
  validateProjectInput,
} from "@/app/lib/projectValidation";

function isRecordNotFound(error) {
  return error && typeof error === "object" && error.code === "P2025";
}

export async function GET(_request, { params }) {
  const { id } = await params;
  if (!isValidProjectId(id)) {
    return errorResponse("Project ID must be a valid CUID.", 400);
  }

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: { createdAt: "desc" },
          include: {
            project: {
              select: { id: true, name: true, status: true },
            },
          },
        },
        _count: { select: { tasks: true } },
      },
    });

    if (!project) {
      return errorResponse("Project not found.", 404);
    }

    return Response.json(project);
  } catch (error) {
    logApiError("Project", "load details", error);
    return errorResponse("Unable to load project. Please try again.", 500);
  }
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  if (!isValidProjectId(id)) {
    return errorResponse("Project ID must be a valid CUID.", 400);
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const validation = validateProjectInput(input, { partial: true });
  if (validation.error) {
    return errorResponse(validation.error, 400);
  }

  try {
    const existingProject = await prisma.project.findUnique({
      where: { id },
      select: { id: true, startDate: true, dueDate: true },
    });
    if (!existingProject) {
      return errorResponse("Project not found.", 404);
    }

    const startDate = Object.hasOwn(validation.data, "startDate")
      ? validation.data.startDate
      : existingProject.startDate;
    const dueDate = Object.hasOwn(validation.data, "dueDate")
      ? validation.data.dueDate
      : existingProject.dueDate;
    const dateRangeValidation = validateProjectDateRange(startDate, dueDate);
    if (dateRangeValidation.error) {
      return errorResponse(dateRangeValidation.error, 400);
    }

    const project = await prisma.project.update({
      where: { id },
      data: validation.data,
      include: { _count: { select: { tasks: true } } },
    });

    return Response.json(project);
  } catch (error) {
    if (isRecordNotFound(error)) {
      return errorResponse("Project not found.", 404);
    }

    logApiError("Project", "update", error);
    return errorResponse("Unable to update project. Please try again.", 500);
  }
}
