import {readFileSync,writeFileSync} from 'node:fs';

const [input='docs/NATIVE_VERIFICATION.md',output]=process.argv.slice(2);
const source=readFileSync(input,'utf8');
const gates=[...source.matchAll(/^- (G\d+) ([^:]+): (.+)$/gm)].map(match=>({id:match[1],title:match[2],criteria:match[3]}));
if(!gates.length)throw new Error('No native gates found');
const body=[
 '# Hanji iPad 실기기 검증 기록','',
 `- 생성 시각: ${new Date().toISOString()}`,
 `- 커밋: ${process.env.GITHUB_SHA??'로컬/직접 기록'}`,
 `- Actions 실행: ${process.env.GITHUB_RUN_ID??'직접 기록'}`,
 '- iPad 모델:', '- iPadOS:', '- Apple Pencil:', '- 설치 방식: AltStore / SideStore / Xcode / 기타','',
 '상태는 `미실행`을 `통과` 또는 `실패`로 바꾸고 증거 파일명·측정값을 기록한다. G1/G2/G3 중 하나라도 실패하면 완성 판정을 중단한다.','',
 ...gates.flatMap(gate=>[`## ${gate.id} · ${gate.title}`,'','- 상태: 미실행','- 측정값/성공 횟수:','- 화면 녹화·샘플 파일:','- 메모:','',`판정 기준: ${gate.criteria}`,''])
].join('\n');
if(output&&output!=='--check')writeFileSync(output,body);else if(output!=='--check')process.stdout.write(body);
console.error(`Generated ${gates.length} native gates`);
