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

배포 결과의 `https://...workers.dev` 주소와 같은 `SYNC_TOKEN`을 Hanji 서재의 `Cloudflare` 설정에 입력한다. Worker는 최신 10개 백업만 R2에 남긴다. 무료/Pro 계정의 단일 HTTP 요청 본문 한도 때문에 아카이브 하나가 100MB를 넘으면 업로드를 거부한다. 큰 오디오 백업은 multipart 동기화 구현 전까지 로컬 `.hanji` 내보내기를 사용한다.

현재 개인 배포 주소는 `https://hanji-sync.chaekgalpi.workers.dev`이며 앱에 기본 입력되어 있다. 토큰은 Git에서 제외된 `cloudflare/worker/.sync-token`에만 저장된다.

보안상 R2 Access Key/Secret은 앱에 넣지 않는다. `SYNC_TOKEN`은 충분히 긴 무작위 값으로 만들고 유출 시 `wrangler secret put SYNC_TOKEN`으로 즉시 교체한다.
