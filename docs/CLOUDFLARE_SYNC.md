# Cloudflare R2 백업 설정

Hanji는 로컬 데이터를 원본으로 유지하고 Cloudflare R2에는 버전드 `.hanji` 백업만 저장한다. R2 버킷은 공개하지 않으며 Worker가 `SYNC_TOKEN`을 확인한다.

```powershell
cd cloudflare/worker
npm install
npx wrangler login
npx wrangler r2 bucket create hanji-backups
npx wrangler secret put SYNC_TOKEN
npm run deploy
```

배포 결과의 `https://...workers.dev` 주소와 같은 `SYNC_TOKEN`을 Hanji 서재의 `Cloudflare` 설정에 입력한다. Worker는 최신 10개 백업만 R2에 남긴다. 90MB 이하는 단일 PUT, 그보다 큰 오디오 포함 아카이브는 20MB 파트의 R2 multipart 업로드를 사용하므로 Workers 요청 본문 한도를 넘지 않는다.

현재 개인 배포 주소는 `https://hanji-sync.chaekgalpi.workers.dev`이며 앱에 기본 입력되어 있다. 토큰은 Git에서 제외된 `cloudflare/worker/.sync-token`에만 저장된다.

복원은 동일 노트 ID를 무조건 덮어쓰지 않는다. 페이지 ID별로 내용을 비교해 한쪽에만 있는 페이지는 합치고, 같은 페이지가 달라졌을 때만 페이지 `updatedAt`이 최신인 쪽을 원본 노트에 유지한다. 패배 페이지는 새 ID를 가진 `(페이지 충돌 사본)` 노트에 보존하고 연결된 오디오 스트로크 페이지 ID도 함께 다시 매핑한다. 녹음은 생성 시각, 플래시카드는 카드 ID별로 병합한다. 복원 과정에서 달라지는 로컬 자산 경로는 내용 비교에서 제외되며 같은 패배 페이지를 다시 복원해도 중복 충돌본을 만들지 않는다. 삭제 tombstone이 없는 현재 형식에서는 한쪽에만 있는 페이지를 삭제로 추측하지 않고 보존하는 쪽을 택한다.

보안상 R2 Access Key/Secret은 앱에 넣지 않는다. `SYNC_TOKEN`은 충분히 긴 무작위 값으로 만들고 유출 시 `wrangler secret put SYNC_TOKEN`으로 즉시 교체한다.
