import { cookies } from "next/headers";
import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import {
  DUMMY_PASSWORD_HASH,
  verifyPassword,
  validateCredentialsInput,
  validateRememberFlag,
} from "@/app/lib/password";
import { createSession, sessionCookieOptions, SESSION_COOKIE } from "@/app/lib/session";
import { checkRateLimit, envRateLimit, getClientKey } from "@/app/lib/rateLimit";

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
  const rate = checkRateLimit(
    `login:${getClientKey(request)}:${email}`,
      { limit: envRateLimit("RATE_LIMIT_LOGIN_PER_15MIN", 8), windowMs: 15 * 60 * 1000 },
  );
  if (!rate.allowed) {
    return Response.json(
      { error: "Too many sign-in attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    const validPassword = await verifyPassword(
      password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );
    if (!user || !validPassword) {
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
