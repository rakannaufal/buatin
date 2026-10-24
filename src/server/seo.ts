import type { Metadata } from "next";

export function publicMetadata(
  title: string,
  path: string,
  description = "Ubah brief website menjadi paket spesifikasi yang relevan dan siap ditinjau.",
): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | Buatin`,
      description,
      url: path,
      siteName: "Buatin",
      locale: "id_ID",
      type: "website",
    },
    twitter: { card: "summary", title: `${title} | Buatin`, description },
  };
}
