import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { C } from "../theme";
import type { Notebook } from "../types";

export function DocumentTabs({
  ids,
  items,
  activeId,
  referenceId,
  toolbarExpanded,
  onToggleToolbar,
  onSelect,
  onReference,
  onClose,
}: {
  ids: string[];
  items: Notebook[];
  activeId: string;
  referenceId?: string;
  toolbarExpanded: boolean;
  onToggleToolbar: () => void;
  onSelect: (id: string) => void;
  onReference: (id: string) => void;
  onClose: (id: string) => void;
}) {
  const lookup = new Map(items.map((n) => [n.id, n]));
  return (
    <View style={s.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={toolbarExpanded ? "도구 메뉴 접기" : "도구 메뉴 펼치기"}
        accessibilityState={{ expanded: toolbarExpanded }}
        hitSlop={8}
        onPress={onToggleToolbar}
        style={s.toolbarToggle}
      >
        <Ionicons name={toolbarExpanded ? "chevron-up" : "chevron-down"} size={18} color={C.accent} />
      </Pressable>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.list}
      >
        {ids.map((id) => {
          const note = lookup.get(id);
          if (!note) return null;
          const active = id === activeId,
            reference = id === referenceId;
          return (
            <Pressable
              key={id}
              onPress={() => onSelect(id)}
              style={[s.tab, active && s.active, reference && s.reference]}
            >
              <Ionicons
                name={
                  note.pages.some((p) => p.pdfUri)
                    ? "document-text-outline"
                    : "book-outline"
                }
                size={14}
                color={active ? C.accent : C.muted}
              />
              <Text
                numberOfLines={1}
                style={[s.label, active && s.activeLabel]}
              >
                {note.title}
              </Text>
              {!active && (
                <Pressable
                  accessibilityLabel={`${note.title} 참조 패널에서 열기`}
                  hitSlop={8}
                  onPress={() => onReference(id)}
                  style={s.close}
                >
                  <Ionicons
                    name="tablet-landscape-outline"
                    size={14}
                    color={reference ? C.accent : C.muted}
                  />
                </Pressable>
              )}
              <Pressable
                accessibilityLabel={`${note.title} 탭 닫기`}
                hitSlop={8}
                onPress={() => onClose(id)}
                style={s.close}
              >
                <Ionicons name="close" size={14} color={C.muted} />
              </Pressable>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  bar: {
    height: 38,
    backgroundColor: C.sidebar,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    flexDirection: "row",
    alignItems: "center",
  },
  toolbarToggle: { width: 42, height: 38, alignItems: "center", justifyContent: "center", borderRightWidth: 1, borderRightColor: C.line },
  list: { paddingLeft: 6, paddingRight: 12, alignItems: "flex-end", gap: 4 },
  tab: {
    height: 32,
    minWidth: 110,
    maxWidth: 230,
    paddingHorizontal: 10,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  active: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: C.line,
  },
  reference: { borderBottomWidth: 2, borderBottomColor: C.accent },
  label: { flex: 1, fontSize: 11, fontWeight: "700", color: C.muted },
  activeLabel: { color: C.ink },
  close: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
