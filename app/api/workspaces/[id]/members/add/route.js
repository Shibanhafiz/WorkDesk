import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { requireWorkspaceMember } from "@/app/lib/session";
import { hashPassword } from "@/app/lib/password";
import { randomBytes } from "node:crypto";
import { SPECIALIZATIONS } from "@/app/lib/workspacePermissions";
import { recordActivity, ACTIVITY_TYPES } from "@/app/lib/activityLog";
import { isJsonObjectBody } from "@/app/lib/requestBody";
import {
  createPasswordResetToken,
  hashPasswordResetToken,
  PASSWORD_RESET_TTL_SECONDS,
} from "@/app/lib/passwordReset";

const VALID_ROLES = ["ADMIN", "MANAGER", "MEMBER"];
const VALID_SPECIALIZATIONS = new Set([
  SPECIALIZATIONS.DEVELOPER,
  SPECIALIZATIONS.DESIGNER,
  SPECIALIZATIONS.OTHER,
]);

/**
 * POST /api/workspaces/[id]/members/add
 * ADMIN only: add an existing registered user by email, or create a new
 * account with a generated temporary password. Returns the temporary
 * password only when a new account was created.
 */
export async function POST(request, { params }) {
  const { id } = await params;
  const access = await requireWorkspaceMember(prisma, id, "ADMIN");
  if (access.error) return errorResponse(access.error, access.status);

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }
  if (!isJsonObjectBody(body)) {
    return errorResponse("Request body must be a JSON object.", 400);
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return errorResponse("Enter a valid email address.", 400);
  }

  const role = body.role ?? "MEMBER";
  const specialization = body.specialization ?? "OTHER";
  if (!VALID_ROLES.includes(role)) return errorResponse("Invalid role.", 400);
  if (!VALID_SPECIALIZATIONS.has(specialization)) {
    return errorResponse("Invalid specialization.", 400);
  }

  let resetToken = null;
  try {
    const result = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email } });
      let createdNewUser = false;
      if (!user) {
        const generatedPassword = randomBytes(24).toString("base64url");
        user = await tx.user.create({
          data: {
            email,
            name: email.split("@")[0],
            passwordHash: await hashPassword(generatedPassword),
            role: "MEMBER",
            specialization,
          },
        });
        createdNewUser = true;
      }

      if (createdNewUser) {
        resetToken = createPasswordResetToken();
        await tx.passwordResetToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: new Date() },
        });
        await tx.passwordResetToken.create({
          data: {
            tokenHash: hashPasswordResetToken(resetToken),
            userId: user.id,
            expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000),
          },
        });
      }

      const existing = await tx.workspaceMember.findFirst({
        where: { userId: user.id, workspaceId: id },
      });
      if (existing) {
        return { duplicate: true };
      }

      await tx.workspaceMember.create({
        data: { userId: user.id, workspaceId: id, role },
      });
      if (user.specialization !== specialization) {
        await tx.user.update({
          where: { id: user.id },
          data: { specialization },
        });
      }
      await recordActivity(tx, {
        workspaceId: id,
        actorId: access.userId,
        type: ACTIVITY_TYPES.MEMBER_JOINED,
        targetId: user.id,
        targetType: "MEMBER",
        metadata: { email, role },
      });

      return {
        user: { id: user.id, name: user.name, email: user.email },
      };
    });

    if (result.duplicate) {
      return errorResponse("That user is already a member of this workspace.", 409);
    }

    return Response.json(
      {
        userId: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role,
        specialization,
        resetToken,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error && typeof error === "object" && error.code === "P2002") {
      return errorResponse("That user is already a member of this workspace.", 409);
    }
    logApiError("Member", "add", error);
    return errorResponse("Unable to add member. Please try again.", 500);
  }
}
