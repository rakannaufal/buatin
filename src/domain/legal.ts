export const SERVICE_UPDATED_AT = "2026-10-24";
export const SERVICE_UPDATED_LABEL = "24 Oktober 2026";

export const serviceLinks = [
  { href: "/terms", label: "Ketentuan layanan" },
  { href: "/privacy", label: "Kebijakan privasi" },
  { href: "/refund", label: "Pengembalian dana" },
  { href: "/disclaimer", label: "Batas penggunaan hasil" },
  { href: "/cookies", label: "Cookie" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Kontak" },
] as const;

export type ServicePath = (typeof serviceLinks)[number]["href"];

export function publicContact(
  site: {
    operatorName: string;
    operatorAddress: string;
    supportEmail: string;
  },
  fallbackEmail: string,
) {
  return {
    name: site.operatorName,
    address: site.operatorAddress,
    email: site.supportEmail || fallbackEmail,
  };
}
