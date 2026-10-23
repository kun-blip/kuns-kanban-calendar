# KUN'S KANBAN CALENDAR v1.8.2 — Mac 실행 오류 진단 패치

## 원인 분석
동료 Mac의 1.8.1 충돌 로그: Apple Silicon arm64, macOS 26.5.2, 앱 실행 후 약 0.19초 만에 Electron Framework CrBrowserMain에서 EXC_BREAKPOINT (SIGTRAP). 해당 오류만으로 정확한 충돌 지점을 단정할 수 없습니다.

v1.8.1 소스의 `package.json`은 `build.mac.identity: null`이라 macOS 바이너리 서명을 생략했습니다. 특히 Apple Silicon 환경에서 Electron의 실행 파일/JIT 메모리 처리에는 올바른 서명이 중요할 수 있습니다.

## 변경사항
- 버전 1.8.2
- Mac 시험용 빌드의 `build.mac.identity`를 `null` → `-`로 변경하여 ad-hoc 서명
- macOS GitHub Actions에 `codesign --verify --deep --strict` 및 `Signature=adhoc` 확인 추가
- Electron/기능 코드와 Windows 업데이트는 그대로 유지
- macOS 자동 업데이트는 이전과 같이 비활성화

## 중요: 정식 배포 아님
ad-hoc 서명은 Apple Developer ID 인증서/공증을 대체하지 않습니다. 동료 Mac에 Gatekeeper 경고가 남을 수 있으며, 회사 보안 정책에 따른 승인 없이 보안 설정을 우회하지 마세요. 또한 이 패치는 **추정 원인을 검증하기 위한 첫 단계**이므로 런타임 충돌 해결을 보장하지 않습니다.

## 배포/테스트
1. 기존 GitHub 프로젝트 소스를 백업하고 패치 ZIP을 루트에 덮어씁니다. `.git` 폴더는 건드리지 않습니다.
2. `npm test` 확인 후 `v1.8.2`로 커밋, 태그 push하여 Actions의 Windows+Mac 빌드 모두 성공 확인.
3. Mac 빌드의 `Verify Mac application ad-hoc signature` 단계가 성공했는지 확인.
4. Mac에 v1.8.2 DMG를 새로 내려받아 설치. 회사 보안 정책에서 허용되는 경우에만 앱 실행.
5. 여전히 충돌한다면 새 macOS `.ips` 충돌 보고서와 Console.app 로그를 확인. 다음 조사 후보: Electron 45.0.0과 macOS 26의 호환성, 초기화 시 Electron API 접근 등.

## 추가 권장
정식 동료 배포는 Apple Developer ID 서명 + 공증으로 변경하고, Windows/Mac 실사용 테스트를 통과한 이후 진행해야 합니다.
