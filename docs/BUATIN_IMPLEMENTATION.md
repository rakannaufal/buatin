# Buatin SaaS implementation

## Accepted scope

Public verified accounts; Free once per account lifetime; Pro Starter 3/week,
Plus 10/week, Max 25/week. Calendar weeks start Monday 00:00 Asia/Jakarta.
QRIS through Duitku only, manual monthly renewal, no automatic debit.
Prices remain unset until the operator measures AI costs and configures them.
Native Node.js, PostgreSQL, systemd and Caddy; no Docker.

## Implementation slices

1. `prisma/`, `src/domain/billing.ts`, `src/server/entitlements.ts`: commercial
   plans, dated subscription periods, durable quota ledger, atomic reservations,
   refunds and captured result retention. Preserve all existing user projects.
2. `src/server/auth.ts`, auth UI and email/challenge adapters: public verified
   signup, recovery, profile, server ownership checks and operator access.
3. `src/server/duitku.ts`, `billing.ts`, billing API/UI: immutable order totals,
   QRIS rendering, signed durable callbacks, bounded reconciliation, renewal.
4. Project services and worker: revisions/comparison, personal presets, selected
   regeneration with dependency propagation, private templates, Max batch queue,
   bounded concurrency, fair priority scheduling and expiry cleanup.
5. Public/workspace/admin pages: Buatin branding, pricing, entitlement indicators,
   account/billing/library/admin workflows, responsive accessible states.
6. Unit, database, browser and recovery checks; native deployment/configuration
   documentation and production readiness checks.

## Decisions and risks

- `BillingPlan` is distinct from the existing document `Plan` model.
- Subscription rows are paid intervals. Early renewal appends an interval after
  paid-through expiry; a different plan starts there. No proration or reset on
  payment. Each purchase captures quota and retention so catalog edits cannot
  change already-paid benefits.
- Weekly usage is shared across paid intervals in the same calendar week. Free
  usage has a permanent separate period. Deletion never deletes that history.
- A permanently failed/refunded job is closed. Interrupted or partially complete
  jobs retain checkpoints and may resume within their captured retention.
- Payment credentials, verified mail sender, Turnstile, domain/HTTPS and actual
  prices require operator configuration. Production checks fail closed.
- Financial/event idempotency is retained separately from document cleanup.
- Upgrade/downgrade changes apply next paid period. This first release never
  charges a payment method automatically.
