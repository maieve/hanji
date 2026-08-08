export const OCR_LOW_POWER_RETRY_MS = 30_000;
export type OcrJobDisposition = "run" | "defer" | "stale";

export function ocrJobDisposition(
  lowPowerMode: boolean,
  currentRevision: number | undefined,
  scheduledRevision: number,
): OcrJobDisposition {
  if (currentRevision !== scheduledRevision) return "stale";
  return lowPowerMode ? "defer" : "run";
}
