import type { ReactNode } from "react";
import Link from "next/link";
import { PublicShell } from "./public-shell";
import {
  publicContact,
  SERVICE_UPDATED_AT,
  SERVICE_UPDATED_LABEL,
  type ServicePath,
} from "@/domain/legal";
import { siteSettings } from "@/server/admin/policies";
import { getEnv } from "@/server/config";

export async function ServicePage({
  path,
  children,
}: {
  path: ServicePath;
  children: ReactNode;
}) {
  const { value: site } = await siteSettings();
  const contact = publicContact(site, getEnv().SUPPORT_EMAIL);
  const notice =
    path === "/terms"
      ? site.termsNotice
      : path === "/privacy"
        ? site.privacyNotice
        : path === "/faq"
          ? site.faq
          : "";
  return (
    <PublicShell>
      <article className="public-content legal-content">
        {children}
        {notice && (
          <section aria-labelledby="service-notice-heading">
            <h2 id="service-notice-heading">Informasi tambahan</h2>
            <p className="preserve-lines">{notice}</p>
          </section>
        )}
        <section aria-labelledby="service-contact-heading">
          <h2 id="service-contact-heading">Pengelola dan kontak</h2>
          <p>
            {`Buatin dikelola secara perorangan${contact.name ? ` oleh ${contact.name}` : ""}.`}
          </p>
          {contact.address && (
            <p className="preserve-lines">
              Alamat korespondensi: {contact.address}
            </p>
          )}
          <p>
            Pertanyaan dan keluhan dapat disampaikan melalui{" "}
            <Link href="/support">Bantuan di akun Anda</Link>
            {contact.email && (
              <>
                {" "}
                atau email{" "}
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              </>
            )}
            .
          </p>
        </section>
      </article>
    </PublicShell>
  );
}

export function ServiceUpdated() {
  return (
    <p className="muted service-updated">
      Terakhir diperbarui:{" "}
      <time dateTime={SERVICE_UPDATED_AT}>{SERVICE_UPDATED_LABEL}</time>.
    </p>
  );
}
