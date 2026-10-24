"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import {
  LayoutDashboard,
  Plus,
  Settings,
  LogOut,
  Menu,
  X,
  ArrowUpRight,
  BookOpen,
  CreditCard,
  UserRound,
  Library,
  Shield,
  LifeBuoy,
} from "lucide-react";
import { Modal, cn } from "./ui";
const subscribe = (callback: () => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};
export function Shell({
  children,
  user,
  mock,
}: {
  children: ReactNode;
  user: { name: string; email: string; role: string };
  mock: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  const links = [
    { href: "/dashboard", label: "Ruang kerja", icon: LayoutDashboard },
    { href: "/projects/new", label: "Proyek baru", icon: Plus },
    { href: "/billing", label: "Paket & tagihan", icon: CreditCard },
    { href: "/library", label: "Pustaka pribadi", icon: Library },
    { href: "/account", label: "Akun", icon: UserRound },
    { href: "/support", label: "Bantuan", icon: LifeBuoy },
    ...(["owner", "admin"].includes(user.role)
      ? [
          { href: "/admin", label: "Admin", icon: Shield },
          { href: "/settings", label: "Layanan AI", icon: Settings },
        ]
      : []),
  ];
  async function logout() {
    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error();
      window.location.replace("/login");
    } catch {
      setLogoutError(true);
    }
  }
  return (
    <div className="workspace">
      <a className="skip-link" href="#main-content">
        Lewati ke konten
      </a>
      <button
        className="mobile-nav-button icon-button"
        aria-label={open ? "Tutup navigasi" : "Buka navigasi"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
      {open && (
        <button
          aria-label="Tutup navigasi"
          className="sidebar-backdrop"
          onClick={() => setOpen(false)}
        />
      )}
      <aside className={cn("sidebar", open && "sidebar-open")}>
        <Link
          href="/dashboard"
          className="brand"
          onClick={() => setOpen(false)}
        >
          <span className="brand-symbol">
            <BookOpen size={22} strokeWidth={1.5} />
          </span>
          <span>
            Bantuin<span className="brand-sub">Dari ide, jadi terarah</span>
          </span>
        </Link>
        <div className="workspace-label">Ruang kerja pribadi</div>
        <nav aria-label="Navigasi utama">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "nav-link",
                (pathname === item.href ||
                  (item.href === "/dashboard" &&
                    pathname.startsWith("/jobs"))) &&
                  "nav-active",
              )}
              aria-current={pathname === item.href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {item.href === "/projects/new" && (
                <span className="nav-plus">+</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="status-dot" />
          Satu brief. Rencana yang utuh.
          <p>Dokumen yang relevan, dipilih sesuai kebutuhan proyek.</p>
        </div>
        <div className="sidebar-bottom">
          <Modal
            title="Dari ide ke spesifikasi"
            description="Alur kerja Bantuin"
            trigger={
              <button className="sidebar-help">
                <BookOpen size={17} />
                Panduan singkat
                <ArrowUpRight size={15} />
              </button>
            }
          >
            <ol className="help-steps">
              <li>Tulis tujuan, pengguna, fitur utama, dan batasan.</li>
              <li>
                Periksa alasan pemilihan dokumen dan jawab pertanyaan penting.
              </li>
              <li>
                Konfirmasi generasi lalu tinjau hasil sebelum diberikan ke
                coding agent.
              </li>
            </ol>
            <p className="muted">
              Dokumen utama disusun dari template. Analisis gambar opsional
              memakai provider AI jika diaktifkan. Jangan masukkan password,
              key, atau data rahasia. Retensi mengikuti pengaturan server.
            </p>
          </Modal>
          <div className="account">
            <span className="avatar">{user.name.slice(0, 1)}</span>
            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
            <button
              className="icon-button"
              aria-label="Keluar"
              onClick={logout}
            >
              <LogOut size={17} />
            </button>
          </div>
          {logoutError && (
            <p role="alert" className="field-error">
              Gagal keluar. Coba kembali.
            </p>
          )}
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <span>
            <span className="breadcrumb">Workspace</span>
            <span className="breadcrumb-divider">/</span>
            {links.find(
              (item) =>
                pathname === item.href || pathname.startsWith(`${item.href}/`),
            )?.label ??
              (pathname.startsWith("/jobs") ? "Dokumen proyek" : "Proyek Anda")}
          </span>
          <span className="topbar-right">
            {mock ? (
              <span className="mode-indicator">Mode mock</span>
            ) : (
              <span className="connection">Dokumen berbasis template</span>
            )}
            <span className="personal-label">Pribadi</span>
          </span>
        </header>
        {!online && (
          <div className="offline-banner" role="status">
            Koneksi terputus. Draft belum tersimpan mungkin perlu disimpan
            kembali. Proses server tetap berjalan.
          </div>
        )}
        <main id="main-content" className="main-content">
          {children}
        </main>
        <footer className="app-footer">
          <Link href="/">Bantuin</Link>
          <span>Rencana yang jelas. Pengerjaan yang terarah.</span>
        </footer>
      </div>
    </div>
  );
}
