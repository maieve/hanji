import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { C } from "../theme";
import type { PdfOutlineItem } from "./DocumentCanvas";

export function PdfOutlinePanel({
  visible,
  items,
  onSelect,
  onClose,
}: {
  visible: boolean;
  items: PdfOutlineItem[];
  onSelect: (page: number) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={onClose}
    >
      <View style={s.root}>
        <View style={s.header}>
          <View>
            <Text style={s.eyebrow}>PDF NAVIGATION</Text>
            <Text style={s.title}>목차</Text>
          </View>
          <Pressable
            accessibilityLabel="닫기"
            onPress={onClose}
            style={s.close}
          >
            <Ionicons name="close" size={24} color={C.ink} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={s.list}>
          {items.length ? (
            items.map((item, index) => (
              <Pressable
                key={`${item.pageIndex}-${index}`}
                onPress={() => {
                  onSelect(item.pageIndex);
                  onClose();
                }}
                style={[s.row, { paddingLeft: 16 + item.depth * 18 }]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={17}
                  color={C.accent}
                />
                <Text numberOfLines={2} style={s.label}>
                  {item.title}
                </Text>
                <Text style={s.page}>{item.pageIndex + 1}</Text>
              </Pressable>
            ))
          ) : (
            <View style={s.empty}>
              <Ionicons name="list-outline" size={38} color={C.muted} />
              <Text style={s.emptyTitle}>목차가 없는 PDF입니다</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.sidebar },
  header: {
    height: 82,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: C.accent,
  },
  title: { fontSize: 24, fontWeight: "800", color: C.ink },
  close: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { padding: 18, gap: 6 },
  row: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.white,
    borderRadius: 11,
    paddingRight: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: C.line,
  },
  label: { flex: 1, fontWeight: "700", color: C.ink },
  page: { fontSize: 12, fontWeight: "800", color: C.muted },
  empty: { height: 320, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: C.ink, marginTop: 12 },
});
