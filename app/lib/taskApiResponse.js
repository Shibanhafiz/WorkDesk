export function errorResponse(message, status) {
  return Response.json({ error: message }, { status });
}

export function logTaskApiError(operation, error) {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  const errorCode =
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
      ? ` (${error.code})`
      : "";

  console.error(`[Task API] ${operation} failed: ${errorName}${errorCode}`);
}
