import { can } from "./workspacePermissions.js";

/**
 * Comment permissions.
 * - Editing: author only.
 * - Deleting: author, or workspace ADMIN.
 * - Viewing: any member of the task's workspace (enforced by route).
 */

export function canEditComment(comment, userId) {
  if (!comment || !userId || typeof userId !== "string") {
    return false;
  }
  return comment.authorId === userId;
}

export function canDeleteComment(comment, userId, workspaceRole) {
  if (!comment || !userId || typeof userId !== "string") {
    return false;
  }
  if (comment.authorId === userId) {
    return true;
  }
  return can(workspaceRole, "ADMIN");
}

/**
 * Extract @mentions from comment content. Mentions are tokens of the
 * form @word (letters, digits, underscore) following @.
 * Returns an array of unique mention strings (without the @).
 */
export function extractMentions(content) {
  if (typeof content !== "string") return [];
  const names = new Set();
  // A mention starts with @ preceded by the start of the string or whitespace,
  // so "email@host.com" does not produce a false mention.
  for (const match of content.matchAll(/(?:^|\s)@([A-Za-z0-9_]+)/g)) {
    names.add(match[1].toLowerCase());
  }
  return [...names];
}
