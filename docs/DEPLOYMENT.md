# Deployment

## Local production build

```powershell
npm install
npm run db:deploy
npm run build
npm start
```

## Environment

Copy `.env.example` to `.env` and set:

- `DATABASE_URL` — datasource URL used by both Prisma CLI and the runtime
  adapter (default `file:./prisma/workdesk.db`).
- `PASSWORD_RESET_WEBHOOK_URL` — optional HTTPS endpoint for reset delivery.
- `INVITATION_WEBHOOK_URL` — optional HTTPS endpoint for invitation delivery.
- Google OAuth variables — leave disabled until a callback flow is implemented
  and tested.

Never commit `.env`, database files, private keys or credentials.

## Before internet-facing use

1. Move from SQLite to a managed PostgreSQL database and migrate data with a
   verified export/import or Prisma migration; this repository does not yet
   contain that configuration.
2. Use a shared rate-limit store for multi-instance deployments.
3. Terminate TLS at the platform; cookies use `Secure` in production.
4. Back up the database before each migration and verify restore.

## Health check

`GET /api/health` returns `{ "status": "ok", "database": "connected" }` or 503
when the datasource cannot be reached. It exposes no secrets.

## CI

`.github/workflows/ci.yml` runs install, lint, unit tests and a production build
on pushes to `main` and on pull requests.
