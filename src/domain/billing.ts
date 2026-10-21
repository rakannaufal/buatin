export const PLAN_IDS = ["free", "starter", "plus", "max"] as const;
export type PlanId = (typeof PLAN_IDS)[number];
export type ProFeature =
  "revisions" | "regeneration" | "presets" | "templates" | "batch";
export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    weeklyQuota: 1,
    retentionDays: 14,
    priority: 0,
  },
  starter: {
    id: "starter",
    name: "Pro Starter",
    weeklyQuota: 3,
    retentionDays: 30,
    priority: 0,
  },
  plus: {
    id: "plus",
    name: "Pro Plus",
    weeklyQuota: 10,
    retentionDays: 90,
    priority: 10,
  },
  max: {
    id: "max",
    name: "Pro Max",
    weeklyQuota: 25,
    retentionDays: 180,
    priority: 20,
  },
} satisfies Record<
  PlanId,
  {
    id: PlanId;
    name: string;
    weeklyQuota: number;
    retentionDays: number;
    priority: number;
  }
>;
export function hasFeature(plan: string, feature: ProFeature) {
  return feature === "templates" || feature === "batch"
    ? plan === "max"
    : plan === "plus" || plan === "max";
}
const WIB = 7 * 3600000;
export function weekPeriod(at = new Date()) {
  const local = new Date(at.getTime() + WIB);
  local.setUTCHours(0, 0, 0, 0);
  local.setUTCDate(local.getUTCDate() - ((local.getUTCDay() + 6) % 7));
  const startsAt = new Date(local.getTime() - WIB);
  return {
    key: `week:${local.toISOString().slice(0, 10)}`,
    startsAt,
    endsAt: new Date(startsAt.getTime() + 7 * 86400000),
  };
}
// Clamp month-end in WIB: January 31 renews through February's last day.
export function addBillingMonth(at: Date) {
  const local = new Date(at.getTime() + WIB);
  const day = local.getUTCDate();
  local.setUTCDate(1);
  local.setUTCMonth(local.getUTCMonth() + 1);
  const last = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0),
  ).getUTCDate();
  local.setUTCDate(Math.min(day, last));
  return new Date(local.getTime() - WIB);
}
export function regenerationClosure(
  requested: string[],
  selected: string[],
  entries: { id: string; requires: string[]; context_from: string[] }[],
) {
  if (!requested.length || requested.some((id) => !selected.includes(id)))
    throw new Error("INVALID_SELECTION");
  const impacted = new Set(requested);
  let changed = true;
  while (changed) {
    changed = false;
    for (const entry of entries) {
      if (
        selected.includes(entry.id) &&
        !impacted.has(entry.id) &&
        [...entry.requires, ...entry.context_from].some((id) =>
          impacted.has(id),
        )
      ) {
        impacted.add(entry.id);
        changed = true;
      }
    }
  }
  return selected.filter((id) => impacted.has(id));
}
export function queueScore(
  priority: number,
  createdAt: Date,
  now = new Date(),
) {
  return priority + Math.floor((now.getTime() - createdAt.getTime()) / 60000);
}
export function formatDate(value: string | Date) {
  return (
    new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(new Date(value)) + " WIB"
  );
}
export function rupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}
