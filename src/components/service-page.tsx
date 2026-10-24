import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import Link from "next/link";
import { PublicShell } from "./public-shell";
import { Artwork } from "./brand";
import {
  publicContact,
  SERVICE_UPDATED_AT,
  SERVICE_UPDATED_LABEL,
  type ServicePath,
} from "@/domain/legal";
import { siteSettings } from "@/server/admin/policies";
import { getEnv } from "@/server/config";

const illustrations: Record<ServicePath, string> = {
  "/terms": "terms-document",
  "/privacy": "privacy-folder",
  "/faq": "faq-conversation",
  "/disclaimer": "disclaimer-review",
  "/refund": "refund-receipt",
  "/cookies": "cookies-browser",
  "/contact": "contact-message",
};

function faqDisclosures(nodes: ReactNode[]) {
  const result: ReactNode[] = [];
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index];
    if (!isValidElement(node) || node.type !== "h3") {
      result.push(node);
      continue;
    }
    let end = index + 1;
    while (end < nodes.length) {
      const next = nodes[end];
      if (isValidElement(next) && ["h2", "h3"].includes(String(next.type)))
        break;
      end++;
    }
    result.push(
      <details className="faq-question" key={node.key ?? index}>
        <summary>
          {node}
          <span aria-hidden="true" className="faq-toggle" />
        </summary>
        <div>{nodes.slice(index + 1, end)}</div>
      </details>,
    );
    index = end - 1;
  }
  return result;
}

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
  const [title, updated, ...body] = Children.toArray(children);
  const contents: { id: string; label: ReactNode }[] = [];
  const sections = body.map((node) => {
    if (
      !isValidElement<{ children?: ReactNode; id?: string }>(node) ||
      node.type !== "h2"
    )
      return node;
    const id = `service-section-${contents.length + 1}`;
    contents.push({ id, label: node.props.children });
    return cloneElement(node, { id });
  });
  if (notice)
    contents.push({
      id: "service-notice-heading",
      label: "Informasi tambahan",
    });
  contents.push({
    id: "service-contact-heading",
    label: "Pengelola dan kontak",
  });
  return (
    <PublicShell path={path}>
      <article
        className={`service-article public-container${path === "/faq" ? " is-faq" : ""}`}
      >
        <header className="service-hero">
          <div>
            {title}
            {updated}
          </div>
          <Artwork name={illustrations[path]} eager />
        </header>
        <div className="service-grid">
          <aside className="service-sidebar">
            <nav aria-label="Isi halaman">
              <p>Di halaman ini</p>
              <ul>
                {contents.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`}>{item.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
          <div className="service-paper">
            {path === "/faq" ? faqDisclosures(sections) : sections}
            {notice && (
              <section aria-labelledby="service-notice-heading">
                <h2 id="service-notice-heading">Informasi tambahan</h2>
                <p className="preserve-lines">{notice}</p>
              </section>
            )}
            <section aria-labelledby="service-contact-heading">
              <h2 id="service-contact-heading">Pengelola dan kontak</h2>
              <p>
                {`Bantuin dikelola secara perorangan${contact.name ? ` oleh ${contact.name}` : ""}.`}
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
          </div>
        </div>
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
