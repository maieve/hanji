import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { C } from "../theme";

type Action = {
  key: "pdf" | "png" | "hanji";
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => Promise<unknown>;
};
export function ExportPanel({
  visible,
  onClose,
  onPdf,
  onPng,
  onHanji,
}: {
  visible: boolean;
  onClose: () => void;
  onPdf: () => Promise<unknown>;
  onPng: () => Promise<unknown>;
  onHanji: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState<string>();
  const run = async (action: Action) => {
    if (busy) return;
    setBusy(action.key);
    try {
      await action.onPress();
      onClose();
    } catch (error) {
      Alert.alert(
        "내보내기 실패",
        error instanceof Error ? error.message : "파일을 만들 수 없습니다.",
      );
    } finally {
      setBusy(undefined);
    }
  };
  const actions: Action[] = [
    {
      key: "pdf",
      title: "노트 PDF",
      description: "모든 페이지를 배경·필기·요소와 함께 한 PDF로 만듭니다.",
      icon: "document-text-outline",
      onPress: onPdf,
    },
    {
      key: "png",
      title: "현재 페이지 PNG",
      description: "현재 페이지를 3배율 이미지로 내보냅니다.",
      icon: "image-outline",
      onPress: onPng,
    },
    {
      key: "hanji",
      title: Platform.OS === "web" ? "원본 JSON" : "원본 .hanji",
      description:
        Platform.OS === "web"
          ? "웹에서 다시 읽을 수 있는 노트 데이터 사본입니다."
          : "PencilKit 원본·PDF·이미지·오디오를 복원 가능한 번들로 보관합니다.",
      icon: "archive-outline",
      onPress: onHanji,
    },
  ];
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
              <Text style={s.eyebrow}>EXPORT</Text>
              <Text style={s.title}>내보내기 형식</Text>
            </View>
            <Pressable
              accessibilityLabel="내보내기 닫기"
              disabled={!!busy}
              onPress={onClose}
              style={s.close}
            >
              <Ionicons name="close" size={21} color={C.ink} />
            </Pressable>
          </View>
          <Text style={s.help}>
            공유 시트에서 파일 앱, AirDrop 또는 원하는 저장 위치를 선택할 수
            있습니다.
          </Text>
          <View style={s.actions}>
            {actions.map((action) => (
              <Pressable
                key={action.key}
                accessibilityLabel={action.title}
                disabled={!!busy}
                onPress={() => void run(action)}
                style={[
                  s.action,
                  busy && busy !== action.key && { opacity: 0.45 },
                ]}
              >
                <View style={s.icon}>
                  {busy === action.key ? (
                    <ActivityIndicator color={C.accent} />
                  ) : (
                    <Ionicons name={action.icon} size={24} color={C.accent} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.actionTitle}>{action.title}</Text>
                  <Text style={s.description}>{action.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={19} color={C.muted} />
              </Pressable>
            ))}
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
  },
  card: {
    width: "86%",
    maxWidth: 540,
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
    letterSpacing: 1.4,
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
  help: { fontSize: 11, lineHeight: 17, color: C.muted, marginTop: 13 },
  actions: { gap: 10, marginTop: 16 },
  action: {
    minHeight: 76,
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: { fontSize: 14, fontWeight: "800", color: C.ink },
  description: { fontSize: 10, lineHeight: 15, color: C.muted, marginTop: 3 },
});
