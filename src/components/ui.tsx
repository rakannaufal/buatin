"use client";
import { Dialog } from "radix-ui";
import {
  LoaderCircle,
  X,
  AlertCircle,
  FileText,
  ArrowUpRight,
} from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes, ReactNode } from "react";
export function cn(...values: ClassValue[]) {
  return twMerge(clsx(values));
}
const button = cva("button", {
  variants: {
    variant: {
      primary: "button-primary",
      secondary: "button-secondary",
      ghost: "button-ghost",
      danger: "button-danger",
    },
  },
  defaultVariants: { variant: "primary" },
});
export function Button({
  variant,
  className,
  busy,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button> & { busy?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={button({ variant, className })}
    >
      {busy && <LoaderCircle size={16} className="spin" aria-hidden />}
      {children}
    </button>
  );
}
export function Notice({
  children,
  tone = "warning",
}: {
  children: ReactNode;
  tone?: "warning" | "error" | "info";
}) {
  return (
    <div
      className={`notice notice-${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <AlertCircle size={18} aria-hidden />
      <div>{children}</div>
    </div>
  );
}
export function Loading({
  label = "Memuat ruang kerja...",
}: {
  label?: string;
}) {
  return (
    <div className="loading-region" role="status">
      <LoaderCircle size={22} className="spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
export function Folio({ small = false }: { small?: boolean }) {
  return (
    <svg
      viewBox="0 0 120 130"
      fill="none"
      className={small ? "folio-small" : "folio"}
      aria-hidden="true"
    >
      <path
        d="M26 15h66v92H26z"
        fill="var(--accent-wash)"
        stroke="var(--accent)"
        strokeWidth="1.5"
        transform="rotate(8 59 61)"
      />
      <path
        d="M17 23h66v92H17z"
        fill="var(--surface)"
        stroke="var(--accent)"
        strokeWidth="1.5"
      />
      <path
        d="M28 42h31m-31 10h43m-43 10h43m-43 10h28m-28 25h14"
        stroke="var(--accent)"
        strokeWidth="1.5"
      />
      <path d="m68 101 5 5 13-14" stroke="var(--accent)" strokeWidth="2.5" />
    </svg>
  );
}
export function Modal({
  trigger,
  title,
  description,
  children,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title className="dialog-title">{title}</Dialog.Title>
          <Dialog.Description className="muted">
            {description}
          </Dialog.Description>
          <div className="dialog-body">{children}</div>
          <Dialog.Close
            className="icon-button dialog-close"
            aria-label="Tutup dialog"
          >
            <X size={20} />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Empty({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Folio />
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      {children}
    </div>
  );
}
export function FileMark() {
  return <FileText size={18} aria-hidden />;
}
export { ArrowUpRight };
