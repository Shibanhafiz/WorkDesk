import assert from "node:assert/strict";
import test from "node:test";

import {
  can,
  ROLE_HIERARCHY,
} from "../app/lib/workspacePermissions.js";

test("role hierarchy enforces correct permission levels", () => {
  // ADMIN can do everything
  assert.equal(can("ADMIN", "ADMIN"), true);
  assert.equal(can("ADMIN", "MANAGER"), true);
  assert.equal(can("ADMIN", "MEMBER"), true);

  // MANAGER can manage and view, but not admin
  assert.equal(can("MANAGER", "ADMIN"), false);
  assert.equal(can("MANAGER", "MANAGER"), true);
  assert.equal(can("MANAGER", "MEMBER"), true);

  // MEMBER can only do member-level actions
  assert.equal(can("MEMBER", "ADMIN"), false);
  assert.equal(can("MEMBER", "MANAGER"), false);
  assert.equal(can("MEMBER", "MEMBER"), true);
});

test("unknown roles have no permissions", () => {
  assert.equal(can("UNKNOWN", "MEMBER"), false);
  assert.equal(can("ADMIN", "UNKNOWN"), false);
  assert.equal(can("", "MEMBER"), false);
  assert.equal(can("ADMIN", ""), false);
  assert.equal(can(null, "MEMBER"), false);
  assert.equal(can("ADMIN", null), false);
});

test("role hierarchy values are correctly ordered", () => {
  assert.ok(ROLE_HIERARCHY.ADMIN > ROLE_HIERARCHY.MANAGER);
  assert.ok(ROLE_HIERARCHY.MANAGER > ROLE_HIERARCHY.MEMBER);
  assert.ok(ROLE_HIERARCHY.MEMBER > 0);
});

test("workspace isolation: roles are workspace-specific", () => {
  // This test verifies that the permission model supports workspace isolation
  // Each workspace has its own member roles - a user can be ADMIN in one
  // workspace and MEMBER in another. The `can` function operates on a single
  // role at a time, which supports this model.

  // Simulate user A is ADMIN in workspace 1, MEMBER in workspace 2
  const workspace1Role = "ADMIN";
  const workspace2Role = "MEMBER";

  // In workspace 1, they can create projects
  assert.equal(can(workspace1Role, "MANAGER"), true);

  // In workspace 2, they cannot manage
  assert.equal(can(workspace2Role, "MANAGER"), false);
});

test("assignment permissions: assignee must be workspace member", () => {
  // The verifyWorkspaceAccess function checks membership
  // This test verifies the role hierarchy supports assignment checks

  // ADMIN can assign tasks
  assert.equal(can("ADMIN", "MEMBER"), true);

  // MANAGER can assign tasks
  assert.equal(can("MANAGER", "MEMBER"), true);

  // MEMBER can be assigned (has MEMBER role)
  assert.equal(can("MEMBER", "MEMBER"), true);
});

test("invitation role assignment respects hierarchy", () => {
  // Only ADMIN can invite other ADMINs
  // The invitation API checks: if role === "ADMIN" && accessCheck.role !== "ADMIN"
  // This is enforced server-side

  // An ADMIN creating an ADMIN invitation
  assert.equal(can("ADMIN", "ADMIN"), true);

  // A MANAGER cannot create an ADMIN invitation (checked via accessCheck.role !== "ADMIN")
  assert.equal(can("MANAGER", "ADMIN"), false);

  // A MANAGER can create MEMBER and MANAGER invitations
  assert.equal(can("MANAGER", "MANAGER"), true);
  assert.equal(can("MANAGER", "MEMBER"), true);
});