import { requireNativeViewManager } from 'expo-modules-core';
import type { HanjiCanvasProps } from './HanjiCanvas.types';

type NativeEvent = { nativeEvent: { drawingData: string } };
const NativeCanvas = requireNativeViewManager('HanjiCanvas');

export function HanjiCanvas(props: HanjiCanvasProps) {
  return <NativeCanvas style={{ flex: 1 }} drawingData={props.drawingData} tool={props.tool} fingerDrawingEnabled={props.fingerDrawingEnabled ?? false} onDrawingChange={(e: NativeEvent) => props.onDrawingChange(e.nativeEvent.drawingData)} />;
}
