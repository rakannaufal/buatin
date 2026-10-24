import type { MetadataRoute } from "next";
import { getEnv } from "@/server/config";
import { serviceLinks } from "@/domain/legal";

export const dynamic = "force-dynamic";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/pricing", ...serviceLinks.map((link) => link.href)].map(
    (path) => ({
      url: new URL(path, getEnv().APP_URL).href,
    }),
  );
}
