import type { ReactNode } from "react";
import { Artwork, Brand } from "./brand";

export function PublicState({
  title,
  children,
  illustration,
}: {
  title: string;
  children: ReactNode;
  illustration: "public-error" | "public-not-found";
}) {
  return (
    <div className="public-theme state-page">
      <header>
        <Brand />
      </header>
      <main>
        <Artwork name={illustration} eager />
        <h1>{title}</h1>
        {children}
      </main>
    </div>
  );
}
