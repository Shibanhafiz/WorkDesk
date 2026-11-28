import { cookies } from "next/headers";
import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { hashPassword, validateRegistrationInput } from "@/app/lib/password";
import { createSession, sessionCookieOptions, SESSION_COOKIE } from "@/app/lib/session";
import { checkRateLimit, envRateLimit, getClientKey } from "@/app/lib/rateLimit";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const validation = validateRegistrationInput(body);
  if (validation.error) return errorResponse(validation.error, 400);

  const { name, email, password } = validation.data;
  const rate = checkRateLimit(`register:${getClientKey(request)}`, {
    limit: envRateLimit("RATE_LIMIT_REGISTER_PER_HOUR", 10),
    windowMs: 60 * 60 * 1000,
  });
  if (!rate.allowed) {
    return Response.json(
      { error: "Too many registration attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return errorResponse("Unable to create account. Please try again.", 400);
    }

    const passwordHash = await hashPassword(password);
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name, email, passwordHash, role: "MEMBER", specialization: "OTHER" },
      });
      const workspace = await tx.workspace.create({
        data: {
          name: `${name}'s workspace`,
          description: "Personal workspace",
          isPersonal: true,
          ownerId: created.id,
        },
      });
      await tx.workspaceMember.create({
        data: { userId: created.id, workspaceId: workspace.id, role: "ADMIN" },
      });
      await tx.user.update({
        where: { id: created.id },
        data: { workspaceId: workspace.id },
      });
      const session = await createSession(tx, created.id, {
        remember: true,
        workspaceId: workspace.id,
      });
      return { user: created, workspace, token: session.token };
    });

    const cookieStore = await cookies();
    cookieStore.set(
      SESSION_COOKIE,
      result.token,
      sessionCookieOptions({ remember: true }),
    );

    return Response.json(
      {
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: "ADMIN",
          specialization: result.user.specialization,
        },
        workspaceId: result.workspace.id,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error && typeof error === "object" && error.code === "P2002") {
      return errorResponse("Unable to create account. Please try again.", 400);
    }
    logApiError("Auth", "register", error);
    return errorResponse("Unable to create account. Please try again.", 500);
  }
}
