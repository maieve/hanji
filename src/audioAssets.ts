import { Directory, File, Paths } from "expo-file-system";

export function persistRecording(sourceUri: string): string {
  const directory = new Directory(Paths.document, "Hanji", "assets", "audio");
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
  const output = new File(
    directory,
    `recording-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.m4a`,
  );
  new File(sourceUri).copy(output);
  return output.uri;
}
