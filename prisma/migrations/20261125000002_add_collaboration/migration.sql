-- Collaboration and QA support: issues, attachments, notification dedupe key

CREATE TABLE IF NOT EXISTS "Issue" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
  "resolution" TEXT NOT NULL DEFAULT 'OPEN',
  "createdById" TEXT NOT NULL,
  "resolvedById" TEXT,
  "createdAt" DATETIME NOT NULL,
  "updatedAt" DATETIME NOT NULL,
  "resolvedAt" DATETIME
);
CREATE INDEX IF NOT EXISTS "Issue_taskId_createdAt_idx" ON "Issue"("taskId", "createdAt");

CREATE TABLE IF NOT EXISTS "Attachment" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL,
  "uploaderId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "storagePath" TEXT NOT NULL UNIQUE,
  "createdAt" DATETIME NOT NULL
);
CREATE INDEX IF NOT EXISTS "Attachment_taskId_createdAt_idx" ON "Attachment"("taskId", "createdAt");

ALTER TABLE "Notification" ADD COLUMN "dedupeKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
