export function errorResponse(message, status) {
  return Response.json({ error: message }, { status });
}

export function logApiError(resource, operation, error) {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  const errorCode =
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
      ? ` (${error.code})`
      : "";

  console.error(
    `[${resource} API] ${operation} failed: ${errorName}${errorCode}`,
  );
}

export function logTaskApiError(operation, error) {
  logApiError("Task", operation, error);
}
