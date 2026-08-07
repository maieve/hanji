# Hanji

iPadOS 17+용 로컬 퍼스트 개인 필기 앱. iOS에서는 PencilKit `PKCanvasView`, 웹에서는 개발·UX 검증용 SVG 캔버스를 사용한다.

## 실행

```powershell
npm install
npm run web
```

iOS 네이티브 빌드는 macOS 러너에서 `npx expo prebuild --platform ios` 후 `npx expo run:ios`로 생성한다. 필기 데이터는 현재 AsyncStorage에 자동 저장되며, 네이티브에서는 페이지별 `PKDrawing.dataRepresentation()` base64가 저장된다.

## 현재 범위

- 서재, 제목/태그 검색, 새 노트, 삭제(길게 누르기)
- 페이지별 캔버스, 줄 템플릿, 페이지 추가/전환
- 펜/형광펜/지우개, 색상·굵기, 자동 저장/복원
- iOS PencilKit 네이티브 모듈 및 웹 개발 대체 구현

다음 게이트는 실기기 G1(Apple Notes 대비 필기감)이다. 통과 전 PDF/OCR 같은 상위 기능은 확장하지 않는다.
