import type { Notebook } from "./types";

export type SearchIndexRow = {
  key: string;
  notebookId: string;
  pageId: string;
  pageIndex: number;
  title: string;
  tags: string;
  body: string;
  fingerprint: string;
};

export function searchIndexRows(items: Notebook[]): SearchIndexRow[] {
  return items.flatMap((note) => {
    const transcript = (note.audioSessions ?? [])
      .map((session) => session.transcript ?? "")
      .join(" ");
    return note.pages.map((page, pageIndex) => {
      const elements = (page.elements ?? [])
        .filter((element) => element.kind === "text")
        .map((element) => element.text)
        .join(" ");
      const row = {
        key: `${note.id}:${page.id}`,
        notebookId: note.id,
        pageId: page.id,
        pageIndex,
        title: note.title,
        tags: note.tags.join(" "),
        body: [page.ocrText ?? "", elements, pageIndex === 0 ? transcript : ""]
          .filter(Boolean)
          .join(" ")
          .trim(),
      };
      return { ...row, fingerprint: JSON.stringify(row) };
    });
  });
}
