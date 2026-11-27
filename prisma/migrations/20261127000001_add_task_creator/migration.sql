-- Track which workspace member created a task.
-- SQLite cannot add a foreign key with ALTER TABLE, so the Task table is
-- rebuilt using the same procedure Prisma uses. All rows are copied over.

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "dueDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "projectId" TEXT,
    "assigneeId" TEXT,
    "createdById" TEXT,
    "workspaceId" TEXT,
    "reopenCount" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Task_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Task" ("assigneeId", "createdAt", "description", "dueDate", "id", "priority", "projectId", "reopenCount", "status", "title", "updatedAt", "workspaceId")
SELECT "assigneeId", "createdAt", "description", "dueDate", "id", "priority", "projectId", "reopenCount", "status", "title", "updatedAt", "workspaceId" FROM "Task";

DROP TABLE "Task";

ALTER TABLE "new_Task" RENAME TO "Task";

-- Backfill the creator of existing tasks from the recorded creation activity.
UPDATE "Task"
SET "createdById" = (
    SELECT "actorId"
    FROM "Activity"
    WHERE "Activity"."type" = 'TASK_CREATED'
      AND "Activity"."targetId" = "Task"."id"
    ORDER BY "Activity"."createdAt" ASC
    LIMIT 1
)
WHERE "createdById" IS NULL;

PRAGMA foreign_keys=ON;
