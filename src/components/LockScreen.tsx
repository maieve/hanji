import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { C } from "../theme";
export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  return (
    <View style={s.root}>
      <View style={s.mark}>
        <Text style={s.markText}>한</Text>
      </View>
      <Text style={s.title}>Hanji가 잠겨 있습니다</Text>
      <Text style={s.body}>
        Face ID, Touch ID 또는 iPad 암호로 잠금을 해제하세요.
      </Text>
      <Pressable onPress={onUnlock} style={s.button}>
        <Ionicons name="lock-open-outline" size={20} color={C.white} />
        <Text style={s.buttonText}>잠금 해제</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.canvas,
    alignItems: "center",
    justifyContent: "center",
  },
  mark: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  markText: { fontSize: 28, fontWeight: "900", color: C.white },
  title: { fontSize: 24, fontWeight: "800", color: C.ink, marginTop: 20 },
  body: { color: C.muted, marginTop: 8 },
  button: {
    height: 48,
    marginTop: 24,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: C.accent,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  buttonText: { color: C.white, fontWeight: "800" },
});
