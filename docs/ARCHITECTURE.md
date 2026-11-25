# Architecture

## Stack

- Next.js 16.4.6 App Router, React 19, Tailwind CSS 4 (Turbopack).
- Prisma 7 with the Better SQLite adapter (`@prisma/adapter-better-sqlite3`).
- Node's built-in test runner (`node --test`).

## Layout

- `app/page.js`, `/projects`, `/tasks`, `/my-tasks`, `/team`, `/upcoming`,
  `/analytics`, `/settings`: application pages.
- `app/login`, `/register`, `/forgot-password`, `/reset-password`, `/onboarding`,
  `/invite/[token]`: authentication and entry flows.
- `app/api/**`: route handlers. All state-changing endpoints resolve the caller
  from the session cookie and re-check workspace membership.
- `app/components/**`: reusable UI (dialogs, forms, cards, sidebar, activity).
- `app/lib/**`: validation, permissions, session helpers, hooks and logging.
- `prisma/schema.prisma` and `prisma/migrations/**`: data model and migrations.
- `proxy.js`: request-level security headers and cross-origin write rejection.

## Data model

`User` owns sessions, memberships, notifications, activities and profile data.
`Workspace` can be personal (`isPersonal: true`) or a team workspace. Access is
granted only through `WorkspaceMember`. `Project` and `Task` carry `workspaceId`;
tasks optionally reference a project and an assignee. `Invitation` holds a
hashed link token, role, optional specialization, expiry and acceptance state.
`PasswordResetToken` stores a SHA-256 token hash and single-use timestamp.
`Activity` and `Notification` provide the audit and in-app notification trails.

## Authorization

Role hierarchy lives in `app/lib/workspacePermissions.js`:
`ADMIN (3) > MANAGER (2) > MEMBER (1)`. `can()` is the single source of truth.
Server helpers in `app/lib/session.js` (`requireWorkspaceMember`,
`requireTaskMember`, `setActiveWorkspace`) resolve the caller from the session,
never from request bodies. UI hiding is never used as the only control.

## Request flow

Browser form -> API route -> session lookup -> workspace resolution (project
ownership or active session workspace) -> membership/role check -> field
validation -> Prisma write -> activity/notification -> JSON response -> local
state refresh. Failed validation returns 4xx with a generic, safe message;
unexpected errors are logged by name/code only and return 5xx.
