import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { getSessionUser } from "@/app/lib/session";
import {
  normalizeOnboardingData,
  normalizeOnboardingStep,
  parseOnboardingData,
} from "@/app/lib/onboardingValidation";

export async function GET() {
  const caller = await getSessionUser(prisma);
  if (!caller) return errorResponse("Authentication required.", 401);

  try {
    const user = await prisma.user.findUnique({
      where: { id: caller.id },
      select: {
        name: true,
        avatarUrl: true,
        specialization: true,
        onboardingCompleted: true,
        onboardingStep: true,
        onboardingData: true,
        checklistDismissed: true,
      },
    });
    if (!user) return errorResponse("Authentication required.", 401);

    return Response.json({
      completed: user.onboardingCompleted,
      step: user.onboardingStep,
      data: parseOnboardingData(user.onboardingData),
      checklistDismissed: user.checklistDismissed,
      profile: {
        displayName: user.name ?? "",
        avatarUrl: user.avatarUrl ?? "",
        specialization: user.specialization ?? "",
      },
    });
  } catch (error) {
    logApiError("Onboarding", "load", error);
    return errorResponse("Unable to load onboarding progress.", 500);
  }
}

export async function PATCH(request) {
  const caller = await getSessionUser(prisma);
  if (!caller) return errorResponse("Authentication required.", 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const update = {};
  if (Object.hasOwn(body, "step")) {
    const step = normalizeOnboardingStep(body.step);
    if (step === null) return errorResponse("Invalid onboarding step.", 400);
    update.onboardingStep = step;
  }
  if (Object.hasOwn(body, "data")) {
    update.onboardingData = JSON.stringify(normalizeOnboardingData(body.data));
  }
  if (body.completed === true) {
    update.onboardingCompleted = true;
    update.onboardingStep = 3;
  }
  if (Object.hasOwn(body, "checklistDismissed")) {
    if (typeof body.checklistDismissed !== "boolean") {
      return errorResponse("Invalid checklist state.", 400);
    }
    update.checklistDismissed = body.checklistDismissed;
  }

  if (Object.keys(update).length === 0) {
    return errorResponse("Provide onboarding progress to save.", 400);
  }

  try {
    const user = await prisma.user.update({
      where: { id: caller.id },
      data: update,
      select: {
        onboardingCompleted: true,
        onboardingStep: true,
        onboardingData: true,
        checklistDismissed: true,
      },
    });
    return Response.json({
      completed: user.onboardingCompleted,
      step: user.onboardingStep,
      data: parseOnboardingData(user.onboardingData),
      checklistDismissed: user.checklistDismissed,
    });
  } catch (error) {
    logApiError("Onboarding", "save", error);
    return errorResponse("Unable to save onboarding progress.", 500);
  }
}
