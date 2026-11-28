# Security notes

## Implemented controls

- Passwords use scrypt with a random salt and constant-time comparison
  (`app/lib/password.js`). Login runs the same scrypt path for unknown emails
  using a dummy hash; errors are generic. Passwords are limited to 8–200
  characters.
- Sessions use 256-bit opaque tokens; only SHA-256 hashes are stored in the
  database (`app/lib/session.js`, `app/lib/sessionToken.js`). Cookies are
  HttpOnly, SameSite=Lax and Secure in production. Logout and password reset
  delete session rows.
- Password reset tokens are 256-bit, stored only as SHA-256 hashes, expire
  after one hour, are single-use via an atomic claim, invalidate prior unused
  tokens on a new request and invalidate all sessions on success. Production
  requires an HTTPS webhook and fails loudly when delivery is unavailable.
- Invitation tokens are 256-bit, expire after seven days, are single-use and
  are checked against the authenticated email when an email is set. Declined
  invitations cannot be resent. Acceptance is transactional.
- Every sensitive route resolves the caller from the session cookie and
  re-checks membership/role in the database. URL IDs, body IDs and roles are
  never trusted as authorization inputs. Task sub-resources are scoped by both
  entity id and task id.
- Request bodies are type-checked and allow-listed. Optional notification
  creation is guarded and cannot fail the primary write. Multi-step workflows
  are transactional with P2002/P2025 handling.
- Lifecycle transitions use conditional updates inside a transaction; a
  concurrent transition receives 409 and history/notifications remain consistent.
- Rate limiting covers login, registration, reset and invitation acceptance.
  Forwarded IP headers are ignored unless a trusted proxy is explicitly
  configured, and per-account keys are used where applicable.
- `proxy.js` sets security headers and rejects mismatching `Origin` headers on
  cross-origin writes. `npm run config:check` validates production prerequisites.

## Remaining risks / manual setup

- The rate limiter is process-local. A shared atomic store is required before
  public multi-instance deployment; local defaults do not trust client headers.
- SQLite is local-only. A managed PostgreSQL database and verified data
  migration are required before internet-facing multi-user deployment.
- `User.specialization` remains a global profile attribute. Workspace-scoped
  specialization would require a schema change and a controlled migration.
- Invitation and reset webhooks receive raw tokens; only first-party HTTPS
  endpoints with the optional shared secret should be configured.
- No email verification or OAuth provider is active. Content Security Policy is
  intentionally unset pending validation of framework inline scripts.
- No browser automation or Lighthouse audit is included.
