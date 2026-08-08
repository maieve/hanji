export type ResolvedPencilPreference = 'eraser' | 'previous' | 'toolbar' | 'none';

export function resolvePencilPreferredAction(value?: string): ResolvedPencilPreference {
  const normalized = value?.toLowerCase() ?? '';
  if (normalized.includes('switcheraser')) return 'eraser';
  if (normalized.includes('switchprevious')) return 'previous';
  if (normalized.includes('palette') || normalized.includes('inkattributes')) return 'toolbar';
  return 'none';
}
