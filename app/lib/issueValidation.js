export const ISSUE_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export const ISSUE_RESOLUTIONS = ["OPEN", "RESOLVED", "CLOSED"];
export const MAX_ISSUE_DESCRIPTION = 2000;

/**
 * Validate issue creation input. Returns { error } or { data }.
 */
export function validateIssueInput(input, { partial = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Request body must be a JSON object." };
  }

  const allowed = new Set(["description", "severity", "resolution"]);
  const unknown = Object.keys(input).find((field) => !allowed.has(field));
  if (unknown) {
    return { error: `Unknown issue field: ${unknown}.` };
  }
  if (partial && Object.keys(input).length === 0) {
    return { error: "Provide at least one issue field to update." };
  }
  if (!partial && !Object.hasOwn(input, "description")) {
    return { error: "Issue description is required." };
  }

  const data = {};

  if (Object.hasOwn(input, "description")) {
    if (typeof input.description !== "string") {
      return { error: "Issue description must be a string." };
    }
    const trimmed = input.description.trim();
    if (trimmed.length === 0) {
      return { error: "Issue description cannot be empty." };
    }
    if (trimmed.length > MAX_ISSUE_DESCRIPTION) {
      return {
        error: `Issue description must be ${MAX_ISSUE_DESCRIPTION} characters or fewer.`,
      };
    }
    data.description = trimmed;
  }

  if (Object.hasOwn(input, "severity")) {
    if (!ISSUE_SEVERITIES.includes(input.severity)) {
      return { error: "Severity must be LOW, MEDIUM, HIGH, or CRITICAL." };
    }
    data.severity = input.severity;
  }

  if (Object.hasOwn(input, "resolution")) {
    if (!ISSUE_RESOLUTIONS.includes(input.resolution)) {
      return { error: "Resolution must be OPEN, RESOLVED, or CLOSED." };
    }
    data.resolution = input.resolution;
  }

  return { data };
}
