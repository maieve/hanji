import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { HanjiCanvasProps } from './HanjiCanvas.types';

type Stroke = { d: string; color: string; width: number; opacity: number };
const decode = (raw: string): Stroke[] => { try { return raw ? JSON.parse(raw) : []; } catch { return []; } };

export function HanjiCanvas({ drawingData, tool, onDrawingChange }: HanjiCanvasProps) {
  const initial = useMemo(() => decode(drawingData), []);
  const [strokes, setStrokes] = useState<Stroke[]>(initial);
  const live = useRef<Stroke | null>(null);
  const [, redraw] = useState(0);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: ({ nativeEvent }) => {
      if (tool.kind === 'eraser') return;
      live.current = { d: `M ${nativeEvent.locationX} ${nativeEvent.locationY}`, color: tool.color, width: tool.width, opacity: tool.opacity ?? (tool.kind === 'marker' ? 0.35 : tool.kind === 'watercolor' ? 0.45 : tool.kind === 'pencil' ? 0.65 : tool.kind === 'crayon' ? 0.85 : 1) };
      redraw(v => v + 1);
    },
    onPanResponderMove: ({ nativeEvent }) => {
      if (!live.current) return;
      live.current.d += ` L ${nativeEvent.locationX} ${nativeEvent.locationY}`;
      redraw(v => v + 1);
    },
    onPanResponderRelease: () => {
      if (tool.kind === 'eraser') {
        const next = strokes.slice(0, -1); setStrokes(next); onDrawingChange(JSON.stringify(next)); return;
      }
      if (!live.current) return;
      const next = [...strokes, live.current]; live.current = null; setStrokes(next); onDrawingChange(JSON.stringify(next));
    },
  }), [onDrawingChange, strokes, tool]);
  return <View style={s.fill} {...responder.panHandlers}><Svg width="100%" height="100%">{[...strokes, ...(live.current ? [live.current] : [])].map((x, i) => <Path key={i} d={x.d} stroke={x.color} strokeWidth={x.width} opacity={x.opacity} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}</Svg></View>;
}
const s = StyleSheet.create({ fill: { ...StyleSheet.absoluteFill } });

