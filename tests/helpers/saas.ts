import { db } from "../../src/server/db";
import { PLANS, type PlanId } from "../../src/domain/billing";
export async function grantTestPlan(
  userId: string,
  planId: Exclude<PlanId, "free"> = "max",
) {
  const plan = PLANS[planId];
  const payment = await db.payment.create({
    data: {
      id: `fixture-${crypto.randomUUID()}`,
      userId,
      planId,
      planName: plan.name,
      amount: 10000,
      weeklyQuota: plan.weeklyQuota,
      retentionDays: plan.retentionDays,
      priority: plan.priority,
      method: "NQ",
      status: "paid",
      expiresAt: new Date(),
      paidAt: new Date(),
    },
  });
  return db.subscription.create({
    data: {
      userId,
      paymentId: payment.id,
      planId,
      weeklyQuota: plan.weeklyQuota,
      retentionDays: plan.retentionDays,
      priority: plan.priority,
      startsAt: new Date(Date.now() - 60000),
      endsAt: new Date(Date.now() + 86400000 * 28),
    },
  });
}
export async function clearTestBilling(userId: string) {
  await db.aiUsage.deleteMany({ where: { userId } });
  await db.webhookEvent.deleteMany({ where: { payment: { userId } } });
  await db.subscription.deleteMany({ where: { userId } });
  await db.payment.deleteMany({ where: { userId } });
}
