import { randomBytes, scrypt as scryptCallback, scryptSync, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const MAX_PASSWORD_LENGTH = 200;
const dummySalt = randomBytes(16);
const dummyDerived = scryptSync("workdesk-dummy-password", dummySalt, KEY_LENGTH);
export const DUMMY_PASSWORD_HASH = `scrypt:${dummySalt.toString("hex")}:${dummyDerived.toString("hex")}`;

/**
 * Hash a password with a random salt using scrypt (no external dependency).
 * Stored format: "scrypt:<salt hex>:<derived key hex>".
 */
export async function hashPassword(password) {
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    throw new Error("Password must be between 8 and 200 characters.");
  }
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

/**
 * Verify a password against a stored hash using a constant-time comparison.
 */
export async function verifyPassword(password, stored) {
  if (typeof password !== "string" || typeof stored !== "string") return false;

  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  let salt;
  let expected;
  try {
    salt = Buffer.from(parts[1], "hex");
    expected = Buffer.from(parts[2], "hex");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  try {
    const actual = await scrypt(password, salt, expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function validateCredentialsInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "Request body must be a JSON object." };
  }
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (
    typeof input.password !== "string" ||
    input.password.length < 8 ||
    input.password.length > MAX_PASSWORD_LENGTH
  ) {
    return { error: "Password must be between 8 and 200 characters." };
  }
  return { data: { email, password: input.password } };
}

export function validateRememberFlag(value) {
  if (value === undefined || value === null) return { data: false };
  if (typeof value === "boolean") return { data: value };
  return { error: "Remember me must be true or false." };
}

export function validateRegistrationInput(input) {
  const credentials = validateCredentialsInput(input);
  if (credentials.error) return credentials;

  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 2 || name.length > 80) {
    return { error: "Name must be between 2 and 80 characters." };
  }
  return { data: { ...credentials.data, name } };
}
