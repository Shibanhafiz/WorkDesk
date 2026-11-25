import { randomBytes } from "node:crypto";

export const SESSION_COOKIE = "workdesk_session";
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
export const SHORT_SESSION_TTL_SECONDS = 12 * 60 * 60;

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}

export function sessionCookieOptions({ remember = false } = {}) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { maxAge: SESSION_TTL_SECONDS } : {}),
  };
}
