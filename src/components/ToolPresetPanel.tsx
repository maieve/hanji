import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { C } from "../theme";
import type { ToolSpec } from "../types";
import {
  isInkTool,
  moveToolPreset,
  removeToolPreset,
  renameToolPreset,
  replaceToolPreset,
  type ToolPreferences,
} from "../toolPreferences";

type Props = {
  visible: boolean;
  value: ToolPreferences;
  currentTool: ToolSpec;
  onChange: (value: ToolPreferences) => void;
  onSelect: (tool: ToolSpec) => void;
  onClose: () => void;
};
export function ToolPresetPanel({
  visible,
  value,
  currentTool,
  onChange,
  onSelect,
  onClose,
}: Props) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  useEffect(() => {
    if (visible)
      setDrafts(
        Object.fromEntries(value.presets.map((item) => [item.id, item.name])),
      );
  }, [visible]);
  const commitName = (id: string) => {
    const next = renameToolPreset(value, id, drafts[id] ?? "");
    onChange(next);
    setDrafts((current) => ({
      ...current,
      [id]: next.presets.find((item) => item.id === id)?.name ?? "",
    }));
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={s.scrim} onPress={onClose}>
        <Pressable style={s.card} onPress={() => undefined}>
          <View style={s.header}>
            <View>
              <Text style={s.eyebrow}>TOOL PRESETS</Text>
              <Text style={s.title}>내 도구 슬롯</Text>
            </View>
            <Pressable
              accessibilityLabel="도구 슬롯 관리 닫기"
              onPress={onClose}
              style={s.close}
            >
              <Ionicons name="close" size={21} color={C.ink} />
            </Pressable>
          </View>
          <Text style={s.help}>
            이름과 순서를 바꾸거나 현재 펜 설정으로 덮어쓸 수 있습니다. 최대
            12개까지 저장됩니다.
          </Text>
          <ScrollView contentContainerStyle={s.list}>
            {value.presets.map((preset, index) => (
              <View key={preset.id} style={s.row}>
                <Pressable
                  accessibilityLabel={`${preset.name} 선택`}
                  onPress={() => onSelect({ ...preset.tool })}
                  style={s.preview}
                >
                  <View
                    style={[
                      s.nib,
                      {
                        backgroundColor: preset.tool.color,
                        width: Math.min(22, Math.max(6, preset.tool.width + 5)),
                        height: Math.min(
                          22,
                          Math.max(6, preset.tool.width + 5),
                        ),
                        opacity: preset.tool.opacity ?? 1,
                      },
                    ]}
                  />
                </Pressable>
                <TextInput
                  accessibilityLabel={`${preset.name} 이름`}
                  value={drafts[preset.id] ?? preset.name}
                  maxLength={24}
                  onChangeText={(name) =>
                    setDrafts((current) => ({ ...current, [preset.id]: name }))
                  }
                  onBlur={() => commitName(preset.id)}
                  onSubmitEditing={() => commitName(preset.id)}
                  style={s.name}
                />
                <Pressable
                  accessibilityLabel={`${preset.name} 위로 이동`}
                  disabled={index === 0}
                  onPress={() => onChange(moveToolPreset(value, preset.id, -1))}
                  style={[s.action, index === 0 && s.disabled]}
                >
                  <Ionicons name="chevron-up" size={17} color={C.accent} />
                </Pressable>
                <Pressable
                  accessibilityLabel={`${preset.name} 아래로 이동`}
                  disabled={index === value.presets.length - 1}
                  onPress={() => onChange(moveToolPreset(value, preset.id, 1))}
                  style={[
                    s.action,
                    index === value.presets.length - 1 && s.disabled,
                  ]}
                >
                  <Ionicons name="chevron-down" size={17} color={C.accent} />
                </Pressable>
                <Pressable
                  accessibilityLabel={`${preset.name}을 현재 도구로 덮어쓰기`}
                  disabled={!isInkTool(currentTool.kind)}
                  onPress={() =>
                    onChange(replaceToolPreset(value, preset.id, currentTool))
                  }
                  style={[s.action, !isInkTool(currentTool.kind) && s.disabled]}
                >
                  <Ionicons name="save-outline" size={17} color={C.accent} />
                </Pressable>
                <Pressable
                  accessibilityLabel={`${preset.name} 삭제`}
                  onPress={() => onChange(removeToolPreset(value, preset.id))}
                  style={s.action}
                >
                  <Ionicons name="trash-outline" size={17} color={C.danger} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
          <View style={s.footer}>
            <Text style={s.count}>{value.presets.length} / 12</Text>
            <Pressable onPress={onClose} style={s.done}>
              <Text style={s.doneText}>완료</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const s = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: "rgba(20,28,24,.34)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "90%",
    maxWidth: 680,
    maxHeight: "78%",
    borderRadius: 24,
    padding: 20,
    backgroundColor: C.sidebar,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.3,
    color: C.accent,
  },
  title: { fontSize: 21, fontWeight: "800", color: C.ink, marginTop: 3 },
  close: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  help: {
    fontSize: 11,
    lineHeight: 17,
    color: C.muted,
    marginTop: 12,
    marginBottom: 12,
  },
  list: { gap: 8, paddingBottom: 8 },
  row: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 6,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
  },
  preview: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  nib: { borderRadius: 20 },
  name: {
    flex: 1,
    minWidth: 90,
    height: 38,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    color: C.ink,
    fontWeight: "700",
  },
  action: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.3 },
  footer: { flexDirection: "row", alignItems: "center", marginTop: 12 },
  count: { fontSize: 11, fontWeight: "800", color: C.muted },
  done: {
    marginLeft: "auto",
    height: 40,
    paddingHorizontal: 22,
    borderRadius: 12,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: { color: C.white, fontWeight: "900" },
});
