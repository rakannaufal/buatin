import { AdminPage } from "@/features/admin/admin";
import { requireAdmin } from "@/server/access";
export default async function Page() {
  await requireAdmin();
  return <AdminPage />;
}
