import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/source-serif-4/latin-400.css";
import "@fontsource/source-serif-4/latin-400-italic.css";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Buatin | Dari ide, jadi terarah",
    template: "%s | Buatin",
  },
  description:
    "Ubah brief website menjadi paket spesifikasi yang relevan dan siap ditinjau.",
  robots: { index: true, follow: true },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
