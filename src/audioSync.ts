import type { AudioSession, StrokeSync } from "./types";

export type AudioStrokeMatch = { session: AudioSession; stroke: StrokeSync };

export function findAudioStroke(
  sessions: AudioSession[],
  pageId: string,
  createdAt: number,
): AudioStrokeMatch | undefined {
  let best: AudioStrokeMatch | undefined;
  let distance = Number.POSITIVE_INFINITY;
  for (const session of sessions) {
    for (const stroke of session.strokes) {
      if (stroke.pageId !== pageId) continue;
      const nextDistance = Math.abs(stroke.createdAt - createdAt);
      if (nextDistance < distance) {
        best = { session, stroke };
        distance = nextDistance;
      }
    }
  }
  return best;
}
