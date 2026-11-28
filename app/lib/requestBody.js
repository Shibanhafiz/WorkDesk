export function isJsonObjectBody(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
