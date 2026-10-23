import type { NextConfig } from "next";
const config: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/api/*": [
      "./templates/**/*",
      "./prompts/**/*",
      "./config/**/*",
      "./skill-packs/**/*",
      "./scripts/parse-reference.mjs",
      "./node_modules/sharp/**/*",
      "./node_modules/@img/**/*",
      "./node_modules/detect-libc/**/*",
      "./node_modules/semver/**/*",
      "./node_modules/yauzl/**/*",
      "./node_modules/pend/**/*",
      "./node_modules/buffer-crc32/**/*",
    ],
  },
  serverExternalPackages: [
    "pg",
    "pg-boss",
    "@prisma/client",
    "@prisma/adapter-pg",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; object-src 'none'; base-uri 'self'`,
          },
        ],
      },
    ];
  },
};
export default config;
