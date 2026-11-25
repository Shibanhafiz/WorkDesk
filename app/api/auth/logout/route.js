import { cookies } from "next/headers";
import { prisma } from "@/app/lib/prisma";
import { destroySession, SESSION_COOKIE } from "@/app/lib/session";

/**
 * POST /api/auth/logout — expires the current session and clears the cookie.
 */
export async function POST() {
  await destroySession(prisma);
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return Response.json({ success: true });
}
