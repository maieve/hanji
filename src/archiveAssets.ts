import type { Notebook } from "./types";

export type ArchiveAssetKind = "cover" | "pdf" | "template" | "image" | "flashcard" | "audio";
export type ArchiveAssetReference = { uri: string; kind: ArchiveAssetKind };

export function notebookAssetReferences(items: Notebook[]): ArchiveAssetReference[] {
  const result = new Map<string, ArchiveAssetReference>();
  const add = (uri: string | undefined, kind: ArchiveAssetKind) => {
    if (uri && !result.has(uri)) result.set(uri, { uri, kind });
  };
  for (const note of items) {
    add(note.coverUri, "cover");
    for (const page of note.pages) {
      add(page.pdfUri, "pdf");
      add(page.customTemplateUri, "template");
      for (const element of page.elements ?? []) if (element.kind === "image") add(element.uri, "image");
    }
    for (const card of note.flashcards ?? []) {
      add(card.questionImageUri, "flashcard");
      add(card.answerImageUri, "flashcard");
    }
    for (const audio of note.audioSessions ?? []) add(audio.uri, "audio");
  }
  return [...result.values()];
}
