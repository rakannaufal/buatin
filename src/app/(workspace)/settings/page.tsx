import { SettingsPage } from "@/features/settings/settings";
import { requireAdmin } from "@/server/access";
export default async function Page() {
  await requireAdmin();
  return <SettingsPage />;
}
