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
- `Task` 1—N `TaskLink` (external URLs such as repositories or documents;
  optional creator with `SET NULL` on user removal).

## Migration strategy

1. Copy `prisma/workdesk.db` and any `-wal`/`-shm` files to a backup location.
2. Apply committed migrations with `npm run db:deploy`.
3. For schema changes, run `npm run db:migrate -- --name describe_change`.
4. Never delete or reset the database to recover from a migration error; use a
   backup and resolve the migration state with `prisma migrate resolve`.

## Clean installation (verified)

On a machine without an existing database:

```powershell
$env:DATABASE_URL = 'file:./prisma/workdesk.db'
npx prisma migrate deploy
npx prisma db generate
```

The V2 baseline adds four migrations that the earlier history was missing:

- `20261115000000_core_tables`: `User`, `Workspace`, `WorkspaceMember`,
  `Invitation`, `Notification`, `Activity`, `Comment` and their indexes.
- `20261127000000_task_assignment_columns`: `Task.assigneeId` and
  `Task.workspaceId`, required by the later task rebuild.
- `20261127000002_project_workspace`: `Project.workspaceId` and its foreign key.
- `20261128000000_finalize_constraints`: foreign keys, unique constraints and
  indexes on legacy collaboration/session tables.
- `20261128000002_query_indexes`: composite indexes for workspace task/project
  filtering.
- `20261128000003_add_task_links`: the `TaskLink` table for repository/document
  URLs attached to tasks.

`Session.tokenHash` maps to the legacy `token` column; only SHA-256 hashes are
written from V2 onward, so pre-V2 raw-token sessions become invalid without a
destructive data operation.

Verification on a disposable database:

```powershell
$env:DATABASE_URL = 'file:C:/path/to/disposable.db'
npx prisma migrate deploy
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
# Expected output: "-- This is an empty migration."
```

## Existing pre-V2 databases

Databases created before these migrations may already contain the schema while
their `_prisma_migrations` table does not record the four new entries. Do **not**
delete, reset or blindly apply migrations to such a database. Back it up first,
then verify the actual schema before marking each migration as applied:

```powershell
# Read-only verification (run against a copy first if the database is in use).
node -e "const D=require('better-sqlite3');const db=new D('prisma/workdesk.db',{readonly:true});const cols=(t)=>db.prepare('PRAGMA table_info(\"'+t+'\")').all().map(c=>c.name);const names=db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all().map(r=>r.name);console.log({tables:['User','Workspace','WorkspaceMember','Invitation','Notification','Activity','Comment'].every(t=>names.includes(t)),taskCols:['assigneeId','workspaceId'].every(c=>cols('Task').includes(c)),projectCols:cols('Project').includes('workspaceId')});db.close()"
```

Only when every check is true, record the migrations whose changes already
exist in the database as applied. The constraint/index migrations are then
applied for real by `npm run db:deploy`:

```powershell
npx prisma migrate resolve --applied 20261115000000_core_tables
npx prisma migrate resolve --applied 20261127000000_task_assignment_columns
npx prisma migrate resolve --applied 20261127000002_project_workspace
npm run db:deploy   # runs finalize_constraints, query_indexes, add_task_links
```

Do **not** resolve `20261128000000_finalize_constraints` or
`20261128000002_query_indexes` unless their foreign keys and indexes are
actually present — verify with `prisma migrate diff --from-config-datasource
--to-schema prisma/schema.prisma --script` and only resolve what the diff
confirms already matches.

This procedure was executed and verified against the local database on
2026-11-28: pre-flight checks (integrity, duplicate unique keys, row counts),
all three deployments applied, row counts unchanged, and the final schema diff
returned an empty migration. Backups of the database before that run are kept
under the workspace temp backup directory.

## Production database

SQLite is suitable for local/single-instance use. A production multi-user
deployment needs PostgreSQL with a planned, tested data migration. Configure
`DATABASE_URL` for both the CLI (`prisma.config.mjs`) and the runtime adapter
(`app/lib/prisma.js`). That migration is not yet configured or tested here.
