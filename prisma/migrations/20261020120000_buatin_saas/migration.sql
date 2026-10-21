-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "billingPlanId" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT (now() + interval '14 days'),
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quotaRefundedAt" TIMESTAMP(3),
ADD COLUMN     "retentionDays" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "sourceJobId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "renewalReminders" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "BillingPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weeklyQuota" INTEGER NOT NULL,
    "retentionDays" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "monthlyPrice" INTEGER,
    "available" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "weeklyQuota" INTEGER NOT NULL,
    "retentionDays" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL,
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "weeklyQuota" INTEGER NOT NULL,
    "retentionDays" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'creating',
    "reference" TEXT,
    "qrString" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "checks" INTEGER NOT NULL DEFAULT 0,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsagePeriod" (
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "jobsCount" INTEGER NOT NULL DEFAULT 0,
    "plansCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UsagePeriod_pkey" PRIMARY KEY ("userId","key")
);

-- CreateTable
CREATE TABLE "QuotaLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotaLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectRevision" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "webType" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BriefPreset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "webType" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BriefPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "deduplicationKey" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_paymentId_key" ON "Subscription"("paymentId");

-- CreateIndex
CREATE INDEX "Subscription_userId_startsAt_endsAt_idx" ON "Subscription"("userId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "Subscription_endsAt_reminderSentAt_idx" ON "Subscription"("endsAt", "reminderSentAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_status_lastCheckedAt_idx" ON "Payment"("status", "lastCheckedAt");

-- CreateIndex
CREATE INDEX "QuotaLedger_userId_periodKey_idx" ON "QuotaLedger"("userId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "QuotaLedger_jobId_action_key" ON "QuotaLedger"("jobId", "action");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectRevision_projectId_version_key" ON "ProjectRevision"("projectId", "version");

-- CreateIndex
CREATE INDEX "BriefPreset_userId_updatedAt_idx" ON "BriefPreset"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentTemplate_userId_fileId_key" ON "DocumentTemplate"("userId", "fileId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_deduplicationKey_key" ON "EmailMessage"("deduplicationKey");

-- CreateIndex
CREATE INDEX "EmailMessage_sentAt_nextAttemptAt_idx" ON "EmailMessage"("sentAt", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "Job_expiresAt_idx" ON "Job"("expiresAt");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BillingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BillingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsagePeriod" ADD CONSTRAINT "UsagePeriod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotaLedger" ADD CONSTRAINT "QuotaLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRevision" ADD CONSTRAINT "ProjectRevision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BriefPreset" ADD CONSTRAINT "BriefPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Commercial defaults do not enable checkout or invent chargeable prices.
INSERT INTO "BillingPlan" ("id", "name", "weeklyQuota", "retentionDays", "priority", "available", "updatedAt") VALUES
('free','Free',1,14,0,false,now()),
('starter','Pro Starter',3,30,0,false,now()),
('plus','Pro Plus',10,90,10,false,now()),
('max','Pro Max',25,180,20,false,now());

-- Preserve consumed legacy grants even when projects have been deleted.
INSERT INTO "UsagePeriod" ("userId","key","startsAt","jobsCount")
SELECT u."id",'lifetime',TIMESTAMP '1970-01-01',
  CASE WHEN COALESCE(SUM(d."jobsCount"),0)>0 OR EXISTS
    (SELECT 1 FROM "Job" j WHERE j."userId"=u."id" AND j."status" <> 'cancelled')
  THEN 1 ELSE 0 END
FROM "User" u LEFT JOIN "UsageDaily" d ON d."userId"=u."id" GROUP BY u."id";

UPDATE "Job" SET "expiresAt"=COALESCE("finishedAt", "createdAt") + interval '14 days';

DROP INDEX "Job_one_active_per_user";
CREATE UNIQUE INDEX "Job_one_executing_per_user" ON "Job" ("userId")
  WHERE "status" IN ('running','validating','cancel_requested');
CREATE UNIQUE INDEX "Job_one_active_per_project" ON "Job" ("projectId")
  WHERE "status" IN ('queued','running','validating','cancel_requested');
CREATE UNIQUE INDEX "PlanningTask_one_active_per_user_project" ON "PlanningTask" ("projectId")
  WHERE "status" IN ('queued','running');

ALTER TABLE "UsagePeriod" ADD CONSTRAINT "UsagePeriod_nonnegative" CHECK ("jobsCount">=0 AND "plansCount">=0);
ALTER TABLE "BillingPlan" ADD CONSTRAINT "BillingPlan_valid" CHECK ("weeklyQuota">0 AND "retentionDays">0 AND ("monthlyPrice" IS NULL OR "monthlyPrice">0));
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_valid" CHECK ("amount">0 AND "method" IN ('NQ','SQ'));
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_valid" CHECK ("endsAt">"startsAt" AND "weeklyQuota">0 AND "retentionDays">0);
ALTER TABLE "QuotaLedger" ADD CONSTRAINT "QuotaLedger_valid" CHECK (("action"='reserve' AND "delta"=1) OR ("action"='refund' AND "delta"=-1));
