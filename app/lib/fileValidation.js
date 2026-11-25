import { randomUUID } from "node:crypto";
import path from "node:path";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Allow-list of permitted MIME types. Anything else is rejected.
export const ALLOWED_MIME_TYPES = new Set([
  // Images / screenshots
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  // Documents
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const EXTENSION_BY_MIME = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

/**
 * Validate an uploaded file's declared type and size on the server.
 * Returns { error } or { data: { fileName, mimeType, size } }.
 */
export function validateUploadedFile(file) {
  if (!file || typeof file !== "object") {
    return { error: "No file was provided." };
  }
  if (typeof file.name !== "string" || file.name.trim().length === 0) {
    return { error: "The file must have a name." };
  }
  if (file.name.length > 255) {
    return { error: "File name is too long." };
  }
  if (typeof file.type !== "string" || !ALLOWED_MIME_TYPES.has(file.type)) {
    return { error: "This file type is not allowed." };
  }
  if (typeof file.size !== "number" || !Number.isFinite(file.size) || file.size <= 0) {
    return { error: "The file must not be empty." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: `Files must be ${MAX_FILE_SIZE} bytes or smaller.` };
  }

  return {
    data: {
      fileName: path.basename(file.name).slice(0, 255),
      mimeType: file.type,
      size: file.size,
    },
  };
}

/**
 * Build an opaque, non-guessable storage path. The original file name is
 * never used as a path, preventing path traversal. Files live outside the
 * public directory and are served only through an authorized API route.
 */
export function buildStoragePath(mimeType) {
  const extension = EXTENSION_BY_MIME[mimeType] || ".bin";
  return `${randomUUID()}${extension}`;
}

export function isAllowedMimeType(mimeType) {
  return ALLOWED_MIME_TYPES.has(mimeType);
}
