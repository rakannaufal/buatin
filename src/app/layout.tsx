import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { getEnv } from "@/server/config";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/manrope/latin-700.css";
import "@fontsource/source-serif-4/latin-400.css";
import "@fontsource/source-serif-4/latin-400-italic.css";
import "@fontsource/caveat/latin-400.css";
import "@fontsource/caveat/latin-700.css";
import "./globals.css";
import "./public-theme.css";
export const metadata: Metadata = {
  metadataBase: new URL(getEnv().APP_URL),
  title: {
    default: "Buatin | Dari ide, jadi terarah",
    template: "%s | Buatin",
  },
  description:
    "Ubah brief website menjadi paket spesifikasi yang relevan dan siap ditinjau.",
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/assets/icons/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/assets/icons/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/assets/icons/apple-touch-icon-180.png", sizes: "180x180" },
    ],
  },
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
