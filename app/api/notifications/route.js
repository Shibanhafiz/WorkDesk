import { prisma } from "@/app/lib/prisma";
import { errorResponse, logApiError } from "@/app/lib/taskApiResponse";
import { getSessionUser } from "@/app/lib/session";

const MAX_NOTIFICATIONS = 50;

/**
 * GET /api/notifications — recent notifications for the signed-in user
 * plus the unread count used for the sidebar badge.
 */
export async function GET() {
  const user = await getSessionUser(prisma);
  if (!user) return errorResponse("Authentication required.", 401);

  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: MAX_NOTIFICATIONS,
      }),
      prisma.notification.count({
        where: { userId: user.id, read: false },
      }),
    ]);

    return Response.json({ notifications, unreadCount });
  } catch (error) {
    logApiError("Notification", "load", error);
    return errorResponse("Unable to load notifications. Please try again.", 500);
  }
}

/**
 * POST /api/notifications — mark every unread notification as read.
 */
export async function POST() {
  const user = await getSessionUser(prisma);
  if (!user) return errorResponse("Authentication required.", 401);

  try {
    const result = await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return Response.json({ updated: result.count, unreadCount: 0 });
  } catch (error) {
    logApiError("Notification", "mark-all-read", error);
    return errorResponse("Unable to update notifications. Please try again.", 500);
  }
}
