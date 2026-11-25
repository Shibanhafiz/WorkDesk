# Database

## Current state

The project uses SQLite via Prisma 7 and the Better SQLite adapter. Schema:
`prisma/schema.prisma`. Migrations: `prisma/migrations/**`. Local database:
`prisma/workdesk.db` (ignored by Git).

Key relations:

- `User` 1—N `Session`, `WorkspaceMember`, `Notification`, `Activity`,
  `PasswordResetToken`.
- `Workspace` 1—N `WorkspaceMember`, `Project`, `Task`, `Invitation`, `Activity`.
- `Project` 1—N `Task`; `Task` optionally references an assignee `User`.
- `Invitation` stores a unique token hash-ready token, expiry and single-use
  acceptance/rejection timestamps.
- `PasswordResetToken` stores only a SHA-256 hash of the token.

## Migration strategy

1. Copy `prisma/workdesk.db` and any `-wal`/`-shm` files to a backup location.
2. Apply committed migrations with `npm run db:deploy`.
3. For schema changes, run `npm run db:migrate -- --name describe_change`.
4. Never delete or reset the database to recover from a migration error; use a
   backup and resolve the migration state with `prisma migrate resolve`.

## Production database

SQLite is suitable for local/single-instance use. A production multi-user
deployment needs PostgreSQL with a planned, tested data migration. Configure
`DATABASE_URL` for both the CLI (`prisma.config.mjs`) and the runtime adapter
(`app/lib/prisma.js`). That migration is not yet configured or tested here.
