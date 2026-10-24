import { z } from "zod";
import { hasFeature, PLAN_IDS, type PlanId } from "./billing";

export const roles = ["user", "admin", "owner"] as const;
export type Role = (typeof roles)[number];
export const ownerPermissions = [
  "staff",
  "refund.approve",
  "controls",
] as const;
export type Permission =
  | "read"
  | "users"
  | "plans"
  | "vouchers"
  | "finance"
  | "jobs"
  | "content"
  | "privacy"
  | "support"
  | (typeof ownerPermissions)[number];
export function permitted(role: string, permission: Permission) {
  return (
    role === "owner" ||
    (role === "admin" &&
      !(ownerPermissions as readonly string[]).includes(permission))
  );
}
export function suspended(
  user: { status: string; suspendedUntil: Date | null },
  now = new Date(),
) {
  return (
    user.status === "suspended" &&
    (!user.suspendedUntil || user.suspendedUntil > now)
  );
}
export const reasonSchema = z.string().trim().min(8).max(500);
export const versionSchema = z.number().int().positive();
export const featuresSchema = z
  .object({
    revisions: z.boolean(),
    regeneration: z.boolean(),
    presets: z.boolean(),
    templates: z.boolean(),
    batch: z.boolean(),
  })
  .strict();
export function planFeatures(id: PlanId, input?: unknown) {
  const parsed = featuresSchema.safeParse(input);
  return parsed.success
    ? parsed.data
    : featuresSchema.parse(
        Object.fromEntries(
          ["revisions", "regeneration", "presets", "templates", "batch"].map(
            (key) => [
              key,
              hasFeature(id, key as keyof z.infer<typeof featuresSchema>),
            ],
          ),
        ),
      );
}
export const planEditSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(500),
    monthlyPrice: z.number().int().min(1000).max(100000000).nullable(),
    available: z.boolean(),
    weeklyQuota: z.number().int().min(1).max(100),
    retentionDays: z.number().int().min(1).max(365),
    priority: z.number().int().min(0).max(100),
    plannerLimit: z.number().int().min(1).max(500),
    features: featuresSchema,
  })
  .strict()
  .refine((v) => !v.available || v.monthlyPrice !== null, {
    message: "Isi harga sebelum mengaktifkan penjualan.",
    path: ["monthlyPrice"],
  });
export const voucherCode = (value: string) => value.trim().toUpperCase();
export const voucherSchema = z
  .object({
    code: z
      .string()
      .transform(voucherCode)
      .pipe(z.string().regex(/^[A-Z0-9][A-Z0-9_-]{2,31}$/)),
    title: z.string().trim().min(3).max(100),
    status: z.enum(["active", "paused", "archived"]),
    kind: z.enum(["percent", "fixed"]),
    value: z.number().int().positive().max(100000000),
    minimumAmount: z.number().int().min(0).max(100000000),
    maximumDiscount: z.number().int().positive().max(100000000).nullable(),
    maxUses: z.number().int().min(1).max(1000000),
    perUserLimit: z.number().int().min(1).max(1000),
    newCustomersOnly: z.boolean(),
    planIds: z
      .array(z.enum(["starter", "plus", "max"]))
      .min(1)
      .max(3),
    userIds: z.array(z.string().min(1).max(100)).max(200),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.kind === "percent" && v.value > 99)
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "Diskon QRIS maksimal 99%. Akses gratis memakai grant.",
      });
    if (new Date(v.endsAt) <= new Date(v.startsAt))
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Akhir harus setelah awal.",
      });
    if (v.perUserLimit > v.maxUses)
      ctx.addIssue({
        code: "custom",
        path: ["perUserLimit"],
        message: "Batas akun melebihi total.",
      });
  });
export function discountFor(
  subtotal: number,
  v: { kind: string; value: number; maximumDiscount: number | null },
) {
  const discount =
    v.kind === "percent" ? Math.floor((subtotal * v.value) / 100) : v.value;
  return Math.min(subtotal, discount, v.maximumDiscount ?? subtotal);
}
export const siteSchema = z
  .object({
    announcement: z.string().trim().max(500),
    operatorName: z.string().trim().max(160).default(""),
    operatorAddress: z.string().trim().max(1000).default(""),
    supportEmail: z.union([z.email(), z.literal("")]),
    faq: z.string().trim().max(12000),
    privacyNotice: z.string().trim().max(12000),
    termsNotice: z.string().trim().max(12000),
  })
  .strict();
export const defaultSite = siteSchema.parse({
  announcement: "",
  supportEmail: "",
  faq: "",
  privacyNotice: "",
  termsNotice: "",
});
export const controlsSchema = z
  .object({
    pauseSignup: z.boolean(),
    pauseCheckout: z.boolean(),
    pauseGeneration: z.boolean(),
    maintenanceMessage: z.string().trim().max(300),
    dailyRequests: z.number().int().min(1),
    userDailyRequests: z.number().int().min(1),
    dailyTokens: z.number().int().min(1),
    userDailyTokens: z.number().int().min(1),
    dailyBudgetUsd: z.number().min(0).max(100000),
    inputRate: z.number().min(0).max(10000),
    outputRate: z.number().min(0).max(10000),
    adminCreditLimit: z.number().int().min(0).max(100),
    adminGrantDays: z.number().int().min(0).max(90),
  })
  .strict();
export const adminSections = [
  "users",
  "plans",
  "vouchers",
  "payments",
  "refunds",
  "jobs",
  "ai",
  "operations",
  "content",
  "settings",
  "audit",
  "privacy",
  "staff",
  "support",
  "reports",
] as const;
export type AdminSection = (typeof adminSections)[number];
export const adminLabels: Record<AdminSection, string> = {
  users: "Pengguna",
  plans: "Paket & harga",
  vouchers: "Voucher",
  payments: "Pembayaran",
  refunds: "Refund uang",
  jobs: "Generasi",
  ai: "Pemakaian AI",
  operations: "Operasi",
  content: "Template & skill",
  settings: "Pengaturan situs",
  audit: "Audit",
  privacy: "Privasi",
  staff: "Staf",
  support: "Bantuan",
  reports: "Laporan",
};
export const planIdSchema = z.enum(PLAN_IDS);
