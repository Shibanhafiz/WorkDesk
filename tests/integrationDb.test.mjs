import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";

import { PrismaBetterSqlite3 } from "../node_modules/@prisma/adapter-better-sqlite3/dist/index.js";
import { PrismaClient } from "../generated/prisma/client.ts";
import { hashSessionToken, SHORT_SESSION_TTL_SECONDS } from "../app/lib/sessionToken.js";
import { acceptWorkspaceInvitation } from "../app/lib/invitationAcceptance.js";
import { hashPasswordResetToken, createPasswordResetToken } from "../app/lib/passwordReset.js";
import { isInvitationExpired } from "../app/lib/invitationToken.js";
import { parsePagination } from "../app/lib/pagination.js";
import { isUpcoming } from "../app/lib/myTasks.js";
import { groupTasksByDueDate } from "../app/lib/taskInsights.js";

const repoRoot = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "workdesk-v2-test-"));
const dbPath = path.join(tempRoot, "integration.db");
const databaseUrl = `file:${dbPath.replace(/\\/g, "/")}`;
let prisma;

before(() => {
  execFileSync(
    process.execPath,
    [path.join(repoRoot, "node_modules", "prisma", "build", "index.js"), "migrate", "deploy"],
    {
      cwd: repoRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "pipe",
    },
  );
  prisma = new PrismaClient({
    adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
  });
});

after(async () => {
  if (prisma) await prisma.$disconnect();
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

async function createUser(email) {
  return prisma.user.create({
    data: {
      id: `user-${email.split("@")[0]}`,
      email,
      name: "Test User",
      passwordHash: "scrypt:test:test",
    },
  });
}

async function createWorkspaceWithAdmin(owner) {
  const workspace = await prisma.workspace.create({
    data: {
      id: `workspace-${owner.id}`,
      name: "Test Workspace",
      ownerId: owner.id,
    },
  });
  await prisma.workspaceMember.create({
    data: { userId: owner.id, workspaceId: workspace.id, role: "ADMIN" },
  });
  return workspace;
}

test("migrations create the expected application tables", async () => {
  const rows = await prisma.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
  );
  const names = rows.map((row) => row.name);
  for (const table of [
    "User", "Workspace", "WorkspaceMember", "Session", "Project", "Task",
    "Invitation", "TaskHistory", "Comment", "Notification", "Issue",
    "Attachment", "Activity", "PasswordResetToken", "TaskLink",
  ]) {
    assert.ok(names.includes(table), `missing table ${table}`);
  }
});

test("sessions persist only token hashes", async () => {
  const user = await createUser("session@example.invalid");
  const token = "raw-session-token";
  const expiresAt = new Date(Date.now() + SHORT_SESSION_TTL_SECONDS * 1000);
  await prisma.session.create({
    data: { tokenHash: hashSessionToken(token), userId: user.id, expiresAt },
  });
  const stored = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
  });
  assert.ok(stored);
  assert.notStrictEqual(stored.tokenHash, token);
  assert.strictEqual(stored.tokenHash, hashSessionToken(token));
  assert.strictEqual(stored.userId, user.id);
  assert.ok(expiresAt.getTime() > Date.now());
});

test("password reset tokens are stored hashed and can be invalidated", async () => {
  const user = await createUser("reset@example.invalid");
  const raw = createPasswordResetToken();
  const created = await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashPasswordResetToken(raw),
      userId: user.id,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  assert.notStrictEqual(created.tokenHash, raw);
  assert.strictEqual(
    created.tokenHash,
    hashPasswordResetToken(raw),
  );
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  const remaining = await prisma.passwordResetToken.count({
    where: { userId: user.id, usedAt: null },
  });
  assert.strictEqual(remaining, 0);
});

test("invitation acceptance is single-use and scoped to the invited email", async () => {
  const inviter = await createUser("inviter@example.invalid");
  const invitee = await createUser("invitee@example.invalid");
  const other = await createUser("other@example.invalid");
  const workspace = await createWorkspaceWithAdmin(inviter);

  const invitation = await prisma.invitation.create({
    data: {
      token: "invite-token-one",
      workspaceId: workspace.id,
      email: invitee.email,
      role: "MANAGER",
      invitedById: inviter.id,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });

  assert.strictEqual((await acceptWorkspaceInvitation(prisma, other, invitation.token)).status, 403);
  const first = await acceptWorkspaceInvitation(prisma, invitee, invitation.token);
  assert.strictEqual(first.error, undefined);
  assert.strictEqual(first.role, "MANAGER");
  const second = await acceptWorkspaceInvitation(prisma, invitee, invitation.token);
  assert.strictEqual(second.status, 410);

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: invitee.id, workspaceId: workspace.id },
  });
  assert.strictEqual(membership?.role, "MANAGER");
});

test("expired and rejected invitations cannot be accepted", async () => {
  const inviter = await createUser("expired-inviter@example.invalid");
  const invitee = await createUser("expired-invitee@example.invalid");
  const workspace = await createWorkspaceWithAdmin(inviter);

  const expired = await prisma.invitation.create({
    data: {
      token: "invite-token-expired",
      workspaceId: workspace.id,
      email: invitee.email,
      invitedById: inviter.id,
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  assert.strictEqual(isInvitationExpired(expired.expiresAt), true);
  assert.strictEqual((await acceptWorkspaceInvitation(prisma, invitee, expired.token)).status, 410);

  const rejected = await prisma.invitation.create({
    data: {
      token: "invite-token-rejected",
      workspaceId: workspace.id,
      email: invitee.email,
      invitedById: inviter.id,
      expiresAt: new Date(Date.now() + 60_000),
      rejectedAt: new Date(),
    },
  });
  assert.strictEqual((await acceptWorkspaceInvitation(prisma, invitee, rejected.token)).status, 410);
});

test("pagination is bounded and dates use one seven-day window", () => {
  assert.strictEqual(parsePagination(new URLSearchParams()).pageSize, 50);
  assert.strictEqual(
    parsePagination(new URLSearchParams("pageSize=9999")).pageSize,
    100,
  );
  assert.strictEqual(parsePagination(new URLSearchParams("page=0")).page, 1);

  const task = { status: "TODO", dueDate: "2026-11-22T00:00:00.000Z" };
  assert.strictEqual(isUpcoming(task, "2026-11-15"), true);
  assert.strictEqual(
    groupTasksByDueDate([{ id: "x", ...task }], "2026-11-15").dueSoon.length,
    1,
  );
});

test("task activity metadata can be filtered in the database", async () => {
  const owner = await createUser("activity@example.invalid");
  const workspace = await createWorkspaceWithAdmin(owner);
  const task = await prisma.task.create({
    data: { title: "Activity task", workspaceId: workspace.id, createdById: owner.id },
  });
  await prisma.activity.create({
    data: {
      workspaceId: workspace.id,
      actorId: owner.id,
      type: "COMMENT_ADDED",
      targetId: "comment-id",
      targetType: "COMMENT",
      metadata: JSON.stringify({ taskId: task.id }),
    },
  });
  const found = await prisma.activity.findMany({
    where: {
      workspaceId: workspace.id,
      OR: [{ targetId: task.id }, { metadata: { contains: `"taskId":"${task.id}"` } }],
    },
  });
  assert.strictEqual(found.length, 1);
});
