-- Application access uses the server database role. Supabase browser roles get no table access.
-- No policies are added: RLS denies rows to non-owner roles unless explicitly reviewed later.
DO $$
DECLARE
  table_name text;
  api_role text;
  target_schema text := current_schema();
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'User',
    'Session',
    'TwoFactor',
    'Account',
    'Verification',
    'Project',
    'PlanningTask',
    'Plan',
    'Job',
    'BillingPlan',
    'Subscription',
    'Payment',
    'WebhookEvent',
    'UsagePeriod',
    'QuotaLedger',
    'ProjectRevision',
    'BriefPreset',
    'ProjectAttachment',
    'DocumentTemplate',
    'EmailMessage',
    'AiUsage',
    'AiBudgetPeriod',
    'JobFile',
    'UsageDaily',
    'IdempotencyKey',
    'OutboxEvent',
    'Setting',
    'RateLimit',
    'RequestLimit',
    'AuditEvent',
    'DataRequest',
    'AdminMutation',
    'AdminInvitation',
    'BillingPlanVersion',
    'Voucher',
    'VoucherRedemption',
    'VoucherVersion',
    'SettingRevision',
    'EntitlementGrant',
    'CreditGrant',
    'CreditAllocation',
    'RefundRequest',
    'ContentVersion',
    'SupportTicket',
    'SupportMessage',
    '_prisma_migrations'
  ] LOOP
    IF to_regclass(format('%I.%I', target_schema, table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', target_schema, table_name);
      EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM PUBLIC', target_schema, table_name);
      FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
          EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM %I', target_schema, table_name, api_role);
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END $$;
