import { notFound } from "next/navigation";
import { adminSections, type AdminSection } from "@/domain/admin";
import { AdminSectionPage } from "@/features/admin/sections";
export default async function Page({
  params,
}: {
  params: Promise<{ section: string; detail?: string[] }>;
}) {
  const { section, detail } = await params;
  if (
    !(adminSections as readonly string[]).includes(section) ||
    (detail?.length ?? 0) > 1
  )
    notFound();
  return (
    <AdminSectionPage section={section as AdminSection} id={detail?.[0]} />
  );
}
