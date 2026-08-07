import type { ToolSpec } from '../types';

export type HanjiCanvasProps = {
  drawingData: string;
  tool: ToolSpec;
  fingerDrawingEnabled?: boolean;
  onDrawingChange: (data: string) => void;
};
