import { randomBytes } from "node:crypto";

/**
 * Generate a cryptographically secure random token for invitations.
 * Returns a 64-character hex string (256 bits of entropy).
 */
export function generateInvitationToken() {
  return randomBytes(32).toString("hex");
}

/**
 * Check if an invitation has expired.
 */
export function isInvitationExpired(expiresAt) {
  if (!expiresAt) return true;
  return new Date() > new Date(expiresAt);
}

/**
 * Get default expiration time (7 days from now).
 */
export function getDefaultExpiryDate() {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  return expiry;
}