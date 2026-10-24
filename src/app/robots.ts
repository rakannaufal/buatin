import type { MetadataRoute } from "next";
import { getEnv } from "@/server/config";
import { serviceLinks } from "@/domain/legal";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/pricing",
        "/about",
        ...serviceLinks.map((link) => link.href),
      ],
      disallow: [
        "/api/",
        "/dashboard",
        "/projects/",
        "/jobs/",
        "/account",
        "/billing",
        "/admin",
        "/settings",
        "/library",
        "/reset-password",
      ],
    },
    sitemap: new URL("/sitemap.xml", getEnv().APP_URL).href,
  };
}
