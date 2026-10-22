# KUN’S KANBAN CALENDAR — v1.6.2 자동 업데이트 복구

## 원인
이전 버전이 설치된 앱 내부의 `package.json`에서 `build.publish`를 찾습니다. 패키징된 `package.json`은 빌드 설정이 제거될 수 있으므로, 공개 GitHub 릴리스가 올바르게 올라가도 “GitHub Releases 주소를 설정해야...” 오류가 발생했습니다.

## 수정
- `desktop/release-config.json`으로 런타임 업데이트 대상 주소를 안전하게 포함
- `electron-updater.setFeedURL`에 공개 GitHub 주소 명시
- 설정 배치 파일이 `package.json`과 `desktop/release-config.json` 둘 다 쓰도록 개선
- 패키지 빌드 전 일치성 검사
- 패키징된 메타데이터에서 `build.publish`가 없을 때의 회귀 테스트 추가

## 꼭 필요한 최초 수동 설치
현재 v1.6.0~1.6.1은 업데이트 기능이 `disabled`이므로 이 버전을 자동으로 받을 수 없습니다.
1. 기존 앱에서 JSON 백업을 다운로드합니다.
2. GitHub Desktop에서 `Repository → Show in Explorer`를 누릅니다.
3. **패치 ZIP**을 이용한다면 ZIP 안의 `desktop`, `scripts`, `test` 폴더를 **GitHub 저장소 루트**에 덮어씁니다. `.git`, `node_modules`, `dist`는 건드리지 마세요.
4. 저장소 폴더에서 CMD를 열어 `npm version 1.6.2 --no-git-tag-version`을 실행합니다. 이 명령은 `package.json`과 `package-lock.json` 버전을 함께 변경합니다. 다음으로 `node scripts\check-github.cjs`를 실행해 저장소 주소를 확인하세요. 이미 버전이 1.6.2인 전체 프로젝트 ZIP을 복사한 경우에는 `npm install --package-lock-only --ignore-scripts --no-audit --no-fund`로 잠금 파일을 맞추면 됩니다.
5. GitHub Desktop에서 커밋 `Fix packaged update feed (v1.6.2)` 및 Push origin.
6. `v1.6.2` 태그를 생성하고 GitHub에 Push합니다. Actions가 성공하면 릴리스에 exe, latest.yml이 생깁니다.
7. **이번 버전만** GitHub Releases의 `KuunsKanbanCalendar-Setup-1.6.2-x64.exe`를 직접 받아 기존 앱을 완전히 종료한 뒤 덮어쓰기 설치합니다.
8. 업데이트 버튼을 눌러 `현재 최신 버전`을 확인합니다. 이후 `v1.6.3`을 발행하여 자동 업데이트를 검증할 수 있습니다.

**참고**: 앱 데이터 저장 경로와 ID를 변경하지 않았으므로 기존 개인 일정은 유지되도록 설계했습니다. 중요한 데이터는 먼저 JSON으로 백업해 두세요. 코드 서명이 없는 앱은 Windows 보안 경고가 나올 수 있습니다.
