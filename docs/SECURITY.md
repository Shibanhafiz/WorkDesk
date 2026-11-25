# Security notes

## Implemented controls

- Passwords are hashed with `scrypt` and a random salt (`app/lib/password.js`);
  plaintext passwords are never stored or logged.
- Sessions are opaque 32-byte tokens stored in the database, sent in an
  HttpOnly, SameSite=Lax cookie; `Secure` is enabled when `NODE_ENV=production`.
  "Remember me" selects a 7-day persistent cookie, otherwise a browser-session
  cookie with a 12-hour server expiry. Logout deletes the session row.
- Password reset tokens are 256-bit random values, stored only as SHA-256
  hashes, expire after one hour, are single-use, and invalidate existing
  sessions on success. In production a webhook must be configured for delivery;
  without it, the recovery token is only shown in development mode.
- Invitation tokens are 256-bit random, single-use, expire after seven days,
  and are checked against the authenticated email on acceptance. Duplicate
  active invitations for the same email/workspace are rejected.
- All workspace data APIs check membership on the server. Project creation
  requires MANAGER/ADMIN; task creation resolves workspace through the
  authenticated session or the selected project and rejects cross-workspace
  project/assignee IDs. Member management is Admin-only; task assignment to a
  third party requires Manager/Admin and an assignable specialization.
- Request bodies are allow-listed by validation helpers, preventing mass
  assignment of `workspaceId`, `role`, `status`, `userId` and similar fields.
- `proxy.js` sets `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`
  and `Permissions-Policy`, and rejects cross-origin POST/PATCH/PUT/DELETE
  requests that carry a mismatching `Origin` header.
- In-memory per-IP rate limits protect login, registration, password reset and
  invitation acceptance. Error responses are generic; logs contain error names
  and codes only, never tokens or credentials.
- No OAuth provider is enabled. Google UI is hidden unless explicit
  configuration flags and a tested callback flow exist.

## Remaining risks / manual setup

- The rate limiter is process-local. Multi-instance deployments need a shared
  store (for example Redis) before relying on it as a primary control.
- A Content Security Policy is intentionally not set; adding one requires
  validating Next.js inline scripts and can break the app if misconfigured.
- The local database is SQLite. A managed PostgreSQL database and a verified
  data migration are required before internet-facing multi-user deployment.
- Email delivery, email verification and OAuth require provider configuration;
  none are claimed as active.
- No browser automation suite is included; visual/responsive checks were done
  by inspection, not by automated browser tests.
