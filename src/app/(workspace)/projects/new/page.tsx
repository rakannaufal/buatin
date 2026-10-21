import { ProjectEditor } from "@/features/projects/editor";
import { getEnv } from "@/server/config";
import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { requireFeature } from "@/server/entitlements";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const { preset } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  let initialPreset;
  if (preset && session) {
    await requireFeature(session.user.id, "presets");
    initialPreset =
      (await db.briefPreset.findFirst({
        where: { id: preset, userId: session.user.id },
        select: { name: true, brief: true, webType: true, preferences: true },
      })) ?? undefined;
  }
  return (
    <ProjectEditor
      initialPreset={initialPreset}
      limits={{
        brief: getEnv().MAX_BRIEF_CHARS,
        upload: getEnv().MAX_BRIEF_UPLOAD_BYTES,
      }}
    />
  );
}
