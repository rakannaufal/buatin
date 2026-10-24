import type { Metadata } from "next";

export function publicMetadata(
  title: string,
  path: string,
  description = "Ubah brief website menjadi paket spesifikasi yang relevan dan siap ditinjau.",
): Metadata {
  const page = path === "/" ? "landing" : path.slice(1);
  const socialPage = [
    "landing",
    "pricing",
    "terms",
    "privacy",
    "faq",
    "refund",
    "disclaimer",
    "cookies",
    "contact",
  ].includes(page)
    ? page
    : "landing";
  const image = `/assets/social/og-${socialPage}.png`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | Bantuin`,
      description,
      url: path,
      siteName: "Bantuin",
      locale: "id_ID",
      type: "website",
      images: [
        { url: image, width: 1200, height: 630, alt: `${title} | Bantuin` },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Bantuin`,
      description,
      images: [image],
    },
  };
}
