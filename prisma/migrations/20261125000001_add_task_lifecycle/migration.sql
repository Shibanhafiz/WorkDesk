-- Task lifecycle: reopen counter on Task
ALTER TABLE "Task" ADD COLUMN "reopenCount" INTEGER NOT NULL DEFAULT 0;

-- Task lifecycle: transition history
CREATE TABLE IF NOT EXISTS "TaskHistory" (
  "id" TEXT PRIMARY KEY,
  "taskId" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "reason" TEXT,
  "reviewComment" TEXT,
  "createdAt" DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS "TaskHistory_taskId_createdAt_idx" ON "TaskHistory"("taskId", "createdAt");
