import type { MetadataRoute } from "next";
import { getEnv } from "@/server/config";

export const dynamic = "force-dynamic";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/pricing", "/privacy", "/terms"].map((path) => ({
    url: new URL(path, getEnv().APP_URL).href,
  }));
}
