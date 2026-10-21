import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { operatorMfaRequired } from "./operator-access";
export async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (
    !session?.user.emailVerified ||
    !["owner", "admin"].includes(session.user.role)
  )
    redirect("/dashboard");
  if (operatorMfaRequired() && !session.user.twoFactorEnabled)
    redirect("/account?security=required");
  return session;
}
