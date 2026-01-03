-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "problems" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "idPath" TEXT NOT NULL,
    "problem" TEXT NOT NULL DEFAULT '{"summary": "", "detail": ""}',
    "objective" TEXT NOT NULL DEFAULT '{"summary": "", "detail": ""}',
    "keyResults" TEXT NOT NULL DEFAULT '[]',
    "actions" TEXT NOT NULL DEFAULT '[]',
    "blockers" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'Actionable',
    "votes" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "labels" TEXT NOT NULL DEFAULT '[]',
    "parentId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "problems_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "problems" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "problems_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "id_counter" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "counter" INTEGER NOT NULL DEFAULT 0,
    "length" INTEGER NOT NULL DEFAULT 2
);

-- CreateIndex
CREATE INDEX "workspaces_deletedAt_idx" ON "workspaces"("deletedAt");

-- CreateIndex
CREATE INDEX "problems_workspaceId_idx" ON "problems"("workspaceId");

-- CreateIndex
CREATE INDEX "problems_parentId_idx" ON "problems"("parentId");

-- CreateIndex
CREATE INDEX "problems_deletedAt_idx" ON "problems"("deletedAt");

-- CreateIndex
CREATE INDEX "problems_workspaceId_deletedAt_idx" ON "problems"("workspaceId", "deletedAt");

-- CreateIndex
CREATE INDEX "problems_status_idx" ON "problems"("status");

-- CreateIndex
CREATE INDEX "problems_priority_idx" ON "problems"("priority");

-- CreateIndex
CREATE INDEX "problems_votes_idx" ON "problems"("votes");
