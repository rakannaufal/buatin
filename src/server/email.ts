import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { db, type Transaction } from "./db";
import { getEnv } from "./config";
import { hash } from "./limits";

export async function queueEmail(
  to: string,
  subject: string,
  text: string,
  key: string,
  tx: Transaction = db,
) {
  const deduplicationKey = hash(key);
  return tx.emailMessage.upsert({
    where: { deduplicationKey },
    create: { to, subject, text, deduplicationKey },
    update: {},
  });
}
export async function deliverEmails() {
  const env = getEnv();
  const messages = await db.emailMessage.findMany({
    where: {
      sentAt: null,
      attempts: { lt: 8 },
      nextAttemptAt: { lte: new Date() },
    },
    orderBy: { createdAt: "asc" },
    take: 10,
  });
  for (const message of messages) {
    try {
      if (env.EMAIL_PROVIDER === "local") {
        if (
          !["localhost", "127.0.0.1", "[::1]"].includes(
            new URL(env.APP_URL).hostname,
          )
        )
          throw new Error("LOCAL_EMAIL_RESTRICTED");
        await mkdir(path.resolve(".local/mail"), {
          recursive: true,
          mode: 0o700,
        });
        await writeFile(
          path.resolve(".local/mail", `${message.id}.txt`),
          `To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`,
          { mode: 0o600 },
        );
      } else {
        if (!env.RESEND_API_KEY) throw new Error("MAIL_NOT_CONFIGURED");
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          signal: AbortSignal.timeout(15000),
          redirect: "error",
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
            "Idempotency-Key": message.id,
          },
          body: JSON.stringify({
            from: env.EMAIL_FROM,
            to: [message.to],
            subject: message.subject,
            text: message.text,
          }),
        });
        if (!response.ok) throw new Error("MAIL_PROVIDER");
      }
      await db.emailMessage.update({
        where: { id: message.id },
        data: { sentAt: new Date(), attempts: { increment: 1 } },
      });
    } catch {
      await db.emailMessage.update({
        where: { id: message.id },
        data: {
          attempts: { increment: 1 },
          nextAttemptAt: new Date(
            Date.now() + Math.min(3600, 30 * 2 ** message.attempts) * 1000,
          ),
        },
      });
      console.error(
        JSON.stringify({ event: "email.delivery.failed", id: message.id }),
      );
    }
  }
}
