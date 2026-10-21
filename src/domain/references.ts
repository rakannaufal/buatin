import { z } from "zod";
export const referenceMetadataSchema = z
  .object({
    role: z
      .enum(["visual", "brand", "content", "requirements"])
      .default("visual"),
    note: z.string().trim().max(2000).default(""),
    sourceUrl: z
      .union([
        z
          .url()
          .max(2000)
          .refine(
            (value) => /^https?:\/\//i.test(value),
            "Gunakan URL HTTP/HTTPS.",
          ),
        z.literal(""),
      ])
      .default(""),
    rights: z.string().trim().max(500).default(""),
  })
  .strict();
export const referenceMime: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  md: "text/markdown",
};
export function detectReference(name: string, data: Buffer) {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  const mime = referenceMime[extension];
  if (!mime || !data.length) return null;
  const image = mime.startsWith("image/");
  const valid =
    extension === "png"
      ? data
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : ["jpg", "jpeg"].includes(extension)
        ? data[0] === 255 && data[1] === 216 && data[2] === 255
        : extension === "webp"
          ? data.toString("ascii", 0, 4) === "RIFF" &&
            data.toString("ascii", 8, 12) === "WEBP"
          : extension === "pdf"
            ? data.toString("ascii", 0, 5) === "%PDF-"
            : extension === "docx"
              ? data.toString("hex", 0, 4) === "504b0304"
              : true;
  return valid ? { mime, image } : null;
}
