-- CreateTable
CREATE TABLE "views" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" TEXT NOT NULL DEFAULT '{}',
    "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "views_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "views_workspaceId_idx" ON "views"("workspaceId");

-- CreateIndex
CREATE INDEX "views_deletedAt_idx" ON "views"("deletedAt");

-- CreateIndex
CREATE INDEX "views_workspaceId_deletedAt_idx" ON "views"("workspaceId", "deletedAt");

-- CreateIndex
CREATE INDEX "views_workspaceId_lastUsedAt_idx" ON "views"("workspaceId", "lastUsedAt");
