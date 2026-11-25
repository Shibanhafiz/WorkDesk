import { can } from "./workspacePermissions.js";

/**
 * Who may record an issue against a task:
 * - MANAGER+ can always record issues (including when reopening).
 * - MEMBER can record issues only on tasks assigned to them.
 */
export function canRecordIssue(role, isAssignee) {
  return can(role, "MANAGER") || isAssignee === true;
}

/**
 * Who may change an issue's resolution:
 * - MANAGER+ can resolve or close any issue.
 * - The original reporter may resolve their own issue.
 */
export function canUpdateIssue(role, isReporter) {
  return can(role, "MANAGER") || isReporter === true;
}
