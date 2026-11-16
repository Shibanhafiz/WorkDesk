const validStatuses = new Set([
  "PLANNING",
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
]);
const allowedFields = new Set([
  "name",
  "description",
  "status",
  "startDate",
  "dueDate",
]);

export function isValidProjectId(id) {
  return typeof id === "string" && /^c[a-z0-9]{24}$/.test(id);
}

function isValidDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateProjectDateRange(startDate, dueDate) {
  if (startDate && dueDate && startDate > dueDate) {
    return { error: "Start date must be on or before the due date." };
  }

  return {};
}

export function validateProjectInput(input, { partial = false } = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "The request body must be a JSON object." };
  }

  const fields = Object.keys(input);
  const unknownField = fields.find((field) => !allowedFields.has(field));

  if (unknownField) {
    return { error: `Unknown project field: ${unknownField}.` };
  }

  if (partial && fields.length === 0) {
    return { error: "Provide at least one project field to update." };
  }

  if (!partial && !Object.hasOwn(input, "name")) {
    return { error: "A project name is required." };
  }

  const data = {};

  if (Object.hasOwn(input, "name")) {
    if (typeof input.name !== "string" || input.name.trim().length === 0) {
      return { error: "Project name must be a non-empty string." };
    }

    if (input.name.trim().length > 100) {
      return { error: "Project name must be 100 characters or fewer." };
    }

    data.name = input.name.trim();
  }

  if (Object.hasOwn(input, "description")) {
    if (
      input.description !== null &&
      typeof input.description !== "string"
    ) {
      return { error: "Description must be a string or null." };
    }

    const description = input.description?.trim() || null;
    if (description && description.length > 1000) {
      return { error: "Description must be 1,000 characters or fewer." };
    }
    data.description = description;
  }

  if (Object.hasOwn(input, "status")) {
    if (!validStatuses.has(input.status)) {
      return {
        error: "Status must be PLANNING, ACTIVE, COMPLETED, or ARCHIVED.",
      };
    }
    data.status = input.status;
  }

  for (const field of ["startDate", "dueDate"]) {
    if (!Object.hasOwn(input, field)) {
      continue;
    }

    if (input[field] === null) {
      data[field] = null;
    } else if (
      typeof input[field] !== "string" ||
      !isValidDateOnly(input[field])
    ) {
      return {
        error: `${field === "startDate" ? "Start" : "Due"} date must be a valid YYYY-MM-DD date or null.`,
      };
    } else {
      data[field] = new Date(`${input[field]}T00:00:00.000Z`);
    }
  }

  if (!partial) {
    const rangeValidation = validateProjectDateRange(
      data.startDate,
      data.dueDate,
    );
    if (rangeValidation.error) {
      return rangeValidation;
    }
  }

  return { data };
}
