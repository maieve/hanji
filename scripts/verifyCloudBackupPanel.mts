import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const panel = await readFile(new URL("../src/components/CloudSyncPanel.tsx", import.meta.url), "utf8");

assert.match(panel, /loadCloudConfig\(\)[\s\S]*listCloudBackups\(saved\)/, "opening the panel must load the saved cloud inventory");
assert.match(panel, /Alert\.alert\([\s\S]*클라우드 백업 복원[\s\S]*현재 서재와 병합합니다[\s\S]*confirmRestore/, "restore must require an explicit merge confirmation");
assert.match(panel, /backups\.map\(\(backup\)/, "the complete returned inventory must be rendered instead of an arbitrary first-page slice");
assert.match(panel, /accessibilityHint="두 번 탭하면 복원 확인창이 열립니다"/, "backup rows must explain the destructive next step to VoiceOver");
assert.match(panel, /accessibilityLiveRegion="polite"/, "cloud operation results must be announced");
assert.match(panel, /minHeight: 44/, "cloud controls must preserve a 44pt minimum target");
assert.match(panel, /maxHeight: "88%"[\s\S]*backupList: \{ maxHeight:/, "the backup inventory must remain scrollable on compact screens");
assert.match(panel, /const closePanel = async \(\) => \{[\s\S]*await saveCloudConfig\(config\);[\s\S]*onClose\(\)/, "closing the panel must persist edited URL, token, and automatic-backup state");
assert.match(panel, /onRequestClose=\{\(\) => void closePanel\(\)\}/, "system modal dismissal must use the same durable save path");

const sync = await readFile(new URL("../src/cloudSync.ts", import.meta.url), "utf8");
assert.match(sync, /sort\(\(a,b\)=>new Date\(b\.uploaded\)\.getTime\(\)-new Date\(a\.uploaded\)\.getTime\(\)\)/, "the client must defensively sort backups newest first");

console.log("cloud backup panel verification passed");
