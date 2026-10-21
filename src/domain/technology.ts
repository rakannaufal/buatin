import type { WebType } from "./types";

export const technologyCatalog = [
  {
    id: "language",
    label: "Bahasa",
    options: [
      "TypeScript",
      "JavaScript",
      "Python",
      "PHP",
      "Go",
      "Java",
      "Kotlin",
      "C#",
      "Ruby",
      "Rust",
    ],
  },
  {
    id: "frontend",
    label: "Frontend",
    options: [
      "Next.js",
      "React + Vite",
      "Vue",
      "Nuxt",
      "Svelte",
      "SvelteKit",
      "Astro",
      "Angular",
      "HTML/CSS/JS",
    ],
  },
  {
    id: "rendering",
    label: "Rendering",
    options: ["SSG", "SSR", "CSR/SPA", "ISR", "Hybrid"],
  },
  {
    id: "styling",
    label: "Styling",
    options: [
      "Tailwind CSS",
      "CSS Modules",
      "CSS/SCSS",
      "Sass",
      "styled-components",
      "Emotion",
    ],
  },
  {
    id: "components",
    label: "Komponen UI",
    options: [
      "shadcn/ui",
      "Radix",
      "MUI",
      "Chakra UI",
      "Ant Design",
      "Mantine",
      "Bootstrap",
      "DaisyUI",
      "PrimeVue",
      "Vuetify",
    ],
  },
  {
    id: "forms",
    label: "Form",
    options: [
      "React Hook Form",
      "Formik",
      "VeeValidate",
      "Form bawaan framework",
    ],
  },
  {
    id: "validation",
    label: "Validasi",
    options: ["Zod", "Valibot", "Yup", "Pydantic", "Validasi bawaan framework"],
  },
  {
    id: "state",
    label: "State client",
    options: [
      "Zustand",
      "Redux Toolkit",
      "Pinia",
      "NgRx",
      "Store bawaan framework",
    ],
  },
  {
    id: "data",
    label: "Data client",
    options: ["TanStack Query", "SWR", "Fetch bawaan framework"],
  },
  {
    id: "backend",
    label: "Backend",
    options: [
      "Next.js route handlers",
      "Express",
      "Fastify",
      "NestJS",
      "Hono",
      "FastAPI",
      "Django",
      "Flask",
      "Laravel",
      "Symfony",
      "Gin",
      "Fiber",
      "Spring Boot",
      "ASP.NET Core",
      "Rails",
      "Axum",
    ],
  },
  {
    id: "api",
    label: "Kontrak API",
    options: ["REST/OpenAPI", "tRPC", "GraphQL", "gRPC"],
  },
  {
    id: "database",
    label: "Database",
    options: [
      "PostgreSQL",
      "MySQL/MariaDB",
      "SQLite",
      "MongoDB",
      "Firestore",
      "DynamoDB",
    ],
  },
  {
    id: "orm",
    label: "ORM / data layer",
    options: [
      "Prisma",
      "Drizzle",
      "TypeORM",
      "Sequelize",
      "Mongoose",
      "SQLAlchemy",
      "Django ORM",
      "Eloquent",
      "GORM",
      "Hibernate",
      "Entity Framework Core",
      "Active Record",
    ],
  },
  {
    id: "baas",
    label: "Backend terkelola",
    options: ["Supabase", "Firebase", "Appwrite", "PocketBase", "Convex"],
  },
  {
    id: "auth",
    label: "Autentikasi",
    options: [
      "Better Auth",
      "Auth.js",
      "Clerk",
      "Supabase Auth",
      "Firebase Auth",
      "Auth0",
      "Keycloak",
      "Laravel Sanctum/Fortify",
      "OAuth/OIDC",
      "Session cookie",
    ],
  },
  {
    id: "access",
    label: "Hak akses",
    options: ["RBAC", "Permission per resource", "Organisasi / multi-tenant"],
  },
  {
    id: "cms",
    label: "CMS / konten",
    options: [
      "MDX",
      "WordPress",
      "Payload",
      "Strapi",
      "Sanity",
      "Directus",
      "Contentful",
      "Ghost",
    ],
  },
  {
    id: "commerce",
    label: "Commerce",
    options: ["Custom commerce", "Shopify", "WooCommerce", "Medusa", "Saleor"],
  },
  {
    id: "payments",
    label: "Pembayaran",
    options: ["Duitku", "Midtrans", "Xendit", "Stripe", "PayPal"],
  },
  {
    id: "email",
    label: "Email",
    options: ["Resend", "Postmark", "SendGrid", "Amazon SES", "SMTP"],
  },
  {
    id: "notifications",
    label: "Notifikasi",
    options: ["FCM", "Web Push", "WhatsApp Business API"],
  },
  {
    id: "storage",
    label: "File / media",
    options: [
      "S3-compatible",
      "Cloudflare R2",
      "Supabase Storage",
      "Firebase Storage",
      "Cloudinary",
      "UploadThing",
    ],
  },
  { id: "cache", label: "Cache", options: ["HTTP cache", "Redis/Valkey"] },
  {
    id: "queue",
    label: "Background jobs",
    options: [
      "pg-boss",
      "BullMQ",
      "Celery",
      "RQ",
      "Laravel Queue",
      "RabbitMQ",
      "SQS",
    ],
  },
  {
    id: "realtime",
    label: "Realtime",
    options: [
      "Polling",
      "SSE",
      "WebSocket",
      "Socket.IO",
      "Supabase Realtime",
      "Firebase",
      "Pusher",
      "Ably",
    ],
  },
  {
    id: "search",
    label: "Pencarian",
    options: [
      "Pencarian database",
      "PostgreSQL full-text",
      "Meilisearch",
      "Typesense",
      "Algolia",
      "Elasticsearch/OpenSearch",
    ],
  },
  { id: "tables", label: "Tabel", options: ["TanStack Table", "AG Grid"] },
  {
    id: "charts",
    label: "Grafik",
    options: ["Recharts", "Chart.js", "Apache ECharts", "D3"],
  },
  {
    id: "maps",
    label: "Peta",
    options: ["Leaflet", "MapLibre", "Mapbox", "Google Maps"],
  },
  {
    id: "animation",
    label: "Animasi / grafis",
    options: [
      "CSS / Web Animations",
      "Motion",
      "GSAP",
      "Three.js",
      "React Three Fiber",
      "Lottie",
      "Rive",
    ],
  },
  {
    id: "i18n",
    label: "Bahasa dan lokal",
    options: ["Intl", "next-intl", "i18next", "vue-i18n"],
  },
  {
    id: "ai",
    label: "AI opsional",
    options: ["API provider", "AI SDK", "pgvector", "Qdrant"],
  },
  {
    id: "analytics",
    label: "Analytics",
    options: ["Plausible", "Umami", "PostHog", "GA4"],
  },
  {
    id: "monitoring",
    label: "Monitoring",
    options: ["Sentry", "OpenTelemetry", "Prometheus/Grafana"],
  },
  {
    id: "unitTesting",
    label: "Unit / integration test",
    options: [
      "Vitest + Testing Library",
      "Jest + Testing Library",
      "pytest",
      "PHPUnit/Pest",
      "Go test",
      "JUnit",
      "xUnit",
      "RSpec",
      "Cargo test",
    ],
  },
  { id: "e2eTesting", label: "E2E test", options: ["Playwright", "Cypress"] },
  {
    id: "quality",
    label: "Kualitas dan keamanan",
    options: [
      "ESLint + Prettier",
      "Biome",
      "Ruff",
      "PHPStan",
      "Gitleaks",
      "Semgrep",
      "OWASP ZAP",
    ],
  },
  {
    id: "hosting",
    label: "Hosting",
    options: [
      "Vercel",
      "Netlify",
      "Cloudflare",
      "Railway",
      "Fly.io",
      "Render",
      "Supabase",
      "Firebase",
      "AWS",
      "GCP",
      "Azure",
      "VPS",
    ],
  },
  {
    id: "delivery",
    label: "Delivery / operasi",
    options: [
      "GitHub Actions",
      "GitLab CI",
      "systemd + Caddy",
      "Nginx",
      "Docker",
      "Kubernetes",
    ],
  },
  {
    id: "offline",
    label: "PWA / offline",
    options: ["Service worker", "Workbox", "IndexedDB/Dexie"],
  },
] as const;

export type TechnologyCategory = (typeof technologyCatalog)[number]["id"];
export type TechnologyChoices = Partial<Record<TechnologyCategory, string>>;
export const technologyIds = technologyCatalog.map((entry) => entry.id);

export function recommendTechnology(webType: WebType): TechnologyChoices {
  const content = ["landing", "company", "portfolio", "blog"].includes(webType);
  const application = ["saas", "internal", "booking", "ecommerce"].includes(
    webType,
  );
  return {
    language: "TypeScript",
    frontend: ["portfolio", "blog"].includes(webType) ? "Astro" : "Next.js",
    rendering: content ? "SSG" : "Hybrid",
    styling: "Tailwind CSS",
    unitTesting: "Vitest + Testing Library",
    e2eTesting: "Playwright",
    quality: "ESLint + Prettier",
    delivery: "GitHub Actions",
    hosting: "Vercel",
    ...(webType === "blog" ? { cms: "MDX" } : {}),
    ...(application
      ? {
          components: "shadcn/ui",
          forms: "React Hook Form",
          validation: "Zod",
          backend: "Next.js route handlers",
          api: "REST/OpenAPI",
          database: "PostgreSQL",
          orm: "Prisma",
          auth: "Better Auth",
          access: "RBAC",
        }
      : {}),
    ...(webType === "internal"
      ? { tables: "TanStack Table", charts: "Recharts" }
      : {}),
    ...(webType === "ecommerce" ? { commerce: "Custom commerce" } : {}),
    ...(webType === "booking" ? { queue: "pg-boss" } : {}),
  };
}

export function resolveTechnology(
  webType: WebType,
  mode: "auto" | "manual",
  choices: TechnologyChoices,
) {
  const locked = mode === "manual" ? choices : {};
  const resolved = { ...recommendTechnology(webType), ...locked };
  const languageBackend: Record<string, string> = {
    Python: "FastAPI",
    PHP: "Laravel",
    Go: "Gin",
    Java: "Spring Boot",
    Kotlin: "Spring Boot",
    "C#": "ASP.NET Core",
    Ruby: "Rails",
    Rust: "Axum",
  };
  if (
    locked.language &&
    !locked.backend &&
    resolved.backend &&
    languageBackend[locked.language]
  )
    resolved.backend = languageBackend[locked.language];
  const backendProfiles: Record<string, TechnologyChoices> = {
    FastAPI: {
      language: "Python",
      orm: "SQLAlchemy",
      validation: "Pydantic",
      unitTesting: "pytest",
      quality: "Ruff",
    },
    Django: {
      language: "Python",
      orm: "Django ORM",
      validation: "Validasi bawaan framework",
      unitTesting: "pytest",
      quality: "Ruff",
    },
    Flask: {
      language: "Python",
      orm: "SQLAlchemy",
      validation: "Pydantic",
      unitTesting: "pytest",
      quality: "Ruff",
    },
    Laravel: {
      language: "PHP",
      orm: "Eloquent",
      auth: "Laravel Sanctum/Fortify",
      unitTesting: "PHPUnit/Pest",
      quality: "PHPStan",
    },
    Symfony: {
      language: "PHP",
      orm: "none",
      auth: "Session cookie",
      unitTesting: "PHPUnit/Pest",
      quality: "PHPStan",
    },
    Gin: { language: "Go", orm: "GORM", unitTesting: "Go test" },
    Fiber: { language: "Go", orm: "GORM", unitTesting: "Go test" },
    "Spring Boot": { language: "Java", orm: "Hibernate", unitTesting: "JUnit" },
    "ASP.NET Core": {
      language: "C#",
      orm: "Entity Framework Core",
      unitTesting: "xUnit",
    },
    Rails: { language: "Ruby", orm: "Active Record", unitTesting: "RSpec" },
    Axum: { language: "Rust", orm: "none", unitTesting: "Cargo test" },
  };
  const profile = backendProfiles[resolved.backend ?? ""];
  if (profile) {
    for (const [key, value] of Object.entries(profile) as [
      TechnologyCategory,
      string,
    ][])
      if (!locked[key]) resolved[key] = value;
    if (!locked.auth) resolved.auth = profile.auth ?? "Session cookie";
    if (!locked.hosting) resolved.hosting = "Railway";
    if (!locked.quality && !profile.quality) delete resolved.quality;
  }
  // Dependent recommendations follow a manually selected framework, never replace it.
  const frontend = resolved.frontend ?? "none";
  const react = ["Next.js", "React + Vite"].includes(frontend);
  if (!react) {
    for (const key of ["components", "forms", "state", "data"] as const)
      if (!locked[key]) delete resolved[key];
  }
  if (
    frontend !== "Next.js" &&
    resolved.backend === "Next.js route handlers" &&
    !locked.backend
  )
    resolved.backend = "Fastify";
  if (frontend !== "Next.js" && !locked.hosting && !profile)
    resolved.hosting = "Cloudflare";
  if (!locked.orm && resolved.database) {
    if (resolved.database === "MongoDB")
      resolved.orm = profile ? "none" : "Mongoose";
    if (["Firestore", "DynamoDB"].includes(resolved.database))
      delete resolved.orm;
  }
  if (resolved.database === "none") {
    if (!locked.orm) delete resolved.orm;
    if (!locked.auth && applicationNeedsData(webType)) delete resolved.auth;
  }
  if (
    resolved.queue === "pg-boss" &&
    resolved.database !== "PostgreSQL" &&
    !locked.queue
  )
    delete resolved.queue;
  return resolved;
}
const applicationNeedsData = (webType: WebType) =>
  ["saas", "internal", "booking", "ecommerce"].includes(webType);

export function technologyConflicts(choices: TechnologyChoices): string[] {
  const issues: string[] = [];
  const react = ["Next.js", "React + Vite"].includes(choices.frontend ?? "");
  const vue = ["Vue", "Nuxt"].includes(choices.frontend ?? "");
  if (choices.state === "Pinia" && !vue)
    issues.push("Pinia memerlukan frontend Vue atau Nuxt.");
  if (choices.state === "NgRx" && choices.frontend !== "Angular")
    issues.push("NgRx memerlukan Angular.");
  if (
    [
      "shadcn/ui",
      "Radix",
      "MUI",
      "Chakra UI",
      "Ant Design",
      "Mantine",
    ].includes(choices.components ?? "") &&
    !react
  )
    issues.push(
      "Komponen React memerlukan Next.js atau React + Vite. Untuk Astro, tentukan integrasi React sebagai teknologi tambahan.",
    );
  if (["PrimeVue", "Vuetify"].includes(choices.components ?? "") && !vue)
    issues.push("PrimeVue/Vuetify memerlukan Vue atau Nuxt.");
  if (["React Hook Form", "Formik"].includes(choices.forms ?? "") && !react)
    issues.push("Form React memerlukan Next.js atau React + Vite.");
  if (choices.forms === "VeeValidate" && !vue)
    issues.push("VeeValidate memerlukan Vue atau Nuxt.");
  if (
    choices.orm === "Prisma" &&
    ["Firestore", "DynamoDB", "none"].includes(choices.database ?? "")
  )
    issues.push("Prisma tidak mendukung database yang dipilih.");
  if (choices.orm === "Mongoose" && choices.database !== "MongoDB")
    issues.push("Mongoose memerlukan MongoDB.");
  const relationalOrms = [
    "Drizzle",
    "TypeORM",
    "Sequelize",
    "SQLAlchemy",
    "Django ORM",
    "Eloquent",
    "GORM",
    "Hibernate",
    "Entity Framework Core",
    "Active Record",
  ];
  if (
    relationalOrms.includes(choices.orm ?? "") &&
    ["MongoDB", "Firestore", "DynamoDB", "none"].includes(
      choices.database ?? "",
    )
  )
    issues.push(
      "ORM relasional memerlukan PostgreSQL, MySQL/MariaDB atau SQLite. Pilih data layer sesuai database.",
    );
  if (
    choices.backend === "Next.js route handlers" &&
    choices.frontend !== "Next.js"
  )
    issues.push(
      "Next.js route handlers memerlukan Next.js sebagai bagian arsitektur.",
    );
  if (choices.queue === "pg-boss" && choices.database !== "PostgreSQL")
    issues.push("pg-boss memerlukan PostgreSQL.");
  return issues;
}
