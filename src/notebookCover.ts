export const notebookCoverColors = [
  "#FFFDF8",
  "#E8F2ED",
  "#EAF0FA",
  "#F8EBDD",
  "#F2E8F5",
  "#252B29",
] as const;
export function normalizeNotebookCoverColor(value: unknown) {
  return typeof value === "string" &&
    notebookCoverColors.includes(value as (typeof notebookCoverColors)[number])
    ? value
    : notebookCoverColors[0];
}
