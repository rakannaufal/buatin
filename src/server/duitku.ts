import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getEnv } from "./config";
import { AppError } from "./errors";

export const signDuitku = (value: string, key: string) =>
  createHmac("sha256", key).update(value).digest("hex");
export function validDuitkuSignature(
  value: string,
  signature: string,
  key: string,
) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(
    Buffer.from(signDuitku(value, key), "hex"),
    Buffer.from(signature, "hex"),
  );
}
export function paymentConfigured() {
  const env = getEnv();
  return Boolean(
    env.DUITKU_API_KEY &&
    env.DUITKU_MERCHANT_CODE &&
    (env.DUITKU_ENV !== "production" || env.APP_URL.startsWith("https://")),
  );
}
async function request(
  endpoint: string,
  data: Record<string, unknown>,
  form = false,
): Promise<unknown> {
  if (!paymentConfigured())
    throw new AppError(
      "PAYMENT_UNAVAILABLE",
      503,
      "Pembayaran QRIS belum diaktifkan.",
    );
  const host =
    getEnv().DUITKU_ENV === "production"
      ? "passport.duitku.com"
      : "sandbox.duitku.com";
  try {
    const response = await fetch(
      `https://${host}/webapi/api/merchant/${endpoint}`,
      {
        method: "POST",
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
        headers: {
          "Content-Type": form
            ? "application/x-www-form-urlencoded"
            : "application/json",
        },
        body: form
          ? new URLSearchParams(
              Object.entries(data).map(([key, value]) => [key, String(value)]),
            )
          : JSON.stringify(data),
      },
    );
    const content = await response.text();
    if (!response.ok || content.length > 65536)
      throw new Error("DUITKU_RESPONSE");
    return JSON.parse(content) as unknown;
  } catch {
    throw new AppError(
      "PAYMENT_PROVIDER",
      502,
      "Duitku belum dapat dihubungi. Status tagihan akan diperiksa kembali; jangan membayar dua kali.",
    );
  }
}
export async function createQris(input: {
  id: string;
  amount: number;
  name: string;
  email: string;
  customer: string;
}) {
  const env = getEnv();
  const datetime = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
  const methods = z
    .object({
      responseCode: z.literal("00"),
      paymentFee: z.array(z.object({ paymentMethod: z.string() })),
    })
    .parse(
      await request("paymentmethod/getpaymentmethod", {
        merchantcode: env.DUITKU_MERCHANT_CODE,
        amount: input.amount,
        datetime,
        signature: signDuitku(
          env.DUITKU_MERCHANT_CODE + input.amount + datetime,
          env.DUITKU_API_KEY,
        ),
      }),
    );
  if (
    !methods.paymentFee.some(
      (method) => method.paymentMethod === env.DUITKU_QRIS_METHOD,
    )
  )
    throw new AppError(
      "QRIS_UNAVAILABLE",
      503,
      "Kanal QRIS merchant belum aktif. Hubungi pengelola.",
    );
  const response = z
    .object({
      statusCode: z.literal("00"),
      reference: z.string().min(1).max(100),
      qrString: z.string().min(1).max(10000),
      amount: z.coerce.number().int(),
    })
    .parse(
      await request("v2/inquiry", {
        merchantCode: env.DUITKU_MERCHANT_CODE,
        merchantOrderId: input.id,
        paymentAmount: input.amount,
        paymentMethod: env.DUITKU_QRIS_METHOD,
        productDetails: `${input.name} Bantuin, satu bulan`,
        email: input.email,
        customerVaName: input.customer.slice(0, 100),
        callbackUrl: `${env.APP_URL}/api/billing/duitku/callback`,
        returnUrl: `${env.APP_URL}/billing/${input.id}`,
        expiryPeriod: env.DUITKU_EXPIRY_MINUTES,
        itemDetails: [{ name: input.name, price: input.amount, quantity: 1 }],
        signature: signDuitku(
          env.DUITKU_MERCHANT_CODE + input.id + input.amount,
          env.DUITKU_API_KEY,
        ),
      }),
    );
  if (response.amount !== input.amount)
    throw new AppError(
      "PAYMENT_AMOUNT",
      502,
      "Nominal QRIS tidak sesuai. Pembayaran ditahan untuk diperiksa.",
    );
  return response;
}
export async function checkDuitku(id: string) {
  const env = getEnv();
  return z
    .object({
      merchantOrderId: z.string(),
      reference: z.string(),
      amount: z.coerce.number().int(),
      statusCode: z.enum(["00", "01", "02"]),
    })
    .parse(
      await request(
        "transactionStatus",
        {
          merchantCode: env.DUITKU_MERCHANT_CODE,
          merchantOrderId: id,
          signature: signDuitku(
            env.DUITKU_MERCHANT_CODE + id,
            env.DUITKU_API_KEY,
          ),
        },
        true,
      ),
    );
}
