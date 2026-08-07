# iPad 설치 방법

GitHub Actions가 만드는 `Hanji-unsigned.ipa`는 서명되지 않은 파일이다. AltStore 또는 SideStore가 무료 Apple Account의 개인 개발 인증서로 다시 서명해서 설치한다.

## 1. IPA 받기

1. GitHub 저장소의 **Actions → iOS Native Build**를 연다.
2. 성공한 실행을 선택한다.
3. 페이지 하단 **Artifacts → Hanji-unsigned-ipa**를 내려받는다.
4. ZIP을 풀어 `Hanji-unsigned.ipa`를 얻는다.

## 2A. AltStore로 설치 — Windows PC가 자주 켜져 있을 때

1. AltStore 공식 Windows 안내에 따라 Apple 웹사이트 배포판 iTunes/iCloud와 AltServer를 설치한다.
2. iPad를 USB로 연결하고 이 컴퓨터를 신뢰한다.
3. iTunes에서 iPad의 **Wi-Fi 동기화**를 켠다.
4. AltServer를 관리자 권한으로 실행해 iPad에 AltStore를 설치한다.
5. iPad에서 **설정 → 일반 → VPN 및 기기 관리**에서 Apple Account 개발자 앱을 신뢰한다.
6. **설정 → 개인정보 보호 및 보안 → 개발자 모드**를 켜고 재시동한다.
7. AltStore → My Apps → **+** → `Hanji-unsigned.ipa`를 선택한다.
8. 무료 계정은 7일마다 AltServer와 같은 Wi-Fi에서 Refresh All이 필요하다.

공식 문서: https://faq.altstore.io/altstore-classic/how-to-install-altstore-windows

## 2B. SideStore로 설치 — PC 없이 갱신하고 싶을 때

1. iPad에 LocalDevVPN을 설치한다.
2. SideStore 공식 prerequisites에서 Windows용 iloader를 설치한다.
3. USB로 iPad를 연결하고 iloader에서 **Install SideStore (Stable)**을 실행한다.
4. iPad에서 개발자 앱 신뢰와 개발자 모드를 켠다.
5. LocalDevVPN을 연결하고 SideStore에 로그인한다.
6. My Apps의 **+**에서 `Hanji-unsigned.ipa`를 선택한다.
7. 만료 전에 LocalDevVPN을 켜고 7 DAYS 표시를 눌러 갱신한다.

공식 문서: https://docs.sidestore.io/docs/installation/prerequisites
설치 문서: https://docs.sidestore.io/docs/installation/install

## 무료 계정 제한

- 앱 서명 유효기간 7일
- SideStore/AltStore 포함 활성 사이드로드 앱 최대 3개
- 주당 App ID 10개
- 앱을 삭제하면 컨테이너 데이터도 사라질 수 있으므로 Hanji의 **전체 백업**을 먼저 실행한다.

매일 쓰는 단계가 되면 Apple Developer Program으로 전환해 1년 프로비저닝 또는 TestFlight를 쓰는 편이 안전하다.
