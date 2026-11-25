# Testing

## Run locally (PowerShell)

```powershell
npm install
npm test
npm run lint
npm run build
```

`npm test` runs Node's built-in test runner over `tests/*.test.mjs`: password
hashing, credentials, sessions, role hierarchy, workspace access, invitation
tokens, comments, issues, notifications, activity/idempotency, project/task
validation, onboarding validation, rate limiting and lifecycle actions.

## API/manual checks performed

- Register, duplicate email, login, invalid credentials, logout, session
  persistence and protected API access.
- Personal and team workspace creation, active-workspace persistence, workspace
  switching and cross-workspace 403 responses.
- Project and task creation in both workspace types, including project-derived
  workspace resolution, invalid project IDs, valid/invalid assignees,
  reassignment and assignee removal.
- Invitation create, duplicate rejection, resend, revoke, accept, reuse and
  invalid-token cases.
- Workspace activity retrieval with membership enforcement.

## Not currently automated

- Browser/visual tests (no Playwright or equivalent dependency is installed).
- Accessibility audits and Lighthouse.
- Load/performance testing.
- PostgreSQL migration verification (database not configured).
