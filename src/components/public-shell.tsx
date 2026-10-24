import { connection } from "next/server";
import { siteSettings } from "@/server/admin/policies";
import { PublicFrame } from "./public-frame";

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
    <PublicFrame path={path} announcement={site.announcement}>
      {children}
    </PublicFrame>
  );
}
