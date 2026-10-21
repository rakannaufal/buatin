CREATE TABLE "AiUsage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT,
  "resourceId" TEXT NOT NULL,
  "task" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "modelUsed" TEXT,
  "mock" BOOLEAN NOT NULL,
  "tokensIn" INTEGER,
  "tokensOut" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'started',
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "AiUsage_userId_createdAt_idx" ON "AiUsage" ("userId","createdAt");
CREATE INDEX "AiUsage_mock_createdAt_idx" ON "AiUsage" ("mock","createdAt");
