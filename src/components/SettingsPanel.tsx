import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { pencilDoubleTapActions, pencilSqueezeActions } from "../pencilActions";
import type { PencilAction } from "../pencilActions";
import { C } from "../theme";
import type { PageTemplate } from "../types";
import type { UiPreferences } from "../uiPreferences";
import { templateSpacings } from "../templateSpacing";

const templates: { value: PageTemplate; label: string }[] = [
  { value: "plain", label: "백지" },
  { value: "line", label: "줄" },
  { value: "grid", label: "격자" },
  { value: "dot", label: "점" },
  { value: "cornell", label: "코넬" },
  { value: "planner", label: "플래너" },
  { value: "flashcard", label: "Q/A 카드" },
  { value: "dark", label: "다크" },
];

export function SettingsPanel({
  visible,
  value,
  indexStatus,
  onRebuildIndex,
  onChange,
  onClose,
}: {
  visible: boolean;
  value: UiPreferences;
  indexStatus: "idle" | "running" | "success" | "error";
  onRebuildIndex: () => void;
  onChange: (value: UiPreferences) => void;
  onClose: () => void;
}) {
  const toggle =
    (
      key:
        | "leftHanded"
        | "fingerDrawingEnabled"
        | "autoDarkInk"
        | "pageTurnHaptics"
        | "twoFingerUndoEnabled"
        | "threeFingerRedoEnabled",
    ) =>
    (enabled: boolean) =>
      onChange({ ...value, [key]: enabled });
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
            <Text style={s.eyebrow}>HANJI SETTINGS</Text>
            <Text style={s.title}>필기 환경</Text>
          </View>
          <Pressable
            accessibilityLabel="설정 닫기"
            onPress={onClose}
            style={s.close}
          >
            <Ionicons name="close" size={23} color={C.ink} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={s.body}>
          <Text style={s.section}>입력과 배치</Text>
          <SettingRow
            label="손가락으로 필기"
            help="끄면 손가락은 스크롤과 확대에만 사용합니다."
            value={value.fingerDrawingEnabled}
            onChange={toggle("fingerDrawingEnabled")}
          />
          <SettingRow
            label="왼손 모드"
            help="페이지 레일과 떠 있는 컨트롤을 오른쪽으로 옮깁니다."
            value={value.leftHanded}
            onChange={toggle("leftHanded")}
          />
          <SettingRow
            label="페이지 넘김 햅틱"
            help="직접 다른 페이지로 이동할 때 가벼운 선택 진동을 냅니다."
            value={value.pageTurnHaptics}
            onChange={toggle("pageTurnHaptics")}
          />
          <SettingRow
            label="두 손가락 탭으로 실행 취소"
            help="캔버스를 두 손가락으로 한 번 탭하면 마지막 필기를 되돌립니다."
            value={value.twoFingerUndoEnabled}
            onChange={toggle("twoFingerUndoEnabled")}
          />
          <SettingRow
            label="세 손가락 탭으로 다시 실행"
            help="캔버스를 세 손가락으로 한 번 탭하면 되돌린 필기를 복원합니다."
            value={value.threeFingerRedoEnabled}
            onChange={toggle("threeFingerRedoEnabled")}
          />
          <SettingRow
            label="다크 페이퍼 잉크 자동 반전"
            help="검정 잉크는 밝게, 다크 페이퍼를 떠날 때는 다시 검정으로 바꿉니다."
            value={value.autoDarkInk}
            onChange={toggle("autoDarkInk")}
          />
          <Text style={s.section}>Apple Pencil 제스처</Text>
          <ActionPicker
            label="더블 탭"
            actions={pencilDoubleTapActions}
            value={value.pencilDoubleTapAction}
            onChange={(pencilDoubleTapAction) =>
              onChange({ ...value, pencilDoubleTapAction })
            }
          />
          <ActionPicker
            label="Pencil Pro 스퀴즈"
            actions={pencilSqueezeActions}
            value={value.pencilSqueezeAction}
            onChange={(pencilSqueezeAction) =>
              onChange({ ...value, pencilSqueezeAction })
            }
          />
          <Text style={s.section}>새 페이지 위치</Text>
          <View style={s.placement}>
            {(
              [
                { value: "after-current", label: "현재 페이지 뒤" },
                { value: "end", label: "문서 맨 끝" },
              ] as const
            ).map((item) => (
              <Pressable
                key={item.value}
                accessibilityLabel={`새 페이지 ${item.label}에 추가`}
                accessibilityState={{
                  selected: value.newPagePlacement === item.value,
                }}
                onPress={() =>
                  onChange({ ...value, newPagePlacement: item.value })
                }
                style={[
                  s.placementButton,
                  value.newPagePlacement === item.value && s.retentionSelected,
                ]}
              >
                <Text
                  style={[
                    s.retentionText,
                    value.newPagePlacement === item.value && s.white,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.section}>새 페이지 기본 템플릿</Text>
          <View style={s.templates}>
            {templates.map((item) => (
              <Pressable
                key={item.value}
                accessibilityLabel={`${item.label} 기본 템플릿`}
                accessibilityState={{
                  selected: value.defaultTemplate === item.value,
                }}
                onPress={() =>
                  onChange({ ...value, defaultTemplate: item.value })
                }
                style={[
                  s.template,
                  value.defaultTemplate === item.value && s.selected,
                ]}
              >
                <View style={[s.paper, item.value === "dark" && s.dark]}>
                  {item.value === "line" && <View style={s.line} />}
                  {item.value === "flashcard" && (
                    <View style={s.flashcardLine}/>
                  )}
                  <Text
                    style={[
                      s.templateCode,
                      item.value === "dark" && s.darkText,
                    ]}
                  >
                    {item.label.slice(0, 1)}
                  </Text>
                </View>
                <Text
                  style={[
                    s.templateLabel,
                    value.defaultTemplate === item.value && s.accentText,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.section}>새 페이지 템플릿 간격</Text>
          <View style={s.placement}>
            {templateSpacings.map((item) => (
              <Pressable
                key={item.value}
                accessibilityLabel={`기본 템플릿 간격 ${item.label}`}
                accessibilityState={{
                  selected: value.defaultTemplateSpacing === item.value,
                }}
                onPress={() =>
                  onChange({ ...value, defaultTemplateSpacing: item.value })
                }
                style={[
                  s.placementButton,
                  value.defaultTemplateSpacing === item.value &&
                    s.retentionSelected,
                ]}
              >
                <Text
                  style={[
                    s.retentionText,
                    value.defaultTemplateSpacing === item.value && s.white,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.section}>자동 백업 주기</Text>
          <View style={s.retention}>
            {[5, 15, 30, 60].map((minutes) => (
              <Pressable
                key={minutes}
                accessibilityLabel={`자동 백업 최소 ${minutes}분 간격`}
                accessibilityState={{
                  selected: value.backupIntervalMinutes === minutes,
                }}
                onPress={() =>
                  onChange({ ...value, backupIntervalMinutes: minutes })
                }
                style={[
                  s.retentionButton,
                  value.backupIntervalMinutes === minutes &&
                    s.retentionSelected,
                ]}
              >
                <Text
                  style={[
                    s.retentionText,
                    value.backupIntervalMinutes === minutes && s.white,
                  ]}
                >
                  {minutes}분
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.section}>자동 백업 보관</Text>
          <View style={s.retention}>
            {[3, 5, 10, 20].map((count) => (
              <Pressable
                key={count}
                accessibilityLabel={`자동 백업 ${count}개 보관`}
                accessibilityState={{
                  selected: value.backupRetention === count,
                }}
                onPress={() => onChange({ ...value, backupRetention: count })}
                style={[
                  s.retentionButton,
                  value.backupRetention === count && s.retentionSelected,
                ]}
              >
                <Text
                  style={[
                    s.retentionText,
                    value.backupRetention === count && s.white,
                  ]}
                >
                  {count}개
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.section}>검색 데이터</Text>
          <View style={s.indexRow}>
            <View style={s.grow}>
              <Text style={s.label}>검색 인덱스 재생성</Text>
              <Text style={s.help}>
                복원 후 검색 결과가 빠졌을 때 저장된 OCR·전사 데이터를 다시
                등록합니다.
              </Text>
              {indexStatus === "success" && (
                <Text style={s.success}>재생성 완료</Text>
              )}
              {indexStatus === "error" && (
                <Text style={s.error}>재생성 실패 · 다시 시도해 주세요</Text>
              )}
            </View>
            <Pressable
              accessibilityLabel="OCR 검색 인덱스 재생성"
              accessibilityState={{
                busy: indexStatus === "running",
                disabled: indexStatus === "running",
              }}
              disabled={indexStatus === "running"}
              onPress={onRebuildIndex}
              style={[s.rebuild, indexStatus === "running" && s.disabled]}
            >
              {indexStatus === "running" ? (
                <ActivityIndicator size="small" color={C.white} />
              ) : (
                <>
                  <Ionicons name="refresh" size={17} color={C.white} />
                  <Text style={s.rebuildText}>재생성</Text>
                </>
              )}
            </Pressable>
          </View>
          <Text style={s.note}>
            설정은 이 iPad에 저장됩니다. 기본 템플릿과 삽입 위치는 새 페이지부터
            적용되고 기존 페이지는 바뀌지 않습니다. 자동 백업은 선택한 최소
            간격으로 만들고 최신 항목만 남깁니다.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

function SettingRow({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={s.row}>
      <View style={s.grow}>
        <Text style={s.label}>{label}</Text>
        <Text style={s.help}>{help}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: C.accentSoft }}
        thumbColor={value ? C.accent : undefined}
      />
    </View>
  );
}

function ActionPicker({
  label,
  value,
  onChange,
  actions,
}: {
  label: string;
  value: PencilAction;
  onChange: (value: PencilAction) => void;
  actions: { value: PencilAction; label: string }[];
}) {
  return (
    <View style={s.row}>
      <View style={s.grow}>
        <Text style={s.label}>{label}</Text>
        <View style={s.templates}>
          {actions.map((item) => (
            <Pressable
              key={item.value}
              accessibilityRole="button"
              accessibilityState={{ selected: value === item.value }}
              onPress={() => onChange(item.value)}
              style={[
                s.retentionButton,
                {
                  minWidth: 96,
                  height: 38,
                  paddingHorizontal: 10,
                  borderRadius: 11,
                  borderWidth: 1,
                  borderColor: C.line,
                },
                value === item.value && s.retentionSelected,
              ]}
            >
              <Text style={[s.retentionText, value === item.value && s.white]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8F7F2" },
  header: {
    height: 76,
    paddingHorizontal: 22,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    backgroundColor: C.white,
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
  title: { fontSize: 23, fontWeight: "800", color: C.ink, marginTop: 3 },
  close: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.accentSoft,
  },
  body: { padding: 22, gap: 12 },
  section: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
    color: C.accent,
    marginTop: 8,
  },
  row: {
    minHeight: 72,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  grow: { flex: 1 },
  label: { fontSize: 14, fontWeight: "800", color: C.ink },
  help: { fontSize: 11, lineHeight: 16, color: C.muted, marginTop: 4 },
  placement: {
    height: 44,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: C.white,
  },
  placementButton: { flex: 1, alignItems: "center", justifyContent: "center" },
  templates: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  template: {
    width: 76,
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    alignItems: "center",
  },
  selected: { borderColor: C.accent, backgroundColor: C.accentSoft },
  paper: {
    width: 48,
    height: 34,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  dark: { backgroundColor: "#202522" },
  flashcardLine:{position:'absolute',left:5,right:5,top:'50%',height:1,backgroundColor:'#8CB6A6'},
  line: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 16,
    height: 1,
    backgroundColor: "#DDE2DD",
  },
  templateCode: { fontSize: 10, fontWeight: "900", color: C.muted },
  templateLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.muted,
    marginTop: 6,
  },
  retention: {
    height: 44,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 13,
    overflow: "hidden",
    backgroundColor: C.white,
  },
  retentionButton: { flex: 1, alignItems: "center", justifyContent: "center" },
  retentionSelected: { backgroundColor: C.accent },
  retentionText: { fontSize: 12, fontWeight: "800", color: C.muted },
  indexRow: {
    minHeight: 86,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  rebuild: {
    height: 38,
    borderRadius: 11,
    paddingHorizontal: 12,
    backgroundColor: C.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  rebuildText: { fontSize: 10, fontWeight: "900", color: C.white },
  success: { fontSize: 10, fontWeight: "800", color: C.accent, marginTop: 5 },
  error: { fontSize: 10, fontWeight: "800", color: C.danger, marginTop: 5 },
  note: { fontSize: 11, lineHeight: 17, color: C.muted, marginTop: 8 },
  white: { color: C.white },
  darkText: { color: "#F4F1E8" },
  accentText: { color: C.accent },
  disabled: { opacity: 0.55 },
});
