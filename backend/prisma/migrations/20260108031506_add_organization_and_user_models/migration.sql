/*
  Warnings:

  - Added the required column `organizationId` to the `problems` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `views` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `workspaces` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "authId" TEXT,
    "authProvider" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_problems" (
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
    "organizationId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "problems_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "problems" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "problems_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "problems_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_problems" ("actions", "blockers", "createdAt", "deletedAt", "id", "idPath", "keyResults", "labels", "objective", "parentId", "priority", "problem", "status", "updatedAt", "votes", "workspaceId") SELECT "actions", "blockers", "createdAt", "deletedAt", "id", "idPath", "keyResults", "labels", "objective", "parentId", "priority", "problem", "status", "updatedAt", "votes", "workspaceId" FROM "problems";
DROP TABLE "problems";
ALTER TABLE "new_problems" RENAME TO "problems";
CREATE INDEX "problems_workspaceId_idx" ON "problems"("workspaceId");
CREATE INDEX "problems_organizationId_idx" ON "problems"("organizationId");
CREATE INDEX "problems_parentId_idx" ON "problems"("parentId");
CREATE INDEX "problems_deletedAt_idx" ON "problems"("deletedAt");
CREATE INDEX "problems_workspaceId_deletedAt_idx" ON "problems"("workspaceId", "deletedAt");
CREATE INDEX "problems_organizationId_deletedAt_idx" ON "problems"("organizationId", "deletedAt");
CREATE INDEX "problems_status_idx" ON "problems"("status");
CREATE INDEX "problems_priority_idx" ON "problems"("priority");
CREATE INDEX "problems_votes_idx" ON "problems"("votes");
CREATE TABLE "new_views" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" TEXT NOT NULL DEFAULT '{}',
    "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "views_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "views_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_views" ("createdAt", "deletedAt", "filters", "id", "isDefault", "lastUsedAt", "name", "updatedAt", "workspaceId") SELECT "createdAt", "deletedAt", "filters", "id", "isDefault", "lastUsedAt", "name", "updatedAt", "workspaceId" FROM "views";
DROP TABLE "views";
ALTER TABLE "new_views" RENAME TO "views";
CREATE INDEX "views_workspaceId_idx" ON "views"("workspaceId");
CREATE INDEX "views_organizationId_idx" ON "views"("organizationId");
CREATE INDEX "views_deletedAt_idx" ON "views"("deletedAt");
CREATE INDEX "views_workspaceId_deletedAt_idx" ON "views"("workspaceId", "deletedAt");
CREATE INDEX "views_organizationId_deletedAt_idx" ON "views"("organizationId", "deletedAt");
CREATE INDEX "views_workspaceId_lastUsedAt_idx" ON "views"("workspaceId", "lastUsedAt");
CREATE TABLE "new_workspaces" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "workspaces_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_workspaces" ("createdAt", "deletedAt", "id", "lastUsedAt", "name") SELECT "createdAt", "deletedAt", "id", "lastUsedAt", "name" FROM "workspaces";
DROP TABLE "workspaces";
ALTER TABLE "new_workspaces" RENAME TO "workspaces";
CREATE INDEX "workspaces_organizationId_idx" ON "workspaces"("organizationId");
CREATE INDEX "workspaces_deletedAt_idx" ON "workspaces"("deletedAt");
CREATE INDEX "workspaces_lastUsedAt_idx" ON "workspaces"("lastUsedAt");
CREATE INDEX "workspaces_organizationId_deletedAt_idx" ON "workspaces"("organizationId", "deletedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- CreateIndex
CREATE INDEX "users_authId_authProvider_idx" ON "users"("authId", "authProvider");

-- CreateIndex
CREATE UNIQUE INDEX "users_authId_authProvider_key" ON "users"("authId", "authProvider");
