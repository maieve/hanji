import { useState, type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { PageRotation } from "../types";
import {normalizeCanvasExtent} from '../canvasExtent';
import { CANVAS_MAX_ZOOM, CANVAS_MIN_ZOOM, zoomNeedsPan } from "../zoomPolicy";
import { RotatedPage } from "./RotatedPage";

export function ZoomablePage({
  rotation = 0,
  style,
  canvasExtent,
  fingerDrawingEnabled=false,
  children,
}: {
  rotation?: PageRotation;
  style?: StyleProp<ViewStyle>;
  canvasExtent?: {columns:number;rows:number};
  fingerDrawingEnabled?:boolean;
  children: ReactNode;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [multiTouch, setMultiTouch] = useState(false);
  const extent=normalizeCanvasExtent(canvasExtent),extended=extent.columns>1||extent.rows>1;
  const layout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== size.width || height !== size.height)
      setSize({ width, height });
  };
  return (
    <View onLayout={layout} style={[s.frame, style]}>
      <ScrollView
        style={StyleSheet.absoluteFill}
        contentContainerStyle={s.content}
        minimumZoomScale={CANVAS_MIN_ZOOM}
        maximumZoomScale={CANVAS_MAX_ZOOM}
        bouncesZoom
        centerContent
        pinchGestureEnabled
        scrollEnabled={(extended&&!fingerDrawingEnabled) || multiTouch || zoomNeedsPan(zoom)}
        showsHorizontalScrollIndicator={extended || zoomNeedsPan(zoom)}
        showsVerticalScrollIndicator={extended || zoomNeedsPan(zoom)}
        scrollEventThrottle={32}
        onScroll={(event) => setZoom(event.nativeEvent.zoomScale ?? 1)}
        onTouchStart={(event) => {
          if (event.nativeEvent.touches.length >= 2) setMultiTouch(true);
        }}
        onTouchEnd={(event) => {
          if (event.nativeEvent.touches.length < 2) setMultiTouch(false);
        }}
      >
        <View style={{ width: size.width*extent.columns, height: size.height*extent.rows }}>
          {size.width > 0 && (
            <RotatedPage rotation={rotation} style={s.page}>
              {children}
            </RotatedPage>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  frame: { overflow: "hidden" },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  page: { width: "100%", height: "100%" },
});
