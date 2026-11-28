# Testing

## Commands

```powershell
npm ci
npx prisma generate
npm test
npm run test:http
npm run lint
npm run build
npm audit --audit-level=low
```

`npm test` runs Node's built-in test runner over `tests/*.test.mjs`: password,
session token, role, validator, lifecycle, timeline, insights, invitation and
notification helpers, plus `tests/integrationDb.test.mjs`, which migrates a
**disposable SQLite database** in the OS temp directory and exercises session
hashing, reset-token handling, invitation acceptance/rejection/expiry,
pagination bounds, the seven-day window and database-level activity filtering.
No test uses `prisma/workdesk.db`.

`npm run test:http` builds on the production build: it migrates a disposable
database, starts `next start` on a random local port and exercises real HTTP
flows (registration, session, null body, duplicate task, bounded listing,
cross-workspace denial, member add, task hijack denial, unassigned comment,
last-admin guard, invitation accept, logout). It removes its temporary database
on exit. Run `npm run build` before it when source changed.

## Clean database verification

```powershell
$env:DATABASE_URL = 'file:C:/path/to/disposable.db'
npx prisma migrate deploy
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script
# Expected: "-- This is an empty migration."
```

## Known test gaps

- No browser/visual, accessibility or Lighthouse automation.
- No load/performance measurement; bounded queries are verified structurally,
  not by throughput tests.
- Multi-instance rate-limit sharing and PostgreSQL migration are not tested;
  no such infrastructure is configured.
- Production email, webhook and OAuth flows are not exercised because no
  external credentials are configured.
