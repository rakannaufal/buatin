"use client";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
export function ModeControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: "auto" | "manual";
  onChange: (value: "auto" | "manual") => void;
}) {
  return (
    <fieldset className="mode-control">
      <legend className="sr-only">Mode {label}</legend>
      {(["auto", "manual"] as const).map((mode) => (
        <label key={mode} className={value === mode ? "mode-selected" : ""}>
          <input
            type="radio"
            name={`mode-${label}`}
            value={mode}
            checked={value === mode}
            onChange={() => onChange(mode)}
          />
          <span>{mode === "auto" ? "Otomatis" : "Manual"}</span>
        </label>
      ))}
    </fieldset>
  );
}
export function PreferenceSection({
  title,
  description,
  summary,
  children,
  open = false,
}: {
  title: string;
  description: string;
  summary: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="preference-section" open={open || undefined}>
      <summary>
        <div>
          <h2>{title}</h2>
          <p>{summary}</p>
        </div>
        <ChevronDown size={18} aria-hidden />
      </summary>
      <div className="preference-body">
        <p className="field-help">{description}</p>
        {children}
      </div>
    </details>
  );
}
