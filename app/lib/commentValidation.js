export const MAX_COMMENT_LENGTH = 2000;

/**
 * Validate comment content.
 * Returns { error } or { data: { content } }.
 */
export function validateCommentInput(input) {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Request body must be a JSON object." };
  }

  const content = input.content;

  if (typeof content !== "string") {
    return { error: "Comment content is required." };
  }

  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return { error: "Comment cannot be empty." };
  }

  if (trimmed.length > MAX_COMMENT_LENGTH) {
    return {
      error: `Comment cannot be longer than ${MAX_COMMENT_LENGTH} characters.`,
    };
  }

  return { data: { content: trimmed } };
}
