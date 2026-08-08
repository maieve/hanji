export type AppColorScheme = "system" | "light" | "dark";

export const appColorSchemes: readonly AppColorScheme[] = [
  "system",
  "light",
  "dark",
];

export function normalizeAppColorScheme(value: unknown): AppColorScheme {
  return appColorSchemes.includes(value as AppColorScheme)
    ? (value as AppColorScheme)
    : "system";
}

export function appearanceOverride(value: AppColorScheme): "light" | "dark" | null {
  return value === "system" ? null : value;
}
