import { notFound } from "next/navigation";
import { SupportPage } from "@/features/support/support";
export default async function Page({
  params,
}: {
  params: Promise<{ detail?: string[] }>;
}) {
  const { detail } = await params;
  if ((detail?.length ?? 0) > 1) notFound();
  return <SupportPage id={detail?.[0]} />;
}
