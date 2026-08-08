import { Directory, File, Paths } from "expo-file-system";

const cleanBaseName = (name: string) =>
  name
    .replace(/\.pdf$/i, "")
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "document";

export function persistImportedPdf(sourceUri: string, originalName: string): string {
  const directory = new Directory(Paths.document, "Hanji", "assets", "pdfs");
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
  const output = new File(
    directory,
    `${cleanBaseName(originalName)}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`,
  );
  new File(sourceUri).copy(output);
  return output.uri;
}
