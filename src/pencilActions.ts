export type PencilAction = "eraser" | "undo" | "redo" | "toolbar" | "none";

export const pencilActions: { value: PencilAction; label: string }[] = [
  { value: "eraser", label: "지우개 전환" },
  { value: "undo", label: "실행 취소" },
  { value: "redo", label: "다시 실행" },
  { value: "toolbar", label: "도구 막대 표시" },
  { value: "none", label: "사용 안 함" },
];

export function normalizePencilAction(
  value: unknown,
  fallback: PencilAction,
): PencilAction {
  return pencilActions.some((item) => item.value === value)
    ? (value as PencilAction)
    : fallback;
}
