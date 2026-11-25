import { createHash, randomBytes } from "node:crypto";

export const PASSWORD_RESET_TTL_SECONDS = 60 * 60;

export function createPasswordResetToken() {
  return randomBytes(32).toString("hex");
}

export function hashPasswordResetToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function validatePasswordResetRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "The request body must be a JSON object." };
  }

  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }

  return { data: { email } };
}

export function validatePasswordResetConfirm(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "The request body must be a JSON object." };
  }

  const token = typeof input.token === "string" ? input.token.trim() : "";
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return { error: "This reset link is invalid." };
  }

  if (typeof input.password !== "string" || input.password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (input.password.length > 200) {
    return { error: "Password must be 200 characters or fewer." };
  }

  return { data: { token, password: input.password } };
}
