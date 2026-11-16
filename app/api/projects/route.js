import { connection } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { validateProjectInput } from "@/app/lib/projectValidation";

export async function GET() {
  await connection();

  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { tasks: true } } },
    });

    return Response.json(projects);
  } catch (error) {
    logApiError("Project", "load", error);
    return errorResponse("Unable to load projects. Please try again.", 500);
  }
}

export async function POST(request) {
  let input;
  try {
    input = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const validation = validateProjectInput(input);
  if (validation.error) {
    return errorResponse(validation.error, 400);
  }

  try {
    const project = await prisma.project.create({
      data: validation.data,
      include: { _count: { select: { tasks: true } } },
    });
    return Response.json(project, { status: 201 });
  } catch (error) {
    logApiError("Project", "create", error);
    return errorResponse("Unable to create project. Please try again.", 500);
  }
}
