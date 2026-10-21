ALTER TABLE "AiUsage" ADD COLUMN "reservedTokens" INTEGER;
ALTER TABLE "AiUsage" ADD COLUMN "estimatedCostMicros" BIGINT;
CREATE TABLE "AiBudgetPeriod" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "requests" INTEGER NOT NULL DEFAULT 0,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "costMicros" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiBudgetPeriod_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiBudgetPeriod_day_idx" ON "AiBudgetPeriod"("day");
