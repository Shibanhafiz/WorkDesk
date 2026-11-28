import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { checkRateLimit, envRateLimit, getClientKey } from "@/app/lib/rateLimit";
import {
  createPasswordResetToken,
  hashPasswordResetToken,
  validatePasswordResetRequest,
  PASSWORD_RESET_TTL_SECONDS,
} from "@/app/lib/passwordReset";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const validation = validatePasswordResetRequest(body);
  if (validation.error) return errorResponse(validation.error, 400);

  const { email } = validation.data;
  const rate = checkRateLimit(
    `reset-request:${getClientKey(request)}:${email}`,
    { limit: envRateLimit("RATE_LIMIT_RESET_REQUEST_PER_HOUR", 5), windowMs: 60 * 60 * 1000 },
  );
  if (!rate.allowed) {
    return Response.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  }

  const webhookUrl = process.env.PASSWORD_RESET_WEBHOOK_URL;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    let devToken;

    if (user) {
      const token = createPasswordResetToken();
      await prisma.$transaction([
        prisma.passwordResetToken.updateMany({
          where: { userId: user.id, usedAt: null },
          data: { usedAt: new Date() },
        }),
        prisma.passwordResetToken.create({
          data: {
            tokenHash: hashPasswordResetToken(token),
            userId: user.id,
            expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000),
          },
        }),
      ]);

      if (webhookUrl) {
        try {
          if (
            process.env.NODE_ENV === "production" &&
            !webhookUrl.startsWith("https://")
          ) {
            throw new Error("Webhook URL must use HTTPS in production");
          }
          const headers = { "Content-Type": "application/json" };
          if (process.env.PASSWORD_RESET_WEBHOOK_SECRET) {
            headers.Authorization = `Bearer ${process.env.PASSWORD_RESET_WEBHOOK_SECRET}`;
          }
          const delivery = await fetch(webhookUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({ email, token }),
          });
          if (!delivery.ok) {
            throw new Error(`Webhook status ${delivery.status}`);
          }
        } catch (error) {
          logApiError("Password reset", "delivery", error);
          return errorResponse(
            "Unable to send reset instructions. Please try again later.",
            502,
          );
        }
      } else if (
        process.env.NODE_ENV !== "production" &&
        process.env.ALLOW_DEV_RESET_TOKEN === "true"
      ) {
        devToken = token;
      } else {
        return errorResponse("Password reset delivery is not configured.", 503);
      }
    }

    return Response.json({ ok: true, ...(devToken ? { devToken } : {}) });
  } catch (error) {
    logApiError("Password reset", "request", error);
    return errorResponse("Unable to process that request. Please try again.", 500);
  }
}
