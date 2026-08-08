# iPad 설치 방법

GitHub Release와 Actions가 제공하는 `YoojinNote-unsigned.ipa`는 서명되지 않은 파일이다. AltStore 또는 SideStore가 사용자의 Apple Account 개인 개발 인증서로 다시 서명해서 설치한다. 앱 표시 이름은 `yoojin note`이고 기존 `dev.hanji.notes` 번들 ID와 저장소 키는 데이터 호환을 위해 유지한다.

## 1. IPA 받기

1. GitHub 저장소의 **Releases → yoojin note v0.1.10 - library multi-selection**를 연다. Release가 보이지 않을 때만 **Actions → iOS Native Build**의 최신 성공 실행을 연다.
2. `YoojinNote-v0.1.10-unsigned.ipa` 또는 Actions의 `YoojinNote-unsigned-ipa` ZIP을 내려받는다. 흰 화면이 발생했던 v0.1.0 IPA는 설치하지 않는다.
3. Actions ZIP을 받았다면 압축을 푼다.
4. ZIP을 풀면 다음 세 파일이 있다.
   - `YoojinNote-unsigned.ipa`: AltStore/SideStore가 다시 서명할 앱
   - `YoojinNote-build.txt`: 커밋 SHA, Actions 실행 번호, 앱 버전, Xcode 버전
   - `YoojinNote-device-checklist.md`: 그 빌드의 전체 실기기 검증 기록지
5. 설치 후 yoojin note 서재 왼쪽 아래의 빌드 표기가 `YoojinNote-build.txt`의 버전·짧은 커밋과 같은지 확인한다. 다르면 이전 IPA가 설치된 것이다.

## 2A. AltStore로 설치 — Windows PC가 자주 켜져 있을 때

1. AltStore 공식 Windows 안내에 따라 Apple 웹사이트 직접 배포판 iTunes/iCloud와 AltServer를 설치한다. Microsoft Store판은 공식 기본 절차가 아니다.
2. iPad를 USB로 연결하고 이 컴퓨터를 신뢰한다.
3. iTunes에서 iPad의 **Wi-Fi 동기화**를 켠다.
4. AltServer를 관리자 권한으로 실행해 iPad에 AltStore를 설치한다.
5. iPad에서 **설정 → 일반 → VPN 및 기기 관리**에서 Apple Account 개발자 앱을 신뢰한다.
6. **설정 → 개인정보 보호 및 보안 → 개발자 모드**를 켜고 재시동한다.
7. AltStore → My Apps → **+** → 내려받은 `YoojinNote-…unsigned.ipa`를 선택한다.
8. 무료 계정은 7일마다 AltServer와 같은 Wi-Fi에서 Refresh All이 필요하다.

### 이전 버전에서 업데이트할 때

1. 먼저 v0.1.10 IPA를 기존 앱 위에 설치한다. 같은 번들 ID라 노트 컨테이너를 유지하면서 갱신할 수 있다.
2. 설치 후에도 흰 화면이거나 AltStore가 갱신을 거부하면 기존 앱을 삭제하고 v0.1.10을 새로 설치한다. 앱 삭제는 로컬 노트를 지울 수 있으므로, 기존 버전에서 서재가 열리는 경우에는 먼저 전체 백업을 만든다.
3. 설치 후 `설정 → 설치 진단`에서 다섯 기능이 모두 초록색이고 `5/5`인지 확인한다. 하나라도 빨간색이면 최신 IPA를 다시 설치한다.

공식 문서: https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows

## 2B. SideStore로 설치 — PC 없이 갱신하고 싶을 때

1. iPad에 LocalDevVPN을 설치하고 연결한다.
2. SideStore 공식 prerequisites에서 Windows용 iloader를 설치한다.
3. USB로 iPad를 연결하고 iloader에 Apple Account로 로그인한 뒤 **Install SideStore (Stable)**을 실행한다.
4. iPad에서 개발자 앱 신뢰와 개발자 모드를 켠다.
5. LocalDevVPN을 연결하고 SideStore에 로그인한다.
6. My Apps의 **+**에서 내려받은 `YoojinNote-…unsigned.ipa`를 선택한다.
7. 만료 전에 LocalDevVPN을 켜고 7 DAYS 표시를 눌러 갱신한다.

공식 문서: https://docs.sidestore.io/docs/installation/prerequisites
설치 문서: https://docs.sidestore.io/docs/installation/install

## 무료 계정 제한

- 앱 서명 유효기간 7일
- SideStore/AltStore 포함 활성 사이드로드 앱 최대 3개
- 주당 App ID 10개
- 앱을 삭제하면 컨테이너 데이터도 사라질 수 있으므로 yoojin note의 **전체 백업**을 먼저 실행한다.

매일 쓰는 단계가 되면 Apple Developer Program으로 전환해 1년 프로비저닝 또는 TestFlight를 쓰는 편이 안전하다.

## 설치 직후 확인

1. yoojin note를 열어 **설정 → 일반 → VPN 및 기기 관리** 신뢰 오류 없이 실행되는지 확인한다.
2. 서재 왼쪽 아래 빌드 문자열을 `YoojinNote-build.txt`와 대조한다.
3. `YoojinNote-device-checklist.md`에 iPad 모델·iPadOS·Pencil 모델·설치 방식을 적는다.
4. G1 → G2 → G3 순서로 먼저 실행한다. 셋 중 하나라도 실패하면 나머지를 “완성”으로 판정하지 말고 기록과 샘플을 보존한다.
5. 앱을 갱신하기 전 **전체 백업**을 만들고, 새 빌드 설치 후 대표 노트 하나를 열어 필기·PDF·오디오를 확인한다.
