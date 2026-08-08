import { Ionicons } from "@expo/vector-icons";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { C } from "../theme";
import type { AudioSession } from "../types";
import { TranscriptPanel } from "./TranscriptPanel";
import { persistRecording } from "../audioAssets";
export type AudioSaved = Omit<AudioSession, "strokes">;
type Props = {
  sessions: AudioSession[];
  seekRequest?: { seconds: number; nonce: number; sessionCreatedAt: string };
  onRecordingStart: (startedAt: number) => void;
  onRecordingCancelled: () => void;
  onSaved: (v: AudioSaved) => void;
  onReplayCutoffChange: (cutoff?: number) => void;
  onTranscribe: (session: AudioSession) => Promise<void>;
  leftHanded?: boolean;
};
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds) % 60).padStart(2, "0")}`;
export function AudioPanel({
  sessions,
  seekRequest,
  onRecordingStart,
  onRecordingCancelled,
  onSaved,
  onReplayCutoffChange,
  onTranscribe,
  leftHanded = false,
}: Props) {
  const [replay, setReplay] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [selectedSessionAt, setSelectedSessionAt] = useState<string>();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recording = useAudioRecorderState(recorder, 250);
  const recordingStartedAtRef = useRef<number | undefined>(undefined);
  const finalizingRef = useRef(false);
  const latest = sessions.at(-1);
  const active = sessions.find((session) => session.createdAt === selectedSessionAt) ?? latest;
  const activeIndex = active ? sessions.indexOf(active) : -1;
  const player = useAudioPlayer(active?.uri ?? null, { updateInterval: 250 });
  const playback = useAudioPlayerStatus(player);
  useEffect(() => {
    if (latest) setSelectedSessionAt(latest.createdAt);
  }, [latest?.createdAt]);
  useEffect(() => {
    onReplayCutoffChange(
      replay && active ? active.startedAt + playback.currentTime : undefined,
    );
  }, [replay, active?.startedAt, playback.currentTime, onReplayCutoffChange]);
  useEffect(
    () => () => onReplayCutoffChange(undefined),
    [onReplayCutoffChange],
  );
  useEffect(() => {
    if (!seekRequest) return;
    setSelectedSessionAt(seekRequest.sessionCreatedAt);
  }, [seekRequest?.nonce]);
  useEffect(() => {
    if (!seekRequest || active?.createdAt !== seekRequest.sessionCreatedAt) return;
    void player.seekTo(seekRequest.seconds).then(() => player.play());
  }, [seekRequest?.nonce, active?.createdAt, active?.uri]);
  const finishRecording = useCallback(async (showError: boolean) => {
    const startedAt = recordingStartedAtRef.current;
    if (startedAt === undefined || finalizingRef.current) return;
    finalizingRef.current = true;
    const durationMs = Math.max(
      recorder.getStatus().durationMillis,
      Math.round((Date.now() / 1000 - startedAt) * 1000),
    );
    try {
      if (recorder.isRecording) await recorder.stop();
      if (!recorder.uri) throw new Error("녹음 파일을 찾을 수 없습니다.");
      const persistentUri = persistRecording(recorder.uri);
      onSaved({
        uri: persistentUri,
        createdAt: new Date().toISOString(),
        startedAt,
        durationMs,
      });
    } catch (error) {
      onRecordingCancelled();
      if (showError) {
        Alert.alert(
          "녹음 저장 실패",
          error instanceof Error ? error.message : "녹음을 안전하게 저장하지 못했습니다.",
        );
      }
    } finally {
      recordingStartedAtRef.current = undefined;
      finalizingRef.current = false;
    }
  }, [onRecordingCancelled, onSaved, recorder]);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active" && recordingStartedAtRef.current !== undefined) {
        void finishRecording(false);
      }
    });
    return () => subscription.remove();
  }, [finishRecording]);
  const toggleRecord = async () => {
    if (recordingStartedAtRef.current !== undefined) {
      await finishRecording(true);
      return;
    }
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "마이크 권한",
        "녹음하려면 설정에서 마이크 권한을 허용해 주세요.",
      );
      return;
    }
    try {
      await recorder.prepareToRecordAsync();
      const startedAt = Date.now() / 1000;
      recordingStartedAtRef.current = startedAt;
      recorder.record();
      onRecordingStart(startedAt);
    } catch (error) {
      recordingStartedAtRef.current = undefined;
      onRecordingCancelled();
      Alert.alert("녹음 시작 실패", error instanceof Error ? error.message : "녹음을 시작하지 못했습니다.");
    }
  };
  const togglePlay = () => {
    if (!active) return;
    playback.playing ? player.pause() : player.play();
  };
  const transcribe = async () => {
    if (!active || transcribing) return;
    setTranscribing(true);
    try {
      await onTranscribe(active);
    } catch (error) {
      Alert.alert(
        "전사 실패",
        error instanceof Error
          ? error.message
          : "오디오를 전사하지 못했습니다.",
      );
    } finally {
      setTranscribing(false);
    }
  };
  return (
    <View style={[s.wrap, leftHanded && s.wrapLeftHanded]}>
      {active && (
        <View style={s.playback}>
          <Pressable accessibilityLabel={playback.playing ? "녹음 일시 정지" : "선택한 녹음 재생"} onPress={togglePlay} style={s.round}>
            <Ionicons
              name={playback.playing ? "pause" : "play"}
              size={15}
              color={C.accent}
            />
          </Pressable>
          <View>
            <Text style={s.title}>
              {clock(playback.currentTime)} /{" "}
              {clock(playback.duration || active.durationMs / 1000)}
            </Text>
            <Text style={s.sub}>{active.strokes.length}개 획 · {activeIndex + 1}/{sessions.length} 녹음</Text>
          </View>
          {sessions.length > 1 && <View style={s.sessionNav}>
            <Pressable accessibilityLabel="이전 녹음" disabled={activeIndex <= 0} onPress={() => setSelectedSessionAt(sessions[activeIndex - 1]?.createdAt)} style={s.sessionButton}><Ionicons name="chevron-back" size={14} color={activeIndex <= 0 ? C.line : C.accent}/></Pressable>
            <Pressable accessibilityLabel="다음 녹음" disabled={activeIndex >= sessions.length - 1} onPress={() => setSelectedSessionAt(sessions[activeIndex + 1]?.createdAt)} style={s.sessionButton}><Ionicons name="chevron-forward" size={14} color={activeIndex >= sessions.length - 1 ? C.line : C.accent}/></Pressable>
          </View>}
          <Pressable
            accessibilityLabel="잉크 리플레이"
            accessibilityState={{ selected: replay }}
            onPress={() => setReplay((v) => !v)}
            style={[s.replay, replay && s.replayActive]}
          >
            <Ionicons
              name="sparkles"
              size={14}
              color={replay ? "white" : C.accent}
            />
            <Text style={[s.replayText, replay && { color: "white" }]}>
              잉크
            </Text>
          </Pressable>
          {active.transcript ? (
            <Pressable
              accessibilityLabel="오디오 전사문 보기"
              onPress={() => setTranscriptOpen(true)}
              style={s.replay}
            >
              <Ionicons
                name="document-text-outline"
                size={14}
                color={C.accent}
              />
              <Text style={s.replayText}>전사문</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityLabel="온디바이스 한국어 전사"
              disabled={transcribing}
              onPress={() => void transcribe()}
              style={s.replay}
            >
              {transcribing ? (
                <ActivityIndicator size="small" color={C.accent} />
              ) : (
                <Ionicons name="language-outline" size={14} color={C.accent} />
              )}
              <Text style={s.replayText}>전사</Text>
            </Pressable>
          )}
        </View>
      )}
      <Pressable
        accessibilityLabel={recording.isRecording ? "녹음 정지 및 저장" : "새 녹음 시작"}
        accessibilityState={{ selected: recording.isRecording }}
        onPress={toggleRecord}
        style={[s.record, recording.isRecording && s.active]}
      >
        <Ionicons
          name={recording.isRecording ? "stop" : "mic"}
          size={18}
          color="white"
        />
        <Text style={s.recordText}>
          {recording.isRecording
            ? clock(recording.durationMillis / 1000)
            : "녹음"}
        </Text>
      </Pressable>
      {active && (
        <TranscriptPanel
          visible={transcriptOpen}
          session={active}
          currentTime={playback.currentTime}
          onClose={() => setTranscriptOpen(false)}
          onSeek={(seconds) => {
            void player.seekTo(seconds).then(() => player.play());
          }}
        />
      )}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 18,
    bottom: 18,
    zIndex: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  wrapLeftHanded: { left: undefined, right: 18 },
  record: {
    height: 42,
    paddingHorizontal: 15,
    borderRadius: 21,
    backgroundColor: C.accent,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  active: { backgroundColor: C.danger },
  recordText: { color: "white", fontWeight: "700" },
  playback: {
    height: 46,
    borderRadius: 15,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sessionNav:{flexDirection:"row",gap:2},
  sessionButton:{width:28,height:30,borderRadius:8,alignItems:"center",justifyContent:"center",backgroundColor:C.sidebar},
  round: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 11, fontWeight: "700", color: C.ink },
  sub: { fontSize: 9, color: C.muted, marginTop: 2 },
  replay: {
    height: 28,
    borderRadius: 9,
    paddingHorizontal: 8,
    backgroundColor: C.accentSoft,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  replayActive: { backgroundColor: C.accent },
  replayText: { fontSize: 10, fontWeight: "800", color: C.accent },
});
