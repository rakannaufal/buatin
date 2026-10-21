import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth";
import { getEnv } from "@/server/config";
import { Shell } from "@/components/shell";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !session.user.emailVerified) redirect("/login");
  return (
    <Shell
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      }}
      mock={getEnv().MOCK_LLM === "true"}
    >
      {children}
    </Shell>
  );
}
