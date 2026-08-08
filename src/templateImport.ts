export type TemplateAssetKind = "image" | "pdf" | "unsupported";

export function templateAssetKind(asset: { mimeType?: string; name?: string }): TemplateAssetKind {
  const mime = (asset.mimeType ?? "").toLowerCase();
  const name = (asset.name ?? "").toLowerCase();
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (mime.startsWith("image/") || /\.(png|jpe?g|webp|heic|heif)$/i.test(name)) return "image";
  return "unsupported";
}
