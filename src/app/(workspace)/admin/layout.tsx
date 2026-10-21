import { requireAdmin } from "@/server/access";
import { AdminNavigation, AdminUnlock } from "@/features/admin/shared";
import "@/features/admin/admin.css";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="admin-container">
      <AdminNavigation />
      <div className="admin-content">
        <AdminUnlock />
        {children}
      </div>
    </div>
  );
}
