-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "workspaces_lastUsedAt_idx" ON "workspaces"("lastUsedAt");

