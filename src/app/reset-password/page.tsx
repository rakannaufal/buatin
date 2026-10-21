import { AuthPage } from "@/components/auth-page";
export const dynamic = "force-dynamic";
export const metadata = { title: "Password baru", robots: { index: false } };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <AuthPage mode="reset" token={token} />;
}
