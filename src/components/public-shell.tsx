import Link from "next/link";
import { BookOpen } from "lucide-react";
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-site">
      <a className="skip-link" href="#main-content">
        Lewati ke konten
      </a>
      <header className="public-header">
        <Link href="/" className="brand">
          <BookOpen size={25} strokeWidth={1.5} />
          <span>Buatin</span>
        </Link>
        <nav aria-label="Navigasi publik">
          <Link href="/#cara-kerja">Cara kerja</Link>
          <Link href="/pricing">Paket</Link>
          <Link href="/login">Masuk</Link>
          <Link className="button button-secondary" href="/signup">
            Mulai gratis
          </Link>
        </nav>
      </header>
      <main id="main-content">{children}</main>
      <footer className="public-footer">
        <Link className="brand" href="/">
          Buatin
        </Link>
        <span>Dari ide, jadi terarah.</span>
        <nav aria-label="Informasi layanan">
          <Link href="/privacy">Privasi</Link>
          <Link href="/terms">Ketentuan</Link>
          <Link href="/pricing">Paket</Link>
        </nav>
      </footer>
    </div>
  );
}
