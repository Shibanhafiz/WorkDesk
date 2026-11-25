import { isValidProjectId } from "./projectValidation.js";

const validPriorities = new Set(["LOW", "MEDIUM", "HIGH"]);
// Status is intentionally NOT part of generic task input. Lifecycle changes
// must go through the validated transition endpoint so workflow rules and
// authorization cannot be bypassed by editing a status field directly.
const allowedFields = new Set([
  "title",
  "description",
  "priority",
  "dueDate",
  "projectId",
  "assigneeId",
]);

export function isValidTaskId(id) {
  return typeof id === "string" && /^c[a-z0-9]{24}$/.test(id);
}

function isValidDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateTaskInput(input, { partial = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "The request body must be a JSON object." };
  }

  const fields = Object.keys(input);
  const unknownField = fields.find((field) => !allowedFields.has(field));

  if (unknownField) {
    return { error: `Unknown task field: ${unknownField}.` };
  }

  if (partial && fields.length === 0) {
    return { error: "Provide at least one task field to update." };
  }

  if (!partial && !Object.hasOwn(input, "title")) {
    return { error: "A title is required." };
  }

  const data = {};

  if (Object.hasOwn(input, "title")) {
    if (typeof input.title !== "string" || input.title.trim().length === 0) {
      return { error: "Title must be a non-empty string." };
    }

    if (input.title.trim().length > 100) {
      return { error: "Title must be 100 characters or fewer." };
    }

    data.title = input.title.trim();
  }

  if (Object.hasOwn(input, "description")) {
    if (input.description !== null && typeof input.description !== "string") {
      return { error: "Description must be a string or null." };
    }

    const description = input.description?.trim() || null;
    if (description && description.length > 1000) {
      return { error: "Description must be 1,000 characters or fewer." };
    }
    data.description = description;
  }

  if (Object.hasOwn(input, "priority")) {
    if (!validPriorities.has(input.priority)) {
      return { error: "Priority must be LOW, MEDIUM, or HIGH." };
    }
    data.priority = input.priority;
  }

  if (Object.hasOwn(input, "dueDate")) {
    if (input.dueDate === null) {
      data.dueDate = null;
    } else if (
      typeof input.dueDate !== "string" ||
      !isValidDateOnly(input.dueDate)
    ) {
      return { error: "Due date must be a valid YYYY-MM-DD date or null." };
    } else {
      data.dueDate = new Date(`${input.dueDate}T00:00:00.000Z`);
    }
  }

  if (Object.hasOwn(input, "projectId")) {
    if (input.projectId === null) {
      data.projectId = null;
    } else if (!isValidProjectId(input.projectId)) {
      return { error: "Project ID must be a valid CUID or null." };
    } else {
      data.projectId = input.projectId;
    }
  }

  if (Object.hasOwn(input, "assigneeId")) {
    if (input.assigneeId === null) {
      data.assigneeId = null;
    } else if (
      typeof input.assigneeId !== "string" ||
      !(
        /^c[a-z0-9]{24}$/.test(input.assigneeId) ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          input.assigneeId,
        )
      )
    ) {
      return { error: "Assignee ID must be a valid user ID or null." };
    } else {
      data.assigneeId = input.assigneeId;
    }
  }

  return { data };
}
