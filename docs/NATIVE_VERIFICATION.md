# iPad native verification

Windows에서는 iOS 프로젝트 생성과 Swift 컴파일이 지원되지 않는다. 네이티브 변경은 `.github/workflows/ios-build.yml`의 macOS 빌드가 authoritative gate다.

## Gates

- G1 Ink: Apple Notes와 동일 문장 30분, 지연 육안 차이 없음, 손바닥 오작동 0회.
- G2 OCR: 한국어 손글씨 100줄 recall 70% 이상. 미달 시 ML Kit Digital Ink 어댑터로 전환.
- G3 PDF: 200쪽 PDF에서 페이지 전환, 50–800% 확대, 잉크 좌표 일치 및 메모리 경고 없음.
- G4 Audio: 60분 녹음, 페이지 이동 후 스트로크 탭 시 목표 시각 ±250ms.
- G5 Backup: 앱 삭제 전 백업을 새 설치에 복원하고 PDF/원본 드로잉 수가 일치.
- G6 Pencil gestures: 일반 문장 50줄에서 긁어서 지우기 오탐 1회 이하, 의도한 지우기 성공률 90% 이상. 직선·화살표·원·사각형·삼각형을 각 20회 그리고 Quick Shapes 성공률 90% 이상, 실행 취소 1회로 원본 스트로크 복원.
- G7 Zoom Window: 2.5배 확대 상태로 가로 3구간과 세로 3줄을 연속 필기한다. 오른쪽 경계에서만 자동 전진하고 줄 끝에서 다음 줄로 이동하며, 확대 해제 후 스트로크 좌표·도구·지우개·오디오 타임스탬프가 유지된다.
- G8 PDF navigation: 목차와 내부/외부 링크가 포함된 PDF에서 목차 20개와 내부 링크 20개가 정확한 페이지로 이동하고, 외부 링크 5개가 시스템 브라우저에서 열린다. Apple Pencil 입력은 링크를 열지 않는다.
- G9 Cloud restore: 100MB 초과 `.hanji` 백업을 R2 멀티파트로 업로드하고 새 설치에서 복원한다. 노트·페이지·PDF·오디오·플래시카드·태그·북마크 수와 대표 파일 SHA-256이 원본과 일치한다.
- G10 Hybrid canvas: 200쪽 PDF를 세로 연속 모드로 1→200→100쪽 순서로 이동하고 메모리 경고나 빈 캔버스가 없어야 한다. 일반 노트 끝에서 직접 스크롤했을 때 페이지가 정확히 1장만 자동 추가되고, 페이지 모드로 전환한 뒤 같은 페이지의 잉크·요소·현재 위치가 유지된다.

## Device test procedure

1. `main`의 최신 `iOS Native Build`가 성공했는지 확인하고 unsigned IPA artifact를 내려받는다.
2. [IPAD_INSTALL.md](./IPAD_INSTALL.md)에 따라 AltServer/SideStore로 동일 빌드를 설치한다.
3. iPadOS 17 이상 실제 iPad와 Apple Pencil로 G1–G10을 순서대로 수행한다.
4. 각 게이트의 기기 모델, iPadOS 버전, Pencil 모델, 성공 횟수/전체 횟수, 화면 녹화 또는 샘플 파일을 기록한다.
5. G1/G2/G3 중 하나라도 실패하면 필기 앱 완성으로 판정하지 않는다. PDF G3 실패 시 설계의 Plan B인 페이지 이미지 렌더 방식으로 전환한다.

## Current native modules

- HanjiCanvasModule: 일반 PencilKit 페이지
- HanjiDocumentModule: PDFKit 단일 페이지 표시 + 페이지별 PencilKit sidecar
- HanjiVisionModule: PKDrawing 3x 렌더 + Vision ko-KR OCR
