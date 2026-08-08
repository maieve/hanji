import type { TemplateSpacing } from "./types";

export const templateSpacings: { value: TemplateSpacing; label: string }[] = [
  { value: "narrow", label: "좁게" },
  { value: "medium", label: "보통" },
  { value: "wide", label: "넓게" },
];
export function normalizeTemplateSpacing(value: unknown): TemplateSpacing {
  return value === "narrow" || value === "wide" ? value : "medium";
}
export function templateSpacingPoints(value: unknown) {
  const spacing = normalizeTemplateSpacing(value);
  return spacing === "narrow" ? 24 : spacing === "wide" ? 40 : 32;
}
