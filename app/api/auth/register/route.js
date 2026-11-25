import { cookies } from "next/headers";
import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { hashPassword, validateRegistrationInput } from "@/app/lib/password";
import { createSession, sessionCookieOptions, SESSION_COOKIE } from "@/app/lib/session";

/**
 * POST /api/auth/register
 * Creates a user, a personal workspace with an ADMIN membership, and a session.
 */
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

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return errorResponse("An account with that email already exists.", 409);
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: "MEMBER", specialization: "OTHER" },
    });

    // Bootstrap a personal workspace so the UI has a working workspace.
    const workspace = await prisma.workspace.create({
      data: {
        name: `${name}'s workspace`,
        description: "Personal workspace",
        isPersonal: true,
        ownerId: user.id,
      },
    });
    await prisma.workspaceMember.create({
      data: { userId: user.id, workspaceId: workspace.id, role: "ADMIN" },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { workspaceId: workspace.id },
    });

    const { token } = await createSession(prisma, user.id, {
      remember: true,
      workspaceId: workspace.id,
    });
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions({ remember: true }));

    return Response.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: "ADMIN",
          specialization: user.specialization,
        },
        workspaceId: workspace.id,
      },
      { status: 201 },
    );
  } catch (error) {
    logApiError("Auth", "register", error);
    return errorResponse("Unable to create account. Please try again.", 500);
  }
}
