import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import type { Notebook } from "../types";
import {
  downloadCloudBackup,
  emptyCloudConfig,
  listCloudBackups,
  loadCloudConfig,
  saveCloudConfig,
  testCloudConnection,
  uploadArchiveIfEnabled,
  type CloudBackup,
  type CloudConfig,
} from "../cloudSync";
import { importLibraryBackupFromUri, writeAutomaticBackup } from "../backup";
import { C } from "../theme";

const backupSize = (size: number) => `${(size / 1024 / 1024).toFixed(1)}MB`;
const backupDate = (uploaded: string) => {
  const date = new Date(uploaded);
  return Number.isNaN(date.getTime()) ? uploaded : date.toLocaleString("ko-KR");
};

export function CloudSyncPanel({
  visible,
  onClose,
  items,
  backupRetention,
  onRestore,
}: {
  visible: boolean;
  onClose: () => void;
  items: Notebook[];
  backupRetention: number;
  onRestore: (items: Notebook[]) => void;
}) {
  const [config, setConfig] = useState<CloudConfig>(emptyCloudConfig);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [backups, setBackups] = useState<CloudBackup[]>([]);

  const refreshBackups = async (nextConfig: CloudConfig) => {
    if (!nextConfig.endpoint || !nextConfig.token) {
      setBackups([]);
      return;
    }
    setBackups(await listCloudBackups(nextConfig));
  };

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setMessage("");
    setBusy(true);
    void loadCloudConfig()
      .then(async (saved) => {
        if (!active) return;
        setConfig(saved);
        try {
          const found = saved.endpoint && saved.token ? await listCloudBackups(saved) : [];
          if (active) setBackups(found);
        } catch (error) {
          if (active) setMessage(error instanceof Error ? error.message : "백업 목록 조회 실패");
        }
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [visible]);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setMessage("");
    try {
      await saveCloudConfig(config);
      await action();
      setMessage(success);
      await refreshBackups(config);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "작업 실패");
    } finally {
      setBusy(false);
    }
  };

  const sync = () =>
    run(async () => {
      const uri = await writeAutomaticBackup(items, backupRetention, 0);
      if (!uri) throw new Error("백업 파일을 만들지 못했습니다.");
      await uploadArchiveIfEnabled(uri, { ...config, enabled: true });
    }, "R2 백업 완료");

  const restore = (backup: CloudBackup) =>
    run(async () => {
      const uri = await downloadCloudBackup(config, backup);
      onRestore(await importLibraryBackupFromUri(uri));
    }, `${backup.name} 복원 완료`);

  const confirmRestore = (backup: CloudBackup) =>
    Alert.alert(
      "클라우드 백업 복원",
      `${backup.name}\n${backupDate(backup.uploaded)} · ${backupSize(backup.size)}\n\n현재 서재와 병합합니다. 계속할까요?`,
      [
        { text: "취소", style: "cancel" },
        { text: "복원", onPress: () => void restore(backup) },
      ],
    );

  const closePanel = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await saveCloudConfig(config);
      onClose();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "설정 저장 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => void closePanel()}>
      <View style={s.scrim}>
        <View style={s.card} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={s.title}>Cloudflare R2 백업</Text>
          <Text style={s.help}>
            Worker URL과 SYNC_TOKEN만 기기에 저장됩니다. R2 API 키는 앱에 들어가지 않습니다.
          </Text>
          <TextInput
            value={config.endpoint}
            onChangeText={(endpoint) => setConfig((current) => ({ ...current, endpoint }))}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://hanji-sync.example.workers.dev"
            accessibilityLabel="Cloudflare Worker URL"
            style={s.input}
          />
          <TextInput
            value={config.token}
            onChangeText={(token) => setConfig((current) => ({ ...current, token }))}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            placeholder="SYNC_TOKEN"
            accessibilityLabel="Cloudflare 동기화 토큰"
            style={s.input}
          />
          <View style={s.row}>
            <Text style={s.label}>자동 클라우드 백업</Text>
            <Switch
              value={config.enabled}
              onValueChange={(enabled) => setConfig((current) => ({ ...current, enabled }))}
              accessibilityLabel="자동 클라우드 백업"
            />
          </View>
          <View style={s.backupHeader}>
            <Text accessibilityRole="header" style={s.sectionTitle}>클라우드 백업함</Text>
            <Pressable
              disabled={busy || !config.endpoint || !config.token}
              onPress={() => void run(async () => undefined, "목록 새로고침 완료")}
              accessibilityRole="button"
              accessibilityLabel="클라우드 백업 목록 새로고침"
              style={({ pressed }) => [s.refresh, pressed && s.pressed]}
            >
              <Text style={s.refreshText}>새로고침</Text>
            </Pressable>
          </View>
          <ScrollView style={s.backupList} contentContainerStyle={s.backupListContent}>
            {!busy && backups.length === 0 && (
              <Text style={s.empty}>연결 후 저장된 백업이 여기에 표시됩니다.</Text>
            )}
            {backups.map((backup) => (
              <Pressable
                disabled={busy}
                onPress={() => confirmRestore(backup)}
                key={backup.key}
                accessibilityRole="button"
                accessibilityLabel={`${backup.name}, ${backupSize(backup.size)}, ${backupDate(backup.uploaded)}`}
                accessibilityHint="두 번 탭하면 복원 확인창이 열립니다"
                style={({ pressed }) => [s.backupRow, pressed && s.pressed]}
              >
                <View style={s.backupDetails}>
                  <Text numberOfLines={1} style={s.backupName}>{backup.name}</Text>
                  <Text style={s.backupMeta}>{backupDate(backup.uploaded)} · {backupSize(backup.size)}</Text>
                </View>
                <Text style={s.restore}>복원</Text>
              </Pressable>
            ))}
          </ScrollView>
          {!!message && <Text accessibilityLiveRegion="polite" style={s.message}>{message}</Text>}
          {busy && <ActivityIndicator accessibilityLabel="클라우드 작업 중" color={C.accent} />}
          <View style={s.actions}>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => void closePanel()} style={s.secondary}>
              <Text>저장 후 닫기</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void run(() => testCloudConnection(config), "연결 성공")}
              style={s.secondary}
            >
              <Text>연결 테스트</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={sync} style={s.primary}>
              <Text style={s.primaryText}>지금 백업</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,.35)", alignItems: "center", justifyContent: "center" },
  card: { width: 520, maxWidth: "90%", maxHeight: "88%", backgroundColor: C.white, borderRadius: 20, padding: 22, gap: 12 },
  title: { fontSize: 20, fontWeight: "800", color: C.ink },
  help: { fontSize: 12, lineHeight: 18, color: C.muted },
  input: { minHeight: 44, borderWidth: 1, borderColor: C.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 8, color: C.ink },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontWeight: "700", color: C.ink },
  backupHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  sectionTitle: { color: C.ink, fontWeight: "800" },
  refresh: { minHeight: 36, justifyContent: "center", paddingHorizontal: 8 },
  refreshText: { color: C.accent, fontSize: 12, fontWeight: "800" },
  backupList: { maxHeight: 230, borderWidth: 1, borderColor: C.line, borderRadius: 11 },
  backupListContent: { flexGrow: 1 },
  empty: { color: C.muted, fontSize: 12, lineHeight: 18, padding: 14 },
  backupRow: { minHeight: 58, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.line },
  backupDetails: { flex: 1, minWidth: 0, gap: 3 },
  backupName: { color: C.ink, fontSize: 12, fontWeight: "700" },
  backupMeta: { color: C.muted, fontSize: 11 },
  restore: { marginLeft: 10, color: C.accent, fontSize: 12, fontWeight: "800" },
  message: { color: C.accent, fontWeight: "700" },
  actions: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-end", gap: 8, marginTop: 4 },
  primary: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "white", fontWeight: "700" },
  secondary: { minHeight: 44, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.65 },
});
