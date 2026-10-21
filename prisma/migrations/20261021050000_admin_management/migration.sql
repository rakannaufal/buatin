BEGIN;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accessVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "suspendedUntil" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" TEXT;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "reauthUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "BillingPlan" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "features" JSONB,
ADD COLUMN     "plannerLimit" INTEGER,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "features" JSONB,
ADD COLUMN     "planName" TEXT,
ADD COLUMN     "planVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "plannerLimit" INTEGER,
ADD COLUMN     "revokedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "discount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "features" JSONB,
ADD COLUMN     "planVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "plannerLimit" INTEGER,
ADD COLUMN     "subtotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "voucherSnapshot" JSONB;

-- AlterTable
ALTER TABLE "AiUsage" ADD COLUMN     "inputRate" DOUBLE PRECISION,
ADD COLUMN     "outputRate" DOUBLE PRECISION,
ADD COLUMN     "pricingVersion" INTEGER;

-- AlterTable
ALTER TABLE "Setting" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "AuditEvent" ADD COLUMN     "after" JSONB,
ADD COLUMN     "before" JSONB,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "result" TEXT NOT NULL DEFAULT 'success',
ADD COLUMN     "targetType" TEXT;

-- AlterTable
ALTER TABLE "DataRequest" ADD COLUMN     "assignedTo" TEXT,
ADD COLUMN     "evidence" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "AdminMutation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminMutation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminInvitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invitedBy" TEXT NOT NULL,
    "acceptedBy" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingPlanVersion" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "value" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "publishedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "BillingPlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'paused',
    "kind" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "minimumAmount" INTEGER NOT NULL DEFAULT 0,
    "maximumDiscount" INTEGER,
    "maxUses" INTEGER NOT NULL,
    "perUserLimit" INTEGER NOT NULL DEFAULT 1,
    "newCustomersOnly" BOOLEAN NOT NULL DEFAULT false,
    "planIds" JSONB NOT NULL,
    "userIds" JSONB NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherRedemption" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoucherRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherVersion" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "value" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoucherVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettingRevision" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "value" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SettingRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntitlementGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "planVersion" INTEGER NOT NULL,
    "features" JSONB NOT NULL,
    "plannerLimit" INTEGER NOT NULL,
    "weeklyQuota" INTEGER NOT NULL,
    "retentionDays" INTEGER NOT NULL,
    "priority" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntitlementGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditAllocation" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "returnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundRequest" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "reason" TEXT NOT NULL,
    "evidence" TEXT,
    "providerReference" TEXT,
    "createdBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentVersion" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "ContentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "assignedTo" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "internal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminMutation_userId_operation_keyHash_key" ON "AdminMutation"("userId", "operation", "keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "AdminInvitation_tokenHash_key" ON "AdminInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "AdminInvitation_email_status_idx" ON "AdminInvitation"("email", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BillingPlanVersion_planId_version_key" ON "BillingPlanVersion"("planId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_code_key" ON "Voucher"("code");

-- CreateIndex
CREATE INDEX "Voucher_status_endsAt_idx" ON "Voucher"("status", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "VoucherRedemption_paymentId_key" ON "VoucherRedemption"("paymentId");

-- CreateIndex
CREATE INDEX "VoucherRedemption_voucherId_status_idx" ON "VoucherRedemption"("voucherId", "status");

-- CreateIndex
CREATE INDEX "VoucherRedemption_voucherId_userId_status_idx" ON "VoucherRedemption"("voucherId", "userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VoucherVersion_voucherId_version_key" ON "VoucherVersion"("voucherId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "SettingRevision_key_version_key" ON "SettingRevision"("key", "version");

-- CreateIndex
CREATE INDEX "EntitlementGrant_userId_startsAt_endsAt_idx" ON "EntitlementGrant"("userId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "CreditGrant_userId_expiresAt_idx" ON "CreditGrant"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CreditAllocation_jobId_key" ON "CreditAllocation"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "RefundRequest_providerReference_key" ON "RefundRequest"("providerReference");

-- CreateIndex
CREATE INDEX "RefundRequest_status_createdAt_idx" ON "RefundRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ContentVersion_kind_key_status_idx" ON "ContentVersion"("kind", "key", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ContentVersion_kind_key_version_key" ON "ContentVersion"("kind", "key", "version");

-- CreateIndex
CREATE INDEX "SupportTicket_status_updatedAt_idx" ON "SupportTicket"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "SupportTicket_userId_createdAt_idx" ON "SupportTicket"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_userId_createdAt_idx" ON "AuditEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_resourceId_createdAt_idx" ON "AuditEvent"("resourceId", "createdAt");

-- AddForeignKey
ALTER TABLE "AdminMutation" ADD CONSTRAINT "AdminMutation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherRedemption" ADD CONSTRAINT "VoucherRedemption_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherRedemption" ADD CONSTRAINT "VoucherRedemption_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntitlementGrant" ADD CONSTRAINT "EntitlementGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditGrant" ADD CONSTRAINT "CreditGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditAllocation" ADD CONSTRAINT "CreditAllocation_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "CreditGrant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "Payment" SET "subtotal" = "amount";
ALTER TABLE "Payment" ALTER COLUMN "subtotal" DROP DEFAULT;
UPDATE "BillingPlan" SET "features" = jsonb_build_object(
  'revisions', "id" IN ('plus','max'), 'regeneration', "id" IN ('plus','max'),
  'presets', "id" IN ('plus','max'), 'templates', "id" = 'max', 'batch', "id" = 'max'
), "plannerLimit" = CASE WHEN "id" = 'free' THEN 5 ELSE LEAST(120, "weeklyQuota" * 4) END;
UPDATE "Payment" SET "features" = jsonb_build_object(
  'revisions', "planId" IN ('plus','max'), 'regeneration', "planId" IN ('plus','max'),
  'presets', "planId" IN ('plus','max'), 'templates', "planId" = 'max', 'batch', "planId" = 'max'
), "plannerLimit" = LEAST(120, "weeklyQuota" * 4);
UPDATE "Subscription" s SET "features" = p."features", "plannerLimit" = LEAST(120, s."weeklyQuota" * 4), "planName" = p."planName"
FROM "Payment" p WHERE s."paymentId" = p."id";
ALTER TABLE "User" ADD CONSTRAINT "User_role_check" CHECK ("role" IN ('user','admin','owner')),
  ADD CONSTRAINT "User_status_check" CHECK ("status" IN ('active','suspended'));
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_total_check" CHECK ("amount" > 0 AND "discount" >= 0 AND "subtotal" - "discount" = "amount");
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_policy_check" CHECK (
  "endsAt" > "startsAt" AND "maxUses" > 0 AND "perUserLimit" > 0 AND "perUserLimit" <= "maxUses"
  AND "minimumAmount" >= 0 AND ("maximumDiscount" IS NULL OR "maximumDiscount" > 0)
  AND "status" IN ('active','paused','archived') AND "kind" IN ('percent','fixed')
  AND "value" > 0 AND ("kind" <> 'percent' OR "value" <= 99));
ALTER TABLE "VoucherRedemption" ADD CONSTRAINT "VoucherRedemption_status_check" CHECK ("status" IN ('reserved','consumed','released','review'));
ALTER TABLE "EntitlementGrant" ADD CONSTRAINT "EntitlementGrant_period_check" CHECK ("endsAt" > "startsAt" AND "weeklyQuota" > 0);
ALTER TABLE "CreditGrant" ADD CONSTRAINT "CreditGrant_balance_check" CHECK ("amount" > 0 AND "used" >= 0 AND "used" <= "amount");
ALTER TABLE "CreditAllocation" ADD CONSTRAINT "CreditAllocation_status_check" CHECK ("status" IN ('reserved','returned'));
ALTER TABLE "RefundRequest" ADD CONSTRAINT "RefundRequest_state_check" CHECK ("amount" > 0 AND "status" IN ('requested','approved','processing','completed','rejected','failed'));

ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_status_check" CHECK ("status" IN ('open','waiting','resolved','closed') AND "priority" IN ('low','normal','high'));
ALTER TABLE "AdminInvitation" ADD CONSTRAINT "AdminInvitation_state_check" CHECK ("role" = 'admin' AND "status" IN ('pending','accepted','revoked'));
CREATE UNIQUE INDEX "RefundRequest_active_payment" ON "RefundRequest" ("paymentId") WHERE "status" IN ('requested','approved','processing','completed');
CREATE INDEX "CreditGrant_actor_created" ON "CreditGrant" ("createdBy", "createdAt");
CREATE INDEX "EntitlementGrant_actor_created" ON "EntitlementGrant" ("createdBy", "createdAt");
CREATE INDEX "User_status_created" ON "User" ("status", "createdAt");
COMMIT;
