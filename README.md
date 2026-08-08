# Hanji

iPadOS 17+용 로컬 퍼스트 개인 필기 앱. iOS에서는 PencilKit `PKCanvasView`, 웹에서는 개발·UX 검증용 SVG 캔버스를 사용한다.

## 실행

```powershell
npm install
npm run web
```

iOS 네이티브 빌드는 macOS 러너에서 `npx expo prebuild --platform ios` 후 `npx expo run:ios`로 생성한다. 필기 데이터는 현재 AsyncStorage에 자동 저장되며, 네이티브에서는 페이지별 `PKDrawing.dataRepresentation()` base64가 저장된다.

## 현재 범위

- PencilKit 펜 7종, 0.5–40pt/5–100% 미세 조절과 도구별 설정 기억·12슬롯 프리셋 관리, 형광펜·지우개·자·채움 도형·제스처·고급 올가미
- PDF 가져오기·목차·링크·텍스트 하이라이트·발췌 카드와 PDF/PNG/`.hanji` 내보내기
- Vision OCR 검색·올가미 필기→카드, 기기 내 음성 전사·필기 동기 재생, 플래시카드 SRS
- 중첩 폴더·태그·즐겨찾기·최근 문서와 폴더 이름 변경·안전한 삭제
- 로컬 버전 백업, Cloudflare R2 선택 동기화와 페이지 단위 충돌 보존
- iOS PencilKit/PDFKit/Vision/Speech 네이티브 모듈 및 웹 개발 대체 구현

자동 검증과 unsigned iPad 빌드는 GitHub Actions에서 수행한다. 실제 Apple Pencil 감각·OCR 정확도·PDF 좌표는 `docs/NATIVE_VERIFICATION.md`의 실기기 게이트로 최종 확인한다.
