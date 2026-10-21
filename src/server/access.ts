import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { operatorMfaRequired } from "./operator-access";
import { db } from "./db";
import { suspended } from "../domain/admin";
export async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  const current = session
    ? await db.user.findUnique({ where: { id: session.user.id } })
    : null;
  if (
    !session?.user.emailVerified ||
    !current ||
    suspended(current) ||
    !["owner", "admin"].includes(current.role)
  )
    redirect("/dashboard");
  if (operatorMfaRequired() && !current.twoFactorEnabled)
    redirect("/account?security=required");
  return session;
}
