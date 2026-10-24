"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function PublicNavigation({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function dismiss(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    }
    document.addEventListener("keydown", dismiss);
    return () => document.removeEventListener("keydown", dismiss);
  }, [open]);

  return (
    <>
      <button
        ref={toggle}
        type="button"
        className="public-menu button button-secondary"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
        Menu
      </button>
      <nav
        id={id}
        className={`site-navigation${open ? " is-open" : ""}`}
        aria-label="Navigasi publik"
      >
        <div className="site-navigation-pages">
          <Link href="/#cara-kerja" onClick={() => setOpen(false)}>
            Cara kerja
          </Link>
          <Link
            href="/pricing"
            aria-current={path === "/pricing" ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            Paket
          </Link>
          <Link
            href="/faq"
            aria-current={path === "/faq" ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            FAQ
          </Link>
        </div>
        <div className="site-navigation-account">
          <Link href="/login" onClick={() => setOpen(false)}>
            Masuk
          </Link>
          <Link
            className="button button-primary"
            href="/signup"
            onClick={() => setOpen(false)}
          >
            Mulai gratis
          </Link>
        </div>
      </nav>
    </>
  );
}
