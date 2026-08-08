export const normalizeEnabledPreference = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback;
