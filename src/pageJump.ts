export function pageJumpIndex(value: string, pageCount: number): number | undefined {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed) || pageCount < 1) return undefined;
  const page = Number(trimmed);
  if (!Number.isSafeInteger(page) || page < 1 || page > pageCount) return undefined;
  return page - 1;
}
