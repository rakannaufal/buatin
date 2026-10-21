import path from "node:path";
import { access, stat, statfs } from "node:fs/promises";
import { constants } from "node:fs";
import { db } from "./db";
import { getEnv } from "./config";
import { readiness } from "./health";
import { latestBackup } from "./backup";
import { publicAuthReady, localApp } from "./challenge";
import { paymentConfigured } from "./duitku";
import { llmConfig, checkModels } from "./llm";
import { controls, siteSettings } from "./admin/policies";

export type ProductionCheck = {
  id: string;
  priority: "P0" | "P1" | "P2";
  status: "ready" | "blocked" | "manual";
  label: string;
  detail: string;
};
export async function productionChecks(
  provider = false,
): Promise<ProductionCheck[]> {
  const env = getEnv();
  const policy = await controls().catch(() => null);
  const contact =
    (await siteSettings().catch(() => null))?.value.supportEmail ||
    env.SUPPORT_EMAIL;
  const checks: ProductionCheck[] = [];
  const add = (
    id: string,
    priority: ProductionCheck["priority"],
    ready: boolean,
    label: string,
    detail: string,
  ) =>
    checks.push({
      id,
      priority,
      status: ready ? "ready" : "blocked",
      label,
      detail,
    });
  add(
    "https",
    "P0",
    env.APP_URL.startsWith("https:") && !localApp(),
    "Domain dan HTTPS",
    "Hosting, DNS dan sertifikat produksi disediakan kemudian.",
  );
  add(
    "public-auth",
    "P0",
    publicAuthReady() &&
      env.EMAIL_PROVIDER === "resend" &&
      !env.EMAIL_FROM.includes("example.com"),
    "Email dan perlindungan registrasi",
    "Resend, domain pengirim terverifikasi dan Turnstile diperlukan; konfigurasi belum membuktikan pengiriman nyata.",
  );
  add(
    "support",
    "P0",
    Boolean(contact) && !/@(?:localhost\.test|example\.com)$/.test(contact),
    "Kontak pengelola",
    "Isi kontak dukungan dan identitas pengelola pada kebijakan layanan.",
  );
  add(
    "ai-mode",
    "P0",
    env.MOCK_LLM === "false",
    "AI nyata",
    "MOCK_LLM=false setelah smoke provider lulus; fixture otomatis tetap memakai mock.",
  );
  add(
    "ai-key",
    "P0",
    env.LLM_AUTH_MODE === "header" && Boolean(env.NINEROUTER_API_KEY),
    "Kredensial 9router",
    "Simpan kunci klien di secret environment; batasi akses 9router pada jaringan privat.",
  );
  add(
    "ai-budget",
    "P0",
    Boolean(
      policy &&
      policy.dailyBudgetUsd > 0 &&
      policy.inputRate > 0 &&
      policy.outputRate > 0,
    ),
    "Batas estimasi biaya AI",
    "Isi tarif konservatif untuk seluruh model terpilih dan batas USD harian; aktifkan batas tagihan di provider juga.",
  );
  add(
    "templates",
    "P0",
    env.TEMPLATE_SOURCE !== "fallback",
    "Template terstruktur",
    "Gunakan builtin yang ditinjau atau kit original yang sah; hasil AI tetap perlu tinjauan manusia.",
  );
  let scanner = false;
  if (path.isAbsolute(env.REFERENCE_SCANNER_PATH))
    try {
      await access(env.REFERENCE_SCANNER_PATH, constants.X_OK);
      scanner = true;
    } catch {
      scanner = false;
    }
  add(
    "scanner",
    "P0",
    scanner,
    "Pemindai PDF/DOCX",
    "Executable ClamAV-compatible dan pembaruan signature diperlukan pada host; uji file bersih serta fixture berbahaya.",
  );
  let storage = false;
  if (env.REFERENCE_STORAGE === "s3")
    storage = Boolean(
      env.REFERENCE_S3_BUCKET &&
      env.REFERENCE_S3_ACCESS_KEY &&
      env.REFERENCE_S3_SECRET_KEY &&
      (!env.REFERENCE_S3_ENDPOINT ||
        env.REFERENCE_S3_ENDPOINT.startsWith("https:")),
    );
  else if (path.isAbsolute(env.REFERENCE_STORAGE_DIR)) {
    const directory = path.resolve(env.REFERENCE_STORAGE_DIR),
      publicRoot = path.resolve("public");
    try {
      const info = await stat(directory);
      storage =
        info.isDirectory() &&
        (info.mode & 0o077) === 0 &&
        directory !== publicRoot &&
        !directory.startsWith(publicRoot + path.sep);
    } catch {
      storage = false;
    }
  }
  add(
    "storage",
    "P0",
    storage,
    "Lampiran privat persisten",
    "Volume bersama web/worker di luar public dengan mode 0700, atau bucket privat; uji akses dan restore pada staging.",
  );
  try {
    const [models, operators, paid] = await Promise.all([
      db.setting.findUnique({ where: { key: "models" } }),
      db.user.findMany({
        where: { role: { in: ["owner", "admin"] } },
        select: { twoFactorEnabled: true, emailVerified: true },
      }),
      db.billingPlan.findMany({
        where: { id: { not: "free" }, available: true },
      }),
    ]);
    const selected = models?.value as
      { planner?: string; writer?: string } | undefined;
    add(
      "models",
      "P0",
      Boolean(
        (selected?.planner || env.LLM_MODEL_PLANNER) &&
        (selected?.writer || env.LLM_MODEL_WRITER),
      ),
      "Model planner dan writer",
      "Gunakan ID dari /models; verifikasi kualitas, latensi, harga dan izin penggunaan upstream.",
    );
    add(
      "operator-mfa",
      "P0",
      env.ADMIN_REQUIRE_2FA === "true" &&
        operators.length > 0 &&
        operators.every((user) => user.twoFactorEnabled && user.emailVerified),
      "Dua faktor operator",
      "Setiap owner/admin mengaktifkan autentikator dan menyimpan kode pemulihan sebelum domain publik dibuka.",
    );
    if (paid.length)
      add(
        "payments",
        "P0",
        paid.every((plan) => Boolean(plan.monthlyPrice)) &&
          paymentConfigured() &&
          env.DUITKU_ENV === "production",
        "Pembayaran paket aktif",
        "Paket yang dijual membutuhkan harga disetujui, merchant produksi dan uji callback/rekonsiliasi nyata.",
      );
    else
      checks.push({
        id: "payments",
        priority: "P1",
        status: "manual",
        label: "Penjualan paket",
        detail:
          "Paket berbayar nonaktif. Tentukan harga dan merchant Duitku sebelum mengaktifkan checkout.",
      });
  } catch {
    add(
      "database",
      "P0",
      false,
      "Schema database",
      "PostgreSQL harus terjangkau dan seluruh migration diterapkan. Database produksi menyusul.",
    );
  }
  try {
    const backup = await latestBackup();
    add(
      "backup",
      "P0",
      Boolean(backup && backup.ageHours < env.BACKUP_MAX_AGE_HOURS),
      "Backup terenkripsi terbaru",
      "Backup database + lampiran lengkap, kunci terpisah, salinan di luar host dan latihan restore wajib tersedia.",
    );
  } catch {
    add(
      "backup",
      "P0",
      false,
      "Backup terenkripsi terbaru",
      "Periksa direktori backup, izin dan jadwal.",
    );
  }
  if (provider) {
    try {
      const config = await llmConfig();
      await checkModels(config);
      add(
        "provider",
        "P0",
        true,
        "Koneksi model",
        "Daftar model tersedia; bukan bukti kuota atau kualitas generasi.",
      );
    } catch {
      add(
        "provider",
        "P0",
        false,
        "Koneksi model",
        "9router atau model terpilih belum tersedia.",
      );
    }
  }
  checks.push({
    id: "staging",
    priority: "P1",
    status: "manual",
    label: "Uji staging dan pemulihan",
    detail:
      "Uji email, challenge, scanner, storage, provider, browser lintas perangkat, beban dan restore pada infrastruktur tujuan.",
  });
  checks.push({
    id: "alerts",
    priority: "P1",
    status: "manual",
    label: "Monitoring di luar host",
    detail:
      "Hubungkan uptime check /api/health/ready dan log terstruktur ke tujuan alert operator; lakukan latihan alert.",
  });
  checks.push({
    id: "legal",
    priority: "P1",
    status: "manual",
    label: "Privasi dan prosedur dukungan",
    detail:
      "Tetapkan identitas pengelola, retensi backup/pembayaran, pemroses data, tenggat serta penanganan permintaan pengguna.",
  });
  return checks.sort((left, right) =>
    left.priority.localeCompare(right.priority),
  );
}
export async function operationsSnapshot() {
  const ready = await readiness();
  const policy = await controls();
  const day = new Date().toISOString().slice(0, 10);
  const [
    queue,
    queued,
    running,
    mailFailures,
    paymentReviews,
    requests,
    budget,
  ] = await Promise.all([
    db.outboxEvent.findFirst({
      where: { dispatchedAt: null },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    db.job.count({ where: { status: "queued" } }),
    db.job.count({
      where: { status: { in: ["running", "validating", "cancel_requested"] } },
    }),
    db.emailMessage.count({ where: { sentAt: null, attempts: { gte: 8 } } }),
    db.payment.count({ where: { status: "review" } }),
    db.dataRequest.count({ where: { status: { in: ["open", "processing"] } } }),
    db.aiBudgetPeriod.findUnique({ where: { id: `real:${day}:global` } }),
  ]);
  const disk = await statfs(process.cwd());
  const freeDiskMb = Math.floor(
    (Number(disk.bavail) * Number(disk.bsize)) / 1048576,
  );
  const dispatchAgeSeconds = queue
    ? Math.floor((Date.now() - queue.createdAt.getTime()) / 1000)
    : 0;
  const alerts = [
    !ready.ok && "DEPENDENCY_UNHEALTHY",
    freeDiskMb < 1024 && "DISK_LOW",
    dispatchAgeSeconds > 120 && "OUTBOX_STALLED",
    mailFailures > 0 && "EMAIL_DELIVERY_FAILED",
    paymentReviews > 0 && "PAYMENT_REVIEW_REQUIRED",
  ].filter((value): value is string => Boolean(value));
  return {
    at: new Date().toISOString(),
    ok: alerts.length === 0,
    readiness: ready,
    alerts,
    metrics: {
      queued,
      running,
      dispatchAgeSeconds,
      freeDiskMb,
      mailFailures,
      paymentReviews,
      dataRequests: requests,
    },
    ai: {
      day,
      requests: budget?.requests ?? 0,
      tokens: budget?.tokens ?? 0,
      estimatedUsd: Number(budget?.costMicros ?? 0n) / 1000000,
      requestLimit: policy.dailyRequests,
      tokenLimit: policy.dailyTokens,
      budgetUsd: policy.dailyBudgetUsd,
      pricingKnown: policy.inputRate > 0 && policy.outputRate > 0,
    },
  };
}
