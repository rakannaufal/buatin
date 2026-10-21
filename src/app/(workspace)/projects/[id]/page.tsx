import { ProjectPage } from "@/features/projects/editor";
import { getEnv } from "@/server/config";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ProjectPage
      id={id}
      limits={{
        brief: getEnv().MAX_BRIEF_CHARS,
        upload: getEnv().MAX_BRIEF_UPLOAD_BYTES,
      }}
    />
  );
}
