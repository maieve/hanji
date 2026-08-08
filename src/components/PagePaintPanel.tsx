import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { pickColor } from "../colorPicker";
import { C } from "../theme";

const colors = [
  "#F4C7C3",
  "#F7D9A0",
  "#FFF1A8",
  "#BFE3C0",
  "#B8DDD8",
  "#BED4F4",
  "#D6C4EB",
  "#E1C7B8",
  "#202522",
];
const opacities = [0.12, 0.25, 0.5, 0.75, 1];

export function PagePaintPanel({
  visible,
  color,
  opacity,
  onChange,
  onClose,
}: {
  visible: boolean;
  color?: string;
  opacity: number;
  onChange: (color: string | undefined, opacity: number) => void;
  onClose: () => void;
}) {
  const active = color ?? "#FFF1A8";
  const custom = async () => {
    const next = await pickColor(active);
    if (/^#[0-9A-F]{6}$/i.test(next)) onChange(next, opacity || 0.25);
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
              <Text style={s.eyebrow}>PAGE PAINT</Text>
              <Text style={s.title}>페이지 색상 채우기</Text>
            </View>
            <Pressable
              accessibilityLabel="페이지 페인트 닫기"
              onPress={onClose}
              style={s.close}
            >
              <Ionicons name="close" size={21} color={C.ink} />
            </Pressable>
          </View>
          <Text style={s.help}>
            필기와 템플릿을 바꾸지 않는 비파괴 색상 레이어입니다. PDF 위에도
            적용할 수 있습니다.
          </Text>
          <View style={s.colors}>
            {colors.map((item) => (
              <Pressable
                key={item}
                accessibilityLabel={`페이지 채우기 색상 ${item}`}
                accessibilityState={{ selected: color === item }}
                onPress={() => onChange(item, opacity || 0.25)}
                style={[
                  s.color,
                  color === item && s.selected,
                  { backgroundColor: item },
                ]}
              />
            ))}
            <Pressable
              accessibilityLabel="시스템 컬러 피커로 페이지 색상 선택"
              onPress={() => void custom()}
              style={s.picker}
            >
              <Ionicons name="eyedrop-outline" size={19} color={C.accent} />
            </Pressable>
          </View>
          <Text style={s.label}>농도 {Math.round(opacity * 100)}%</Text>
          <View style={s.opacity}>
            {opacities.map((value) => (
              <Pressable
                key={value}
                accessibilityLabel={`페이지 채우기 농도 ${value * 100}%`}
                accessibilityState={{ selected: opacity === value }}
                onPress={() => onChange(active, value)}
                style={[s.opacityButton, opacity === value && s.opacityActive]}
              >
                <View
                  style={[
                    s.opacityPreview,
                    { backgroundColor: active, opacity: value },
                  ]}
                />
                <Text
                  style={[
                    s.opacityText,
                    opacity === value && { color: C.white },
                  ]}
                >
                  {value * 100}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={s.actions}>
            <Pressable
              accessibilityLabel="페이지 색상 채우기 제거"
              onPress={() => onChange(undefined, 0)}
              style={s.clear}
            >
              <Ionicons name="trash-outline" size={17} color={C.danger} />
              <Text style={s.clearText}>채우기 제거</Text>
            </Pressable>
            <Pressable accessibilityLabel="페이지 색상 채우기 완료" onPress={onClose} style={s.done}>
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
    backgroundColor: "rgba(20,28,24,.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "86%",
    maxWidth: 520,
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
  title: { fontSize: 20, fontWeight: "800", color: C.ink, marginTop: 3 },
  close: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  help: { fontSize: 11, lineHeight: 17, color: C.muted, marginTop: 14 },
  colors: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16 },
  color: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.white,
  },
  selected: {
    outlineWidth: 2,
    outlineColor: C.accent,
    outlineOffset: 2,
  } as never,
  picker: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 11, fontWeight: "900", color: C.accent, marginTop: 20 },
  opacity: { height: 52, flexDirection: "row", gap: 7, marginTop: 8 },
  opacityButton: {
    flex: 1,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  opacityActive: { backgroundColor: C.accent, borderColor: C.accent },
  opacityPreview: {
    width: 24,
    height: 11,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,.1)",
  },
  opacityText: { fontSize: 9, fontWeight: "800", color: C.muted, marginTop: 3 },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  clear: {
    height: 40,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6C9C4",
    backgroundColor: C.dangerSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  clearText: { fontSize: 11, fontWeight: "800", color: C.danger },
  done: {
    height: 40,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: { fontSize: 12, fontWeight: "900", color: C.white },
});
