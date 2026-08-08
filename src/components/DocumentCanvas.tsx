import { requireNativeViewManager } from 'expo-modules-core';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { DrawingViewport, NativeStroke, StrokeEvent, ToolSpec } from '../types';
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
  twoFingerUndoEnabled?: boolean;
  threeFingerRedoEnabled?: boolean;
  zoomWindowEnabled?: boolean;
  interactionEnabled?: boolean;
  replayCutoff?: number;
  selectionAction?: { nonce: number; type: 'delete' | 'recolor' | 'text' | 'flashcard' | 'imageFlashcard' | 'clip' | 'clear' | 'copy' | 'cut' | 'paste' | 'duplicate' | 'shrink' | 'grow' | 'rotate'; color?: string };
  selectedElementCount?:number;
  undoSignal?: number;
  redoSignal?: number;
  onDrawingChange: (v: string) => void;
  onCanvasMetrics?: (metrics: DrawingViewport) => void;
  onPageCount?: (n: number) => void;
  onPdfOutline?: (items: PdfOutlineItem[]) => void;
  onPdfLink?: (link: { pageIndex?: number; url?: string }) => void;
  onPdfExcerpt?: (excerpt:{text:string;pageIndex:number})=>void;
  onPencilDoubleTap?: (preferredAction?: string) => void;
  onPencilSqueeze?: (phase: 'began' | 'ended', preferredAction?: string) => void;
  onEraserEnded?: () => void;
  onStrokeAdded?: (event: StrokeEvent) => void;
  onStrokeTapped?: (event: StrokeEvent) => void;
  onSelectionChange?: (selection: { count: number; x?: number; y?: number; width?: number; height?: number;moving?:boolean;moveCancelled?:boolean }) => void;
  onSelectionText?: (result: { text: string; x: number; y: number; width: number; height: number }) => void;
  onSelectionClip?: (result: { uri: string; x: number; y: number; width: number; height: number }) => void;
  onCircleLasso?: () => void;
};
type E<T> = { nativeEvent: T };
export type DocumentCanvasHandle={
  getStrokes:()=>Promise<NativeStroke[]>;
  replaceStrokes:(ids:string[],replacements:NativeStroke[])=>Promise<boolean>;
  hitTest:(point:{x:number;y:number},radius:number)=>Promise<string|null>;
};
const Native = requireNativeViewManager('HanjiDocumentCanvas') as React.ComponentType<any>;
export const DocumentCanvas = forwardRef<DocumentCanvasHandle,Props>(function DocumentCanvas(p,ref) {
  const nativeRef=useRef<DocumentCanvasHandle>(null);
  useImperativeHandle(ref,()=>({
    getStrokes:()=>nativeRef.current?.getStrokes()??Promise.resolve([]),
    replaceStrokes:(ids,replacements)=>nativeRef.current?.replaceStrokes(ids,replacements)??Promise.resolve(false),
    hitTest:(point,radius)=>nativeRef.current?.hitTest(point,radius)??Promise.resolve(null),
  }),[]);
  return (
    <Native
      ref={nativeRef}
      style={{ flex: 1 }}
      pdfUri={p.pdfUri}
      pageIndex={p.pageIndex}
      drawingData={p.drawingData}
      tool={p.tool}
      fingerDrawingEnabled={p.fingerDrawingEnabled ?? false}
      twoFingerUndoEnabled={p.twoFingerUndoEnabled ?? true}
      threeFingerRedoEnabled={p.threeFingerRedoEnabled ?? true}
      zoomWindowEnabled={p.zoomWindowEnabled ?? false}
      interactionEnabled={p.interactionEnabled ?? true}
      replayCutoff={p.replayCutoff}
      selectionAction={p.selectionAction}
      selectedElementCount={p.selectedElementCount??0}
      undoSignal={p.undoSignal ?? 0}
      redoSignal={p.redoSignal ?? 0}
      onDrawingChange={(e: E<{ drawingData: string }>) => p.onDrawingChange(e.nativeEvent.drawingData)}
      onCanvasMetrics={(e: E<DrawingViewport>) => p.onCanvasMetrics?.(e.nativeEvent)}
      onPageCount={(e: E<{ count: number }>) => p.onPageCount?.(e.nativeEvent.count)}
      onPdfOutline={(e: E<{ items: PdfOutlineItem[] }>) => p.onPdfOutline?.(e.nativeEvent.items)}
      onPdfLink={(e: E<{ pageIndex?: number; url?: string }>) => p.onPdfLink?.(e.nativeEvent)}
      onPdfExcerpt={(e:E<{text:string;pageIndex:number}>)=>p.onPdfExcerpt?.(e.nativeEvent)}
      onPencilDoubleTap={(e:E<{preferredAction?:string}>) => p.onPencilDoubleTap?.(e.nativeEvent.preferredAction)}
      onPencilSqueeze={(e:E<{phase?:'began'|'ended';preferredAction?:string}>) => p.onPencilSqueeze?.(e.nativeEvent.phase ?? 'began',e.nativeEvent.preferredAction)}
      onEraserEnded={() => {
        if (p.tool.kind === 'eraser' && (p.tool.eraserAutoReturn ?? true)) p.onEraserEnded?.();
      }}
      onStrokeAdded={(e: E<StrokeEvent>) => p.onStrokeAdded?.(e.nativeEvent)}
      onStrokeTapped={(e: E<StrokeEvent>) => p.onStrokeTapped?.(e.nativeEvent)}
      onSelectionChange={(e: E<{ count: number; x?: number; y?: number; width?: number; height?: number;moving?:boolean;moveCancelled?:boolean }>) => p.onSelectionChange?.(e.nativeEvent)}
      onSelectionText={(e: E<{ text: string; x: number; y: number; width: number; height: number }>) => p.onSelectionText?.(e.nativeEvent)}
      onSelectionClip={(e: E<{ uri: string; x: number; y: number; width: number; height: number }>) => p.onSelectionClip?.(e.nativeEvent)}
      onCircleLasso={() => p.onCircleLasso?.()}
    />
  );
});
