import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { checkRateLimit, getClientKey } from "@/app/lib/rateLimit";
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
    { limit: 3, windowMs: 60 * 60 * 1000 },
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
      await prisma.passwordResetToken.create({
        data: {
          tokenHash: hashPasswordResetToken(token),
          userId: user.id,
          expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000),
        },
      });

      if (webhookUrl) {
        try {
          const delivery = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, token }),
          });
          if (!delivery.ok) {
            logApiError("Password reset", "delivery", new Error(`Webhook status ${delivery.status}`));
          }
        } catch (error) {
          logApiError("Password reset", "delivery", error);
        }
      } else if (process.env.NODE_ENV !== "production") {
        devToken = token;
      }
    }

    return Response.json({ ok: true, ...(devToken ? { devToken } : {}) });
  } catch (error) {
    logApiError("Password reset", "request", error);
    return errorResponse("Unable to process that request. Please try again.", 500);
  }
}
