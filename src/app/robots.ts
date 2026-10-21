import type { MetadataRoute } from "next";
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
  };
}
