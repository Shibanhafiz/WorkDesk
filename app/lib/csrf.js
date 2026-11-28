const CSRF_COOKIE = "workdesk_csrf";
const CSRF_HEADER = "x-csrf-token";

function readCookie(name) {
  if (typeof document === "undefined") return "";
  const parts = document.cookie ? document.cookie.split("; ") : [];
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) return decodeURIComponent(part.slice(name.length + 1));
  }
  return "";
}

export function getCsrfToken() {
  return readCookie(CSRF_COOKIE);
}

export function installCsrfFetch() {
  if (typeof window === "undefined" || window.__workdeskCsrfFetchInstalled) return;
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const method = (init.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    if (!["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
      return originalFetch(input, init);
    }
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith("http") && !url.startsWith(window.location.origin)) {
      return originalFetch(input, init);
    }
    const token = getCsrfToken();
    if (!token) return originalFetch(input, init);
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has(CSRF_HEADER)) headers.set(CSRF_HEADER, token);
    return originalFetch(input, { ...init, headers });
  };
  window.__workdeskCsrfFetchInstalled = true;
}
