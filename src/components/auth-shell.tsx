import type { ReactNode } from "react";
import Link from "next/link";
import { Artwork, Brand } from "./brand";

export function AuthShell({
  children,
  illustration = "auth-notebook",
}: {
  children: ReactNode;
  illustration?: string;
}) {
  return (
    <main className="public-theme auth-page">
      <a href="#auth-content" className="skip-link">
        Lewati ke formulir
      </a>
      <section className="auth-story" aria-labelledby="auth-story-heading">
        <Brand />
        <div className="auth-story-content">
          <h1 id="auth-story-heading">
            Ide yang baik
            <br />
            layak punya <em>rencana.</em>
          </h1>
          <Artwork name={illustration} eager />
          <p>
            Mulai dari brief. Bawa pulang spesifikasi yang bisa ditinjau,
            dibagikan, dan dikerjakan.
          </p>
        </div>
        <Link href="/" className="auth-back">
          Kembali ke beranda
        </Link>
      </section>
      <section className="auth-panel" id="auth-content" tabIndex={-1}>
        <div className="auth-paper">{children}</div>
        <nav aria-label="Informasi akun" className="auth-footer">
          <Link href="/terms">Ketentuan layanan</Link>
          <Link href="/privacy">Privasi</Link>
          <Link href="/faq">FAQ</Link>
        </nav>
      </section>
    </main>
  );
}
