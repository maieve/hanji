import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { C } from "../theme";
import type { Notebook, ToolSpec } from "../types";
import { DocumentCanvas } from "./DocumentCanvas";
import { ElementsLayer } from "./ElementsLayer";
import { Paper } from "./Paper";
import { ZoomablePage } from "./ZoomablePage";
import { clampReferencePage } from "../referenceDocument";
const readTool: ToolSpec = {
  kind: "pen",
  color: "#20201E",
  width: 2,
  opacity: 1,
};
export function ReferencePanel({
  notebook,
  initialIndex = 0,
  onPageChange,
  onClose,
}: {
  notebook: Notebook;
  initialIndex?: number;
  onPageChange?: (index: number) => void;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const { width } = useWindowDimensions();
  useEffect(
    () => setIndex(clampReferencePage(initialIndex, notebook.pages.length)),
    [initialIndex, notebook.id, notebook.pages.length],
  );
  const safeIndex = clampReferencePage(index, notebook.pages.length),
    page = notebook.pages[safeIndex];
  if (!page) return null;
  const move = (delta: number) => {
    const next = clampReferencePage(safeIndex + delta, notebook.pages.length);
    setIndex(next);
    onPageChange?.(next);
  };
  return (
    <View style={[s.panel, { width: width < 760 ? "92%" : "44%" }]}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.eyebrow}>REFERENCE · 읽기 전용</Text>
          <Text numberOfLines={1} style={s.title}>
            {notebook.title}
          </Text>
        </View>
        <Text style={s.page}>
          {safeIndex + 1}/{notebook.pages.length}
        </Text>
        <Pressable
          accessibilityLabel="이전 참조 페이지"
          disabled={safeIndex === 0}
          onPress={() => move(-1)}
          style={s.action}
        >
          <Ionicons
            name="chevron-back"
            size={19}
            color={safeIndex === 0 ? C.line : C.accent}
          />
        </Pressable>
        <Pressable
          accessibilityLabel="다음 참조 페이지"
          disabled={safeIndex >= notebook.pages.length - 1}
          onPress={() => move(1)}
          style={s.action}
        >
          <Ionicons
            name="chevron-forward"
            size={19}
            color={safeIndex >= notebook.pages.length - 1 ? C.line : C.accent}
          />
        </Pressable>
        <Pressable
          accessibilityLabel="참조 패널 닫기"
          onPress={onClose}
          style={s.action}
        >
          <Ionicons name="close" size={20} color={C.ink} />
        </Pressable>
      </View>
      <View style={s.body}>
        <ZoomablePage
          rotation={page.rotation}
          canvasExtent={page.canvasExtent}
          style={s.paper}
        >
          <Paper
            template={page.template}
            templateSpacing={page.templateSpacing}
            customTemplateUri={page.customTemplateUri}
            backgroundColor={page.backgroundColor}
            backgroundColor2={page.backgroundColor2}
            backgroundGradientDirection={page.backgroundGradientDirection}
            backgroundOpacity={page.backgroundOpacity}
          />
          <DocumentCanvas
            pdfUri={page.pdfUri}
            pageIndex={page.pdfPageIndex ?? safeIndex}
            drawingData={page.drawingData}
            tool={readTool}
            interactionEnabled={false}
            onDrawingChange={() => undefined}
          />
          <ElementsLayer
            elements={page.elements ?? []}
            editable={false}
            onChange={() => undefined}
          />
        </ZoomablePage>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  panel: {
    position: "absolute",
    right: 14,
    top: 14,
    bottom: 14,
    width: "44%",
    zIndex: 24,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.sidebar,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
  },
  header: {
    height: 62,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  eyebrow: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
    color: C.accent,
  },
  title: { fontSize: 14, fontWeight: "800", color: C.ink, marginTop: 2 },
  page: { fontSize: 10, fontWeight: "800", color: C.muted },
  action: {
    width: 32,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  paper: {
    width: "100%",
    maxWidth: 650,
    aspectRatio: 1.414,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
  },
});
