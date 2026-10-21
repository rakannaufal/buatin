import { AuthPage } from "@/components/auth-page";
export const dynamic = "force-dynamic";
export const metadata = { title: "Lupa password", robots: { index: false } };
export default function Page() {
  return <AuthPage mode="forgot" />;
}
