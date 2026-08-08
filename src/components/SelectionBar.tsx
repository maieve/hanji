import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { C } from "../theme";

type Props = {
  count: number;
  color: string;
  availableWidth: number;
  onRecolor: () => void;
  onCopy: () => void;
  onClip: () => void;
  onImageFlashcard: () => void;
  onCut: () => void;
  onDuplicate: () => void;
  onShrink: () => void;
  onGrow: () => void;
  onRotate: () => void;
  onText: () => void;
  onFlashcard: () => void;
  onDelete: () => void;
  onClose: () => void;
};

const Action = ({
  label,
  icon,
  color = C.accent,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress: () => void;
}) => (
  <Pressable accessibilityLabel={label} onPress={onPress} style={s.action}>
    <Ionicons name={icon} size={16} color={color} />
  </Pressable>
);

export function SelectionBar({
  count,
  color,
  availableWidth,
  onRecolor,
  onCopy,
  onClip,
  onImageFlashcard,
  onCut,
  onDuplicate,
  onShrink,
  onGrow,
  onRotate,
  onText,
  onFlashcard,
  onDelete,
  onClose,
}: Props) {
  if (!count) return null;
  const width = Math.max(128, Math.min(390, availableWidth));
  return (
    <View
      accessibilityLabel={`${count}개 획 선택됨`}
      style={[s.bar, { width, transform: [{ translateX: -width / 2 }] }]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.row}
      >
        <Text style={s.count}>{count}획 선택</Text>
        <Action
          label="선택 획 20% 축소"
          icon="contract-outline"
          onPress={onShrink}
        />
        <Action
          label="선택 획 25% 확대"
          icon="expand-outline"
          onPress={onGrow}
        />
        <Action
          label="선택 획 시계 방향 90도 회전"
          icon="refresh-outline"
          onPress={onRotate}
        />
        <Pressable
          accessibilityLabel={`선택 획 색상을 ${color}로 변경`}
          onPress={onRecolor}
          style={s.action}
        >
          <View style={[s.color, { backgroundColor: color }]} />
        </Pressable>
        <Pressable
          accessibilityLabel="선택 해제"
          onPress={onClose}
          style={s.close}
        >
          <Ionicons name="close" size={18} color={C.muted} />
        </Pressable>
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.row}
      >
        <Action
          label="선택 영역 PNG와 원본 획 복사"
          icon="clipboard-outline"
          onPress={onCopy}
        />
        <Action
          label="선택 필기를 이미지 클리핑으로 만들기"
          icon="crop-outline"
          onPress={onClip}
        />
        <Action
          label="선택 필기를 이미지 플래시카드로 만들기"
          icon="image-outline"
          onPress={onImageFlashcard}
        />
        <Action label="선택 획 잘라내기" icon="cut-outline" onPress={onCut} />
        <Action
          label="선택 획 복제"
          icon="copy-outline"
          onPress={onDuplicate}
        />
        <Action
          label="선택 필기를 텍스트로 변환"
          icon="text-outline"
          onPress={onText}
        />
        <Action
          label="선택 필기를 플래시카드 질문으로 만들기"
          icon="albums-outline"
          onPress={onFlashcard}
        />
        <Action
          label="선택 획 삭제"
          icon="trash-outline"
          color={C.danger}
          onPress={onDelete}
        />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    position: "absolute",
    top: 16,
    left: "50%",
    zIndex: 30,
    minHeight: 82,
    borderRadius: 16,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    padding: 7,
    gap: 4,
  },
  row: {
    height: 32,
    minWidth: "100%",
    paddingHorizontal: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  count: { minWidth: 70, fontSize: 11, fontWeight: "800", color: C.ink },
  action: {
    width: 42,
    height: 32,
    borderRadius: 9,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  color: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.white,
  },
  close: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
