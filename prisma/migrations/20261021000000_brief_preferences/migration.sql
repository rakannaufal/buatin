ALTER TABLE "Project" ADD COLUMN "preferences" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "ProjectRevision" ADD COLUMN "preferences" JSONB NOT NULL DEFAULT '{}', ADD COLUMN "attachmentIds" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "BriefPreset" ADD COLUMN "preferences" JSONB NOT NULL DEFAULT '{}';
CREATE TABLE "ProjectAttachment" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL CHECK ("bytes" >= 0),
  "checksum" TEXT NOT NULL DEFAULT '',
  "storageKey" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'visual',
  "note" TEXT NOT NULL DEFAULT '',
  "sourceUrl" TEXT NOT NULL DEFAULT '',
  "rights" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'queued',
  "text" TEXT NOT NULL DEFAULT '',
  "errorCode" TEXT,
  "processingVersion" INTEGER NOT NULL DEFAULT 1,
  "included" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectAttachment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectAttachment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ProjectAttachment_projectId_included_createdAt_idx" ON "ProjectAttachment"("projectId", "included", "createdAt");
CREATE INDEX "ProjectAttachment_status_updatedAt_idx" ON "ProjectAttachment"("status", "updatedAt");
