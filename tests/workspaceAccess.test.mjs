import assert from "node:assert/strict";
import test from "node:test";

import {
  verifyWorkspaceAccess,
  verifyTaskAccess,
  verifyProjectWorkspace,
} from "../app/lib/workspacePermissions.js";

function membershipPrisma(member) {
  return {
    workspaceMember: {
      findFirst: async () => member,
    },
  };
}

test("verifyWorkspaceAccess: member with sufficient role succeeds", async () => {
  const prisma = membershipPrisma({
    userId: "user-admin",
    workspaceId: "ws-1",
    role: "ADMIN",
    user: { id: "user-admin", name: "Admin" },
  });
  const result = await verifyWorkspaceAccess(prisma, "ws-1", "user-admin", "ADMIN");
  assert.strictEqual(result.error, null);
  assert.strictEqual(result.role, "ADMIN");
});

test("verifyWorkspaceAccess: non-member is rejected", async () => {
  const prisma = membershipPrisma(null);
  const result = await verifyWorkspaceAccess(prisma, "ws-1", "user-outsider");
  assert.ok(result.error);
  assert.strictEqual(result.error.includes("not a member"), true);
  assert.strictEqual(result.role, null);
});

test("verifyWorkspaceAccess: insufficient role is rejected", async () => {
  const prisma = membershipPrisma({
    userId: "user-member",
    workspaceId: "ws-1",
    role: "MEMBER",
    user: { id: "user-member", name: "Member" },
  });
  const result = await verifyWorkspaceAccess(prisma, "ws-1", "user-member", "ADMIN");
  assert.ok(result.error);
  assert.strictEqual(result.error.includes("Insufficient permissions"), true);
  assert.strictEqual(result.role, "MEMBER");
});

test("verifyWorkspaceAccess: roles are workspace-specific", async () => {
  const prismaAdmin = membershipPrisma({
    userId: "user-cross", workspaceId: "ws-admin", role: "ADMIN",
    user: { id: "user-cross" },
  });
  const adminResult = await verifyWorkspaceAccess(
    prismaAdmin,
    "ws-admin",
    "user-cross",
    "ADMIN",
  );
  assert.strictEqual(adminResult.error, null);

  const prismaMember = membershipPrisma({
    userId: "user-cross", workspaceId: "ws-member", role: "MEMBER",
    user: { id: "user-cross" },
  });
  const memberResult = await verifyWorkspaceAccess(
    prismaMember,
    "ws-member",
    "user-cross",
    "ADMIN",
  );
  assert.ok(memberResult.error);
});

test("verifyWorkspaceAccess: invalid workspace id is rejected", async () => {
  const prisma = membershipPrisma(null);
  const empty = await verifyWorkspaceAccess(prisma, "", "user-x");
  assert.ok(empty.error);
  assert.strictEqual(empty.error.includes("Invalid workspace ID"), true);

  const nullResult = await verifyWorkspaceAccess(prisma, null, "user-x");
  assert.ok(nullResult.error);
});

function taskPrisma(task, membership, assigneeMembership) {
  return {
    task: {
      findFirst: async () => task,
    },
    workspaceMember: {
      findFirst: async (opts) => {
        if (opts.where && opts.where.userId === "user-actor") return membership;
        return assigneeMembership;
      },
    },
  };
}

test("verifyTaskAccess: task in workspace for a member succeeds", async () => {
  const prisma = taskPrisma(
    { id: "task-1", workspaceId: "ws-1", assigneeId: null },
    { userId: "user-actor", workspaceId: "ws-1", role: "MEMBER", user: {} },
    null,
  );
  const result = await verifyTaskAccess(prisma, "task-1", "ws-1", "user-actor", "MEMBER");
  assert.strictEqual(result.error, null);
  assert.strictEqual(result.task.id, "task-1");
});

test("verifyTaskAccess: task not in workspace is rejected", async () => {
  const prisma = taskPrisma(
    null,
    { userId: "user-actor", workspaceId: "ws-1", role: "MEMBER", user: {} },
    null,
  );
  const result = await verifyTaskAccess(prisma, "task-1", "ws-1", "user-actor", "MEMBER");
  assert.ok(result.error);
  assert.strictEqual(result.error.includes("not found in this workspace"), true);
});

test("verifyTaskAccess: assignee must be a workspace member", async () => {
  const prisma = taskPrisma(
    { id: "task-1", workspaceId: "ws-1", assigneeId: "user-outsider" },
    { userId: "user-actor", workspaceId: "ws-1", role: "MEMBER", user: {} },
    null,
  );
  const result = await verifyTaskAccess(prisma, "task-1", "ws-1", "user-actor", "MEMBER");
  assert.ok(result.error);
  assert.strictEqual(result.error.includes("assignee is not a member"), true);
});

test("verifyTaskAccess: task with no assignee passes assignee check", async () => {
  const prisma = taskPrisma(
    { id: "task-1", workspaceId: "ws-1", assigneeId: null },
    { userId: "user-actor", workspaceId: "ws-1", role: "MEMBER", user: {} },
    null,
  );
  const result = await verifyTaskAccess(prisma, "task-1", "ws-1", "user-actor", "MEMBER");
  assert.strictEqual(result.error, null);
});

test("verifyProjectWorkspace: project must belong to workspace", async () => {
  const prisma = {
    project: {
      findUnique: async () => ({
        id: "proj-1",
        workspaceId: "ws-2",
      }),
    },
    workspaceMember: {
      findFirst: async () => ({
        userId: "user-a", workspaceId: "ws-1", role: "MEMBER", user: {},
      }),
    },
  };
  const result = await verifyProjectWorkspace(prisma, "proj-1", "ws-1", "user-a");
  assert.ok(result.error);
  assert.strictEqual(
    result.error.includes("Project not found in this workspace"),
    true,
  );
});
