import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { checkRateLimit, envRateLimit, getClientKey } from "@/app/lib/rateLimit";
import { hashPassword } from "@/app/lib/password";
import {
  hashPasswordResetToken,
  validatePasswordResetConfirm,
} from "@/app/lib/passwordReset";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const validation = validatePasswordResetConfirm(body);
  if (validation.error) return errorResponse(validation.error, 400);

  const { token, password } = validation.data;
  const rate = checkRateLimit(`reset-confirm:${getClientKey(request)}`, {
    limit: envRateLimit("RATE_LIMIT_RESET_CONFIRM_PER_HOUR", 10),
    windowMs: 60 * 60 * 1000,
  });
  if (!rate.allowed) {
    return Response.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  }

  const tokenHash = hashPasswordResetToken(token);

  try {
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (
      !record ||
      record.usedAt ||
      new Date(record.expiresAt).getTime() <= Date.now()
    ) {
      return errorResponse("This reset link is invalid or has expired.", 400);
    }

    const claimed = await prisma.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1) {
      return errorResponse("This reset link is invalid or has expired.", 400);
    }

    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    await prisma.session.deleteMany({ where: { userId: record.userId } });

    return Response.json({ ok: true });
  } catch (error) {
    logApiError("Password reset", "confirm", error);
    return errorResponse("Unable to reset your password. Please try again.", 500);
  }
}
