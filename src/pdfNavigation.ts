import type { Page } from "./types";

/** Maps a PDFKit document page index back to its page in the notebook. */
export function resolvePdfPageIndex(
  pages: Page[],
  sourcePage: Page,
  pdfPageIndex: number,
): number | undefined {
  if (!sourcePage.pdfUri || !Number.isInteger(pdfPageIndex) || pdfPageIndex < 0)
    return undefined;
  const index = pages.findIndex(
    (page) =>
      page.pdfUri === sourcePage.pdfUri && page.pdfPageIndex === pdfPageIndex,
  );
  return index >= 0 ? index : undefined;
}
