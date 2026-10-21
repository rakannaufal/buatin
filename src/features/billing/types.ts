export interface AccountEntitlement {
  planId: "free" | "starter" | "plus" | "max";
  name: string;
  limit: number;
  used: number;
  remaining: number;
  baseRemaining?: number;
  creditRemaining?: number;
  plannerLimit: number;
  plannerUsed: number;
  retentionDays: number;
  resetsAt: string | null;
  activeUntil: string | null;
  features: {
    revisions: boolean;
    regeneration: boolean;
    presets: boolean;
    templates: boolean;
    batch: boolean;
  };
}
export interface CommercialPlan {
  id: "free" | "starter" | "plus" | "max";
  name: string;
  weeklyQuota: number;
  retentionDays: number;
  monthlyPrice: number | null;
  available: boolean;
  features?: AccountEntitlement["features"];
  priority?: number;
}
export interface PaymentSummary {
  id: string;
  planName: string;
  amount: number;
  subtotal?: number;
  discount?: number;
  voucherCode?: string | null;
  status: string;
  createdAt: string;
  paidAt: string | null;
  expiresAt: string;
}
export const paymentLabels: Record<string, string> = {
  creating: "Menyiapkan QRIS",
  pending: "Menunggu pembayaran",
  paid: "Lunas",
  failed: "Gagal",
  expired: "Kedaluwarsa",
  review: "Dalam pemeriksaan",
};
