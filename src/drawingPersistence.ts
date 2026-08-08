import type { Notebook, Page } from "./types";

export type StoredPage = Omit<Page, "drawingData"> & { drawingRef?: string };
export type StoredNotebook = Omit<Notebook, "pages"> & { pages: StoredPage[] };

const signature = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

export function drawingBlobName(notebookId: string, pageId: string, drawingData: string) {
  const safe = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, "-");
  return `${safe(notebookId)}-${safe(pageId)}-${drawingData.length}-${signature(drawingData)}.drawing`;
}

export function libraryMetadata(items: Notebook[]): StoredNotebook[] {
  return items.map((note) => ({
    ...note,
    pages: note.pages.map(({ drawingData, ...page }) => ({
      ...page,
      ...(drawingData ? { drawingRef: drawingBlobName(note.id, page.id, drawingData) } : {}),
    })),
  }));
}
