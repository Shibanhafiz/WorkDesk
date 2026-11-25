import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { getSessionUser } from "@/app/lib/session";
import { validateProfileInput } from "@/app/lib/onboardingValidation";

export async function PATCH(request) {
  const caller = await getSessionUser(prisma);
  if (!caller) return errorResponse("Authentication required.", 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const validation = validateProfileInput(body);
  if (validation.error) return errorResponse(validation.error, 400);

  try {
    const user = await prisma.user.update({
      where: { id: caller.id },
      data: {
        name: validation.data.displayName || null,
        avatarUrl: validation.data.avatarUrl,
        specialization: validation.data.specialization ?? "OTHER",
      },
      select: { id: true, name: true, avatarUrl: true, specialization: true },
    });
    return Response.json(user);
  } catch (error) {
    logApiError("Profile", "update", error);
    return errorResponse("Unable to save your profile.", 500);
  }
}
