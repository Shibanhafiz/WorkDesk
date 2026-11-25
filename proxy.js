import { NextResponse } from "next/server";

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
};

function applyHeaders(response) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/") &&
    ["POST", "PATCH", "PUT", "DELETE"].includes(request.method)
  ) {
    const origin = request.headers.get("origin");
    if (origin) {
      let originHost;
      try {
        originHost = new URL(origin).host;
      } catch {
        return applyHeaders(
          NextResponse.json({ error: "Invalid origin." }, { status: 403 }),
        );
      }
      if (originHost !== request.nextUrl.host) {
        return applyHeaders(
          NextResponse.json({ error: "Invalid origin." }, { status: 403 }),
        );
      }
    }
  }

  return applyHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
