# Deployment

## Local development (SQLite)

```powershell
npm ci
npx prisma generate
$env:DATABASE_URL = 'file:./prisma/workdesk.db'
npx prisma migrate deploy
npm run dev
```

`npm run dev` and `npm run build` also run `prisma generate`. The SQLite file is
Git-ignored; back it up before any migration or destructive operation.

## Environment variables

Copy `.env.example` to `.env`. Never commit `.env`, database files, credentials
or private keys.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Datasource for Prisma CLI and runtime adapter. Local default: `file:./prisma/workdesk.db`. |
| `PASSWORD_RESET_WEBHOOK_URL` | HTTPS endpoint that receives `{ email, token }`. Required in production. |
| `PASSWORD_RESET_WEBHOOK_SECRET` | Optional bearer secret sent to the reset webhook. |
| `INVITATION_WEBHOOK_URL` | Optional HTTPS endpoint for invitation delivery. |
| `INVITATION_WEBHOOK_SECRET` | Optional bearer secret sent to the invitation webhook. |
| `ALLOW_DEV_RESET_TOKEN` | Local-only escape hatch; must be `false` in production. |
| `TRUST_PROXY_HEADERS` | Set `true` only when a trusted reverse proxy overwrites `X-Forwarded-For`/`X-Real-IP`. |
| `RATE_LIMIT_SHARED_STORE_CONFIGURED` | Production config-check flag; set `true` only after wiring a shared atomic rate-limit store. |
| `NEXT_PUBLIC_GOOGLE_*` | Kept disabled until an OAuth callback is implemented and tested. |

Run `npm run config:check` before a production deployment. It fails when a
production prerequisite is missing and prints no secret values.

## Database setup and migration

See `docs/DATABASE.md` for the clean-install procedure, the four V2 baseline
migrations, and the verified reconciliation steps for pre-V2 databases. CI
verifies that a fresh SQLite database can be created from migrations and that
the resulting schema matches `prisma/schema.prisma`.

## Password reset delivery

The reset request returns a generic error when delivery is not configured. In
production the webhook must be HTTPS; a failed webhook returns 502 instead of a
false success. Local development can set `ALLOW_DEV_RESET_TOKEN=true` and leave
the webhook unset to receive a token in the API response. The webhook must be a
first-party, trusted service because it receives the raw token.

## Rate limiting

Login, registration, password reset and invitation acceptance are rate limited
with these defaults: register 10/hour, login 8 per 15 minutes, reset request
5/hour, reset confirm 10/hour, invitation accept 10/hour. Each is configurable
through the `RATE_LIMIT_*` variables in `.env.example` (positive integers only;
invalid values fall back to the default).
By default client-supplied forwarded headers are ignored and all requests share
one local bucket, so a single instance cannot be trivially bypassed with a
spoofed header. When `TRUST_PROXY_HEADERS=true`, only a proxy that **overwrites**
forwarded headers may be used; per-account throttles still apply to login and
reset requests.

The limiter is process-local. This is acceptable for a single local instance,
not for public multi-instance hosting. Production requires a shared atomic
store (for example Redis) behind the existing `checkRateLimit` call sites, with
the same keys and `Retry-After` responses. This repository does not configure or
claim that infrastructure.

## Public production prerequisites

1. Managed PostgreSQL database with a verified data migration; SQLite is local-only.
2. Shared rate-limit store and verified reverse-proxy contract.
3. HTTPS termination and production cookie `Secure` flag (derived from `NODE_ENV=production`).
4. Trusted HTTPS password-reset webhook; `ALLOW_DEV_RESET_TOKEN=false`.
5. `npm run config:check` passes.
6. Database backup and tested restore before each migration.
7. Full verification: `npm test`, `npm run test:http`, `npm run lint`, `npm run build`, migration diff check.

## Health check

`GET /api/health` returns `{ "status": "ok", "database": "connected" }` or 503
when the datasource cannot be reached. It exposes no secrets.

## CI

`.github/workflows/ci.yml` installs dependencies, generates the Prisma client,
deploys migrations to a disposable database, checks the schema diff, runs lint,
unit/isolated-DB tests, builds, and runs HTTP integration checks.

## Backup, restore and rollback

- Backup: copy `prisma/workdesk.db` plus any `-wal`/`-shm` files while the app is stopped.
- Restore: stop the app, replace the database from the verified backup, restart.
- Rollback of code: redeploy the previous application version; do not roll back schema
  by deleting migration folders. For schema rollback, restore the backed-up database
  and use `prisma migrate resolve` only after verifying actual schema state.

No public deployment is performed by this repository or this task.
