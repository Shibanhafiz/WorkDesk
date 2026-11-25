import { prisma } from "@/app/lib/prisma";
import { errorResponse } from "@/app/lib/taskApiResponse";
import { setActiveWorkspace } from "@/app/lib/session";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const result = await setActiveWorkspace(prisma, body?.workspaceId);
  if (result.error) return errorResponse(result.error, result.status);

  return Response.json({ workspaceId: result.workspaceId });
}
