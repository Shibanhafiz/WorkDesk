import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { getSessionUser } from "@/app/lib/session";
import { canAccessNotification } from "@/app/lib/notifications";

/**
 * PATCH /api/notifications/[id] — mark a single notification as read or
 * unread. Users can only touch notifications addressed to them.
 */
export async function PATCH(request, { params }) {
  const user = await getSessionUser(prisma);
  if (!user) return errorResponse("Authentication required.", 401);

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  if (typeof body?.read !== "boolean") {
    return errorResponse("read must be a boolean.", 400);
  }

  try {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || !canAccessNotification(notification, user.id)) {
      // Ownership is never disclosed for another user's notification.
      return errorResponse("Notification not found.", 404);
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: body.read },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false },
    });

    return Response.json({ notification: updated, unreadCount });
  } catch (error) {
    logApiError("Notification", "update", error);
    return errorResponse("Unable to update the notification. Please try again.", 500);
  }
}
