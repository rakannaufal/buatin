import { AuthPage } from "@/components/auth-page";
export const dynamic = "force-dynamic";
export const metadata = { title: "Verifikasi email", robots: { index: false } };
export default function Page() {
  return <AuthPage mode="verify" />;
}
