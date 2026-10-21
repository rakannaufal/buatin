import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getEnv } from "./config";
const globalDb = globalThis as unknown as { specDb?: PrismaClient };
export const db =
  globalDb.specDb ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: getEnv().DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    }),
  });
if (process.env.NODE_ENV !== "production") globalDb.specDb = db;
export function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
export type Transaction = Prisma.TransactionClient;
