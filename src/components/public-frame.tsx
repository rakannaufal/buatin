import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { serviceLinks } from "@/domain/legal";
import { Brand } from "./brand";
import { PublicNavigation } from "./public-navigation";

const footerGroups = [
  {
    title: "Produk",
    links: [
      { href: "/#cara-kerja", label: "Cara kerja" },
      { href: "/pricing", label: "Paket" },
      { href: "/about", label: "Tentang Buatin" },
    ],
  },
  {
    title: "Bantuan",
    links: serviceLinks.filter((link) =>
      ["/faq", "/contact"].includes(link.href),
    ),
  },
  {
    title: "Kebijakan",
    links: serviceLinks.filter(
      (link) => !["/faq", "/contact"].includes(link.href),
    ),
  },
];

export function PublicFrame({
  children,
  path = "/",
  announcement,
}: {
  children: React.ReactNode;
  path?: string;
  announcement?: string;
}) {
  return (
    <div className="public-theme public-page">
      <a className="skip-link" href="#main-content">
        Lewati ke konten
      </a>
      <header className="site-header" id="page-top" tabIndex={-1}>
        <Brand />
        <PublicNavigation path={path} />
      </header>
      {announcement && (
        <aside className="public-announcement" role="status">
          {announcement}
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
        <nav className="footer-links" aria-label="Informasi layanan">
          {footerGroups.map((group) => (
            <div className="footer-link-group" key={group.title}>
              <h2>{group.title}</h2>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={path === link.href ? "page" : undefined}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="footer-bottom">
          <span>Buatin. Dokumen perencanaan website.</span>
          <a href="#page-top">
            Kembali ke atas <ArrowUp size={16} aria-hidden="true" />
          </a>
        </div>
      </footer>
    </div>
  );
}
