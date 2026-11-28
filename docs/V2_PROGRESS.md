# WorkDesk V2 Implementation Progress

## Baseline (Stage 0)

- Repository state: clean working tree at `c92af4c`; no pre-existing uncommitted changes.
- Stack verified: Next.js 16.4.6 App Router, React 19, Prisma 7.10.1 with Better SQLite adapter, Node test runner, ESLint 9.
- Baseline commands and results:
  - `npm test`: 97 tests passed, 0 failed.
  - `npm run lint`: passed (no diagnostics).
  - `npm run build`: passed (36 static pages; all API routes compiled).
- Local database: `prisma/workdesk.db` (Git-ignored). All 14 expected application tables present; `_prisma_migrations` contains 11 applied rows (one duplicate historical row for `20261125000000_add_specialization`).
- Database backup: `C:\Users\shiba\AppData\Local\Temp\opencode\workdesk-v2-backups\workdesk.db.20261128-173256` (237,568 bytes). Verified read-only: `PRAGMA integrity_check = ok`, all 14 application tables readable. The source file was locked by another process at copy time, so a source hash could not be taken; the copy itself completed and was independently verified.
- No files were modified during Stage 0 inspection and backup verification.

## Implementation checklist

- [x] Stage 0 — safety, baseline, backup
- [x] Stage 1 — migration repair and clean-DB verification
- [x] Stage 2 — authentication, sessions, authorization
- [x] Stage 3 — API reliability and business logic
- [x] Stage 4 — database integrity and performance
- [x] Stage 5 — regression/security tests and quality checks
- [x] Stage 6 — deployment readiness, rate-limit design, CI, documentation
- [ ] Final verification and report

## Progress log

### Stage 0
Completed. Baseline recorded above. Git checkpoint is the existing clean HEAD (`c92af4c`); no commit or branch was created.

### Stage 1
Added four additive migrations: core tables, task assignment columns, project workspace column, and constraint finalization. `prisma migrate deploy` on a disposable DB applied all migrations; `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` returned an empty migration; synthetic cross-table queries succeeded with FKs enabled. The user's SQLite database was not modified. `docs/DATABASE.md` documents clean setup and verified reconciliation.

### Stage 2
Session tokens are now stored as SHA-256 hashes in the mapped `Session.token` column, so legacy raw-token sessions are invalid without destructive DB changes. Unknown emails now run the same scrypt verification via `DUMMY_PASSWORD_HASH`. Password inputs have a 200-character maximum. Self-claim of an assigned task is denied. Role changes and member removal are transactional with last-admin/self-change guards. New reset requests invalidate prior unused tokens; dev reset tokens require explicit `ALLOW_DEV_RESET_TOKEN=true` in non-production. Duplicate registration uses a generic error, including P2002 races. Added 7 unit tests; suite is 104 passing.

### Stage 3
Added a shared JSON-object body check to routes that previously threw on `null`. Comment creation no longer returns 500 after a successful write; optional notifications are guarded and null-safe. Lifecycle transitions use conditional `updateMany` inside a transaction with a 409 for concurrent changes, and notification dedupe keys use the history record id. Registration, invitation create/accept/resend, member add and comment writes are transactional with P2002 handling. Declined invitations can no longer be resent. Workspace PATCH validates name/description; task identifiers are validated. The seven-day window is now shared by My Tasks, task insights and project insights. WDB-18 is only partially fixed: the global specialization write is now after membership validation, but per-workspace storage requires a schema change that would affect the un-migrated local database.

### Stage 4
Task and project listings now use bounded pagination (default 50, max 100) with stable ordering, `status`/`projectId`/`assigneeId` filters and `X-*` pagination headers while preserving array responses. My Tasks requests `mine=true` so filtering happens in SQL. Task list history is capped at 50 entries. Task activity queries filter by `metadata.taskId` in the database and cap at 200 rows. Workspace deletion blocks while projects or tasks remain and clears `User.workspaceId` transactionally. Exact duplicate tasks in the same workspace/project now return 409. Added query-index migration and matching schema indexes; fresh-DB migration and diff verification pass.

### Stage 5
Added `tests/integrationDb.test.mjs` (7 tests on a disposable SQLite database in the OS temp directory: schema creation, session token hashing, reset-token hashing/invalidation, invitation accept single-use/email scope/expiry/rejection, pagination bounds and seven-day window, database-level activity metadata filtering) and `scripts/http-integration.mjs` with the `test:http` npm script. The HTTP harness migrates a disposable database, starts `next start` on a random port, and exercises 16 real flows (registration, session, null body, duplicate task, bounded list headers, cross-workspace denial, member add, assigned-task hijack denial, unassigned comment, last-admin guard, invitation create/accept, logout invalidation), then shuts the server down before retrying temp cleanup. Final suite: `npm test` 112 passed, `npm run test:http` 16/16, `npm run lint` clean.

### Stage 6
Rate limiting no longer trusts client-supplied `X-Forwarded-For`/`X-Real-IP` unless `TRUST_PROXY_HEADERS=true`; forwarded IPs are validated before use and local defaults share one bucket. Password reset fails loudly: production requires an HTTPS `PASSWORD_RESET_WEBHOOK_URL`, webhook failures return 502, unconfigured delivery returns 503 instead of a false success, and an optional `PASSWORD_RESET_WEBHOOK_SECRET` is sent as a bearer token; dev token exposure stays behind `ALLOW_DEV_RESET_TOKEN=true`. Added `scripts/check-production-config.mjs` (`npm run config:check`) that blocks on missing production prerequisites without printing secrets. Rewrote `docs/DEPLOYMENT.md`, `docs/SECURITY.md`, `docs/TESTING.md`; updated `docs/DATABASE.md`, `README.md` and `.env.example`. CI now generates the Prisma client before lint/tests, deploys migrations to a disposable database, asserts an empty `migrate diff`, and runs lint, tests, build and `test:http`.

## Post-V2 feature: task links

Tasks now support external links (repository, spec, document — any http/https
URL) so collaborators can start work from the task itself:

- New `TaskLink` model and additive migration `20261128000003_add_task_links`
  (verified: clean-DB deploy + empty schema diff).
- `POST /api/tasks` accepts an optional `links` array, created in the same
  transaction; updates reject `links` (managed via the details panel).
- New endpoints `GET/POST /api/tasks/[id]/links` and
  `DELETE /api/tasks/[id]/links/[linkId]`, guarded by `requireTaskMember`;
  deletion restricted to the creator or a manager.
- URL validation accepts only http/https (max 2,048 chars), max 10 links per
  task, optional 120-char title; `javascript:` and other schemes rejected.
- UI: optional "Project link" field in the task creation form, and a "Links"
  section in the task details dialog (add/label/remove) next to Attachments.
- Activity log records `LINK_ADDED` / `LINK_REMOVED` with timeline labels;
  assignees get a notification when someone else adds a link.
- Tests: new `tests/taskLinkValidation.test.mjs`, task validation cases,
  `TaskLink` table assertion, 6 new HTTP integration checks.
- Local database: migrated on 2026-11-28 with the verified reconciliation
  (3 `migrate resolve` steps for schema-matching migrations, then `migrate
  deploy` for `finalize_constraints`, `query_indexes` and `add_task_links`).
  Pre-flight: integrity ok, no duplicate unique keys, row counts recorded.
  Post-flight: row counts unchanged, `TaskLink` present, schema diff empty.
  Backups: workdesk.db.20261128-173256 and workdesk.db.20261128-200337.

## Final verification

- `npm test`: 112 passed, 0 failed.
- `npm run lint`: clean.
- `npm run build`: passed (36 static pages, all API routes compiled).
- `npm run test:http`: 16/16 checks passed.
- `npm run config:check`: passes locally (development skips production checks).
- `npm audit --audit-level=low`: 10 known vulnerabilities (3 high `effect` via prisma, 7 moderate `minimatch` via typescript-eslint); no automatic upgrades performed.
- Fresh disposable database: `prisma migrate deploy` applies all migrations; `prisma migrate diff` is empty.
- Local `prisma/workdesk.db`: untouched — integrity `ok`, 15 tables (14 app + `_prisma_migrations`), 11 applied migration rows. Backup verified intact.
- Git: all changes uncommitted at HEAD `c92af4c`; nothing pushed.
