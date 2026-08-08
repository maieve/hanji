import { requireNativeViewManager } from 'expo-modules-core';
import type { ToolSpec } from '../types';
export type PdfOutlineItem = {
  title: string;
  pageIndex: number;
  depth: number;
};
type Props = {
  pdfUri?: string;
  pageIndex: number;
  drawingData: string;
  tool: ToolSpec;
  fingerDrawingEnabled?: boolean;
  zoomWindowEnabled?: boolean;
  interactionEnabled?: boolean;
  replayCutoff?: number;
  selectionAction?: { nonce: number; type: 'delete' | 'recolor' | 'text' | 'clear'; color?: string };
  undoSignal?: number;
  redoSignal?: number;
  onDrawingChange: (v: string) => void;
  onPageCount?: (n: number) => void;
  onPdfOutline?: (items: PdfOutlineItem[]) => void;
  onPdfLink?: (link: { pageIndex?: number; url?: string }) => void;
  onPencilDoubleTap?: () => void;
  onPencilSqueeze?: () => void;
  onEraserEnded?: () => void;
  onStrokeAdded?: (createdAt: number) => void;
  onStrokeTapped?: (createdAt: number) => void;
  onSelectionChange?: (selection: { count: number; x?: number; y?: number; width?: number; height?: number }) => void;
  onSelectionText?: (result: { text: string; x: number; y: number; width: number; height: number }) => void;
  onCircleLasso?: () => void;
};
type E<T> = { nativeEvent: T };
const Native = requireNativeViewManager('HanjiDocumentCanvas');
export function DocumentCanvas(p: Props) {
  return (
    <Native
      style={{ flex: 1 }}
      pdfUri={p.pdfUri}
      pageIndex={p.pageIndex}
      drawingData={p.drawingData}
      tool={p.tool}
      fingerDrawingEnabled={p.fingerDrawingEnabled ?? false}
      zoomWindowEnabled={p.zoomWindowEnabled ?? false}
      interactionEnabled={p.interactionEnabled ?? true}
      replayCutoff={p.replayCutoff}
      selectionAction={p.selectionAction}
      undoSignal={p.undoSignal ?? 0}
      redoSignal={p.redoSignal ?? 0}
      onDrawingChange={(e: E<{ drawingData: string }>) => p.onDrawingChange(e.nativeEvent.drawingData)}
      onPageCount={(e: E<{ count: number }>) => p.onPageCount?.(e.nativeEvent.count)}
      onPdfOutline={(e: E<{ items: PdfOutlineItem[] }>) => p.onPdfOutline?.(e.nativeEvent.items)}
      onPdfLink={(e: E<{ pageIndex?: number; url?: string }>) => p.onPdfLink?.(e.nativeEvent)}
      onPencilDoubleTap={() => p.onPencilDoubleTap?.()}
      onPencilSqueeze={() => p.onPencilSqueeze?.()}
      onEraserEnded={() => {
        if (p.onEraserEnded) p.onEraserEnded();
        else if (p.tool.kind === 'eraser' && (p.tool.eraserAutoReturn ?? true)) p.onPencilDoubleTap?.();
      }}
      onStrokeAdded={(e: E<{ createdAt: number }>) => p.onStrokeAdded?.(e.nativeEvent.createdAt)}
      onStrokeTapped={(e: E<{ createdAt: number }>) => p.onStrokeTapped?.(e.nativeEvent.createdAt)}
      onSelectionChange={(e: E<{ count: number; x?: number; y?: number; width?: number; height?: number }>) => p.onSelectionChange?.(e.nativeEvent)}
      onSelectionText={(e: E<{ text: string; x: number; y: number; width: number; height: number }>) => p.onSelectionText?.(e.nativeEvent)}
      onCircleLasso={() => p.onCircleLasso?.()}
    />
  );
}
