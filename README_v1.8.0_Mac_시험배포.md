# v1.8.0 — Windows + macOS 배포 (Mac 첫 설치 테스트)

## 목표

동료가 GitHub Releases에서 **macOS Universal DMG**를 다운로드해 Intel / Apple Silicon Mac에 설치할 수 있게 합니다.
Windows NSIS 설치 및 `latest.yml` 자동 업데이트 흐름은 그대로 유지합니다.

## 이번 버전의 Mac 제한

- **시험판입니다. Apple Developer ID 코드 서명 및 공증이 없습니다.** 다른 사용자 Mac에서는 Gatekeeper 차단/보안 경고가 발생할 수 있습니다. 회사 기기 정책에 따라 실행이 불가할 수 있으므로 사용자에게 시스템 보안 설정을 무리하게 해제하도록 요구하지 마세요.
- **Mac 앱 내 자동 업데이트는 비활성화**했습니다. 안전한 Mac 자동 업데이트에는 Developer ID 앱 서명과 자동 업데이트용 DMG+ZIP, `latest-mac.yml` 및 실제 Mac 검증이 필요합니다. Windows 자동 업데이트는 변경하지 않았습니다.
- macOS 로그인 시 자동 시작 스위치는 서명·공증 이전까지 숨깁니다.
- 기존 로컬 일정 데이터는 각 Mac의 사용자 앱 데이터 경로에 저장됩니다. Windows와 자동 동기화되지는 않습니다.

## 작업 순서

1. 패치 ZIP에서 파일을 꺼내 **기존 GitHub 프로젝트 루트에 덮어쓰기** 하세요. `.git` 폴더와 사용자 JSON 데이터는 건드리지 마세요.
2. GitHub Desktop에서 `v1.8.0 macOS beta installer`로 Commit하고 Push하세요.
3. 가장 최신 커밋에 **v1.8.0** 태그를 생성하여 Push하세요.
4. GitHub Actions에서 `windows-release` 성공 후 `mac-release` 작업이 실행됩니다. 두 작업 모두 초록색인지 확인하세요.
5. GitHub Releases v1.8.0에서 Windows `.exe`, `latest.yml`, **`KuunsKanbanCalendar-1.8.0-mac-universal.dmg`**가 보이는지 확인하세요.
6. Mac 동료에게 DMG를 직접 다운로드하고 설치하도록 요청하세요. Mac에서 **캘린더 열기, 날짜/기간 일정 작성, 종료 후 데이터 보존, 피드백 전송, 백업 및 알림** 순서로 확인합니다.

> 코드 서명되지 않은 Mac 앱은 회사의 보안 정책상 설치가 허용되지 않을 수 있습니다. 이 경우 무리하게 차단 해제하지 말고 Apple Developer ID 앱 서명/공증을 다음 단계로 진행하세요.

## 보안 후속 작업

Apple Developer ID Application 자격증명 및 macOS 앱 공증을 GitHub Secrets로 구성한 뒤 서명된 Universal DMG+ZIP을 생성하고 `latest-mac.yml`를 동일 Release에 게시해야 합니다. 코드 서명/공증 이전에 Mac 자동 업데이트를 켜지 마세요.
