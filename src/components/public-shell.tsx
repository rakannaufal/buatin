import Link from "next/link";
import { connection } from "next/server";
import { siteSettings } from "@/server/admin/policies";
import { serviceLinks } from "@/domain/legal";
import { Brand } from "./brand";
import { PublicNavigation } from "./public-navigation";

export async function PublicShell({
  children,
  path = "/",
}: {
  children: React.ReactNode;
  path?: string;
}) {
  await connection();
  const { value: site } = await siteSettings();
  return (
    <div className="public-theme public-page">
      <a className="skip-link" href="#main-content">
        Lewati ke konten
      </a>
      <header className="site-header">
        <Brand />
        <PublicNavigation path={path} />
      </header>
      {site.announcement && (
        <aside className="public-announcement" role="status">
          {site.announcement}
        </aside>
      )}
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <footer className="site-footer">
        <div className="footer-intro">
          <Brand />
          <p>Dari ide, jadi terarah.</p>
          <span>Brief Anda. Bekal membangunnya.</span>
        </div>
        <nav aria-label="Informasi layanan">
          {serviceLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="footer-bottom">
          <span>Buatin. Dokumen perencanaan website.</span>
          <a href="#main-content">Kembali ke atas</a>
        </div>
      </footer>
    </div>
  );
}
