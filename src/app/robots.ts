import type { MetadataRoute } from "next";
import { getEnv } from "@/server/config";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/pricing", "/privacy", "/terms"],
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
