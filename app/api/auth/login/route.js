import { cookies } from "next/headers";
import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import {
  verifyPassword,
  validateCredentialsInput,
  validateRememberFlag,
} from "@/app/lib/password";
import { createSession, sessionCookieOptions, SESSION_COOKIE } from "@/app/lib/session";

/**
 * POST /api/auth/login
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const validation = validateCredentialsInput(body);
  if (validation.error) return errorResponse(validation.error, 400);

  const rememberValidation = validateRememberFlag(body.remember);
  if (rememberValidation.error) {
    return errorResponse(rememberValidation.error, 400);
  }

  const { email, password } = validation.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return errorResponse("Invalid email or password.", 401);
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      orderBy: { joinedAt: "asc" },
    });

    const { token } = await createSession(prisma, user.id, {
      remember: rememberValidation.data,
      workspaceId: membership?.workspaceId ?? null,
    });
    const cookieStore = await cookies();
    cookieStore.set(
      SESSION_COOKIE,
      token,
      sessionCookieOptions({ remember: rememberValidation.data }),
    );

    return Response.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: membership?.role ?? user.role,
        specialization: user.specialization,
      },
      workspaceId: membership?.workspaceId ?? null,
    });
  } catch (error) {
    logApiError("Auth", "login", error);
    return errorResponse("Unable to sign in. Please try again.", 500);
  }
}
