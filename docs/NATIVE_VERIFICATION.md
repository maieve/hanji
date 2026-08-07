# iPad native verification

Windows에서는 iOS 프로젝트 생성과 Swift 컴파일이 지원되지 않는다. 네이티브 변경은 `.github/workflows/ios-build.yml`의 macOS 빌드가 authoritative gate다.

## Gates

- G1 Ink: Apple Notes와 동일 문장 30분, 지연 육안 차이 없음, 손바닥 오작동 0회.
- G2 OCR: 한국어 손글씨 100줄 recall 70% 이상. 미달 시 ML Kit Digital Ink 어댑터로 전환.
- G3 PDF: 200쪽 PDF에서 페이지 전환, 50–800% 확대, 잉크 좌표 일치 및 메모리 경고 없음.
- G4 Audio: 60분 녹음, 페이지 이동 후 스트로크 탭 시 목표 시각 ±250ms.
- G5 Backup: 앱 삭제 전 백업을 새 설치에 복원하고 PDF/원본 드로잉 수가 일치.

## Current native modules

- HanjiCanvasModule: 일반 PencilKit 페이지
- HanjiDocumentModule: PDFKit 단일 페이지 표시 + 페이지별 PencilKit sidecar
- HanjiVisionModule: PKDrawing 3x 렌더 + Vision ko-KR OCR
