import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { requireWorkspaceMember } from "@/app/lib/session";
import { getTeamWorkload } from "@/app/lib/teamWorkload";

/**
 * GET /api/workspaces/[id]/workload — per-member assignment counts
 * calculated with database queries for the active workspace.
 */
export async function GET(_request, { params }) {
  const { id } = await params;
  const access = await requireWorkspaceMember(prisma, id, "MEMBER");
  if (access.error) return errorResponse(access.error, access.status);

  try {
    const workload = await getTeamWorkload(prisma, id);
    return Response.json(workload);
  } catch (error) {
    logApiError("Workload", "load", error);
    return errorResponse("Unable to load team workload. Please try again.", 500);
  }
}
