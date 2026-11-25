import assert from "node:assert/strict";
import test from "node:test";

import { can } from "../app/lib/workspacePermissions.js";

test("role hierarchy: ADMIN > MANAGER > MEMBER", () => {
  assert.strictEqual(can("ADMIN", "ADMIN"), true);
  assert.strictEqual(can("ADMIN", "MANAGER"), true);
  assert.strictEqual(can("ADMIN", "MEMBER"), true);
  assert.strictEqual(can("MANAGER", "ADMIN"), false);
  assert.strictEqual(can("MANAGER", "MANAGER"), true);
  assert.strictEqual(can("MANAGER", "MEMBER"), true);
  assert.strictEqual(can("MEMBER", "ADMIN"), false);
  assert.strictEqual(can("MEMBER", "MANAGER"), false);
  assert.strictEqual(can("MEMBER", "MEMBER"), true);
});

test("can returns false for unknown roles", () => {
  assert.strictEqual(can("UNKNOWN", "ADMIN"), false);
  assert.strictEqual(can("ADMIN", "UNKNOWN"), false);
});