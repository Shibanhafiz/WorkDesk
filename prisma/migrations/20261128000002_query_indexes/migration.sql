CREATE INDEX IF NOT EXISTS "Task_workspaceId_status_idx" ON "Task"("workspaceId", "status");
CREATE INDEX IF NOT EXISTS "Task_workspaceId_assigneeId_idx" ON "Task"("workspaceId", "assigneeId");
CREATE INDEX IF NOT EXISTS "Task_workspaceId_projectId_idx" ON "Task"("workspaceId", "projectId");
CREATE INDEX IF NOT EXISTS "Project_workspaceId_status_idx" ON "Project"("workspaceId", "status");
