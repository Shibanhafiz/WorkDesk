import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { errorResponse, logTaskApiError } from "@/app/lib/taskApiResponse";
import { validateTaskInput } from "@/app/lib/taskValidation";

export async function GET() {
  await connection();

  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        project: {
          select: { id: true, name: true, status: true },
        },
      },
    });

    return Response.json(tasks);
  } catch (error) {
    logTaskApiError("load", error);
    return errorResponse("Unable to load tasks. Please try again.", 500);
  }
}

export async function POST(request) {
  let input;
  try {
    input = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const validation = validateTaskInput(input);
  if (validation.error) {
    return errorResponse(validation.error, 400);
  }

  try {
    if (validation.data.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: validation.data.projectId },
        select: { id: true },
      });
      if (!project) {
        return errorResponse("Project not found.", 404);
      }
    }

    const task = await prisma.task.create({
      data: validation.data,
      include: {
        project: {
          select: { id: true, name: true, status: true },
        },
      },
    });
    return Response.json(task, { status: 201 });
  } catch (error) {
    logTaskApiError("create", error);
    return errorResponse("Unable to create task. Please try again.", 500);
  }
}
