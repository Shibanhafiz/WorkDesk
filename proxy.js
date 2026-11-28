import { NextResponse } from "next/server";

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
};

const SESSION_COOKIE = "workdesk_session";
const CSRF_COOKIE = "workdesk_csrf";
const CSRF_HEADER = "x-csrf-token";

function ensureCsrfCookie(request, response) {
  if (request.cookies.get(CSRF_COOKIE)?.value) return response;
  response.cookies.set(CSRF_COOKIE, crypto.randomUUID(), {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return response;
}

function applyHeaders(request, response) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  return ensureCsrfCookie(request, response);
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/") &&
    ["POST", "PATCH", "PUT", "DELETE"].includes(request.method)
  ) {
    const fetchSite = request.headers.get("sec-fetch-site");
    if (fetchSite === "cross-site") {
      return applyHeaders(
        request,
        NextResponse.json({ error: "Invalid origin." }, { status: 403 }),
      );
    }
    const origin = request.headers.get("origin");
    if (origin) {
      let originHost;
      try {
        originHost = new URL(origin).host;
      } catch {
        return applyHeaders(
          request,
          NextResponse.json({ error: "Invalid origin." }, { status: 403 }),
        );
      }
      if (originHost !== request.nextUrl.host) {
        return applyHeaders(
          request,
          NextResponse.json({ error: "Invalid origin." }, { status: 403 }),
        );
      }
    }
    const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
    if (sessionCookie) {
      const csrfCookie = request.cookies.get(CSRF_COOKIE)?.value;
      const csrfHeader = request.headers.get(CSRF_HEADER);
      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return applyHeaders(
          request,
          NextResponse.json({ error: "Invalid CSRF token." }, { status: 403 }),
        );
      }
    }
  }

  return applyHeaders(request, NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
