import type { Notebook } from "./types";

export function toggleNotebookSelection(selected: ReadonlySet<string>, id: string) {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function setNotebookSelectionFavorite(items: Notebook[], selected: ReadonlySet<string>, favorite: boolean, updatedAt: string) {
  return items.map((note) => selected.has(note.id) ? { ...note, favorite, updatedAt } : note);
}

export function deleteNotebookSelection(items: Notebook[], selected: ReadonlySet<string>) {
  return items.filter((note) => !selected.has(note.id));
}
