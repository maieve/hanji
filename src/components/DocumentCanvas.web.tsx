import { StyleSheet, View } from 'react-native';
import type { ToolSpec } from '../types';
import { HanjiCanvas } from './HanjiCanvas';
import { PdfBackground } from './PdfBackground';
type Props = {
  pdfUri?: string;
  pageIndex: number;
  drawingData: string;
  tool: ToolSpec;
  zoomWindowEnabled?: boolean;
  interactionEnabled?: boolean;
  replayCutoff?: number;
  selectionAction?: { nonce: number; type: 'delete' | 'recolor' | 'text' | 'clip' | 'clear' | 'copy' | 'cut' | 'paste' | 'duplicate' | 'shrink' | 'grow' | 'rotate'; color?: string };
  onDrawingChange: (v: string) => void;
  onPageCount?: (n: number) => void;
  onPdfOutline?: (items: []) => void;
  onPdfLink?: (link: { pageIndex?: number; url?: string }) => void;
  onPdfExcerpt?: (excerpt:{text:string;pageIndex:number})=>void;
  onPencilDoubleTap?: () => void;
  onPencilSqueeze?: () => void;
  onEraserEnded?: () => void;
  onStrokeAdded?: (createdAt: number) => void;
  onSelectionChange?: (selection: { count: number; x?: number; y?: number; width?: number; height?: number }) => void;
  onSelectionText?: (result: { text: string; x: number; y: number; width: number; height: number }) => void;
  onSelectionClip?: (result: { uri: string; x: number; y: number; width: number; height: number }) => void;
  onCircleLasso?: () => void;
};
export function DocumentCanvas(p: Props) {
  return (
    <View pointerEvents={p.interactionEnabled === false ? 'none' : 'auto'} style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      <View
        style={[
          StyleSheet.absoluteFill,
          p.zoomWindowEnabled &&
            ({
              transform: [{ scale: 2.5 }],
              transformOrigin: 'top left',
            } as never),
        ]}
      >
        <PdfBackground uri={p.pdfUri} />
        <HanjiCanvas
          drawingData={p.drawingData}
          tool={p.tool}
          onDrawingChange={(v) => {
            p.onDrawingChange(v);
            p.onStrokeAdded?.(Date.now() / 1000);
          }}
        />
      </View>
    </View>
  );
}
