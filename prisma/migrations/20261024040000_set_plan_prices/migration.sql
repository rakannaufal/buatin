-- Version changes invalidate outstanding quotes and drafts, preserving invoices.
UPDATE "BillingPlan" AS plan
SET "monthlyPrice" = prices.amount,
    "version" = plan."version" + 1,
    "updatedAt" = now()
FROM (VALUES
    ('starter', 29000),
    ('plus', 49000),
    ('max', 99000)
) AS prices(id, amount)
WHERE plan."id" = prices.id
  AND plan."monthlyPrice" IS DISTINCT FROM prices.amount;
