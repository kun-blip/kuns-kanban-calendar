# KUN’S KANBAN CALENDAR — GitHub 자동 업데이트 설정

## 0. 먼저 이해할 점

이 프로젝트는 기존 Windows v1.5.4에서 이어지는 **v1.6.0**입니다. 기존 로컬 데이터 저장 위치 및 앱 식별자는 바꾸지 않았습니다.
이 첫 버전은 한 번 직접 설치해야 합니다. 이후 **v1.6.1**부터 새 릴리스를 감지하여 앱에서 다운로드/설치합니다. **자동 확인 / 설치 전 승인** 방식입니다.

GitHub 계정의 사용자명과 공개 저장소 이름은 아직 제공되지 않았으므로, 이 ZIP의 `package.json`에는 업데이트 주소가 들어 있지 않습니다. 이 상태로 빌드하면 자동 업데이트가 비활성화됩니다. **반드시 GitHub 설정을 먼저 해주세요.**

## 1. GitHub 공개 저장소 만들기

1. https://github.com/new 접속하여 로그인합니다.
2. Repository name 예: `kuns-kanban-calendar` (다른 이름도 가능).
3. **Public**을 선택하고 생성합니다. 원격 저장소에 회사 자료, 개인 일정 JSON, API 키가 들어가지 않도록 주의하세요.
4. 비공개 소스코드를 유지하려면 별도의 공개 업데이트 전용 저장소 구조가 필요합니다. 첫 설정은 단일 공개 저장소를 전제로 합니다.

## 2. 업데이트 주소 설정

1. ZIP을 전부 압축 해제합니다.
2. 프로젝트 루트(`package.json` 옆)의 **`CONFIGURE_GITHUB.bat`** 실행합니다.
3. GitHub 사용자명(owner)과 방금 만든 저장소 이름(repo)을 입력합니다.
4. `package.json`의 `build.publish`에 정확한 GitHub 주소가 기록됩니다. API 토큰, 비밀번호는 입력하지 않습니다.
5. **이 설정은 처음 릴리스 이후에는 가급적 변경하지 마세요.** 이미 설치된 앱은 최초 설정된 주소를 계속 확인합니다.

## 3. GitHub에 소스 업로드

가장 쉬운 방법: GitHub Desktop(https://desktop.github.com/)에서 `File → Add local repository`로 프로젝트 폴더를 열고, Git 저장소로 만든 뒤 GitHub 저장소로 Publish 또는 Push합니다. 반드시 2번에서 입력한 저장소와 같은 이름/계정인지 확인해 주세요.

Git이 설치되어 있다면 PowerShell 또는 Git Bash에서:

```bash
git init
git add .
git commit -m "Enable GitHub auto updates (v1.6.0)"
git branch -M main
git remote add origin https://github.com/OWNER/REPO.git
git push -u origin main
```

`OWNER/REPO`는 실제 GitHub 정보로 변경하세요. GitHub가 로그인/인증을 요구할 수 있습니다. `dist/`, `node_modules/`, 백업 JSON 파일은 GitHub에 올리지 마세요.

## 4. 최초 버전 릴리스 및 설치

Git에서 태그를 만들어 푸시하세요:

```bash
git tag v1.6.0
git push origin v1.6.0
```

GitHub 저장소 **Actions → Publish Windows app update**에서 빌드/릴리스 작업을 확인합니다. 성공하면 **Releases**에 `v1.6.0` 릴리스가 만들어지고, `KuunsKanbanCalendar-Setup-1.6.0-x64.exe`, `latest.yml` 등이 있어야 합니다.

**중요: Github Releases에 `latest.yml`이 없거나 릴리스가 Draft 상태면 업데이트 확인이 실패합니다.** GitHub Actions의 `contents: write` 권한이 허용돼야 합니다. 조직/저장소 설정에서 Actions 권한을 제한할 수 있습니다.

이제 기존 v1.5.4 앱에서 JSON 백업 → 트레이 완전 종료 → v1.6.0 설치 파일 실행 → 앱 상단 `업데이트` 클릭으로 상태 확인합니다. 변경된 기존 일정/메모는 앱 데이터 폴더에 남도록 설계했습니다.

## 5. 새 버전을 배포하고 자동 업데이트 테스트

1. 다음 수정본에서 `package.json` 버전을 **1.6.1**로 올립니다.
2. Github에 변경 사항을 커밋하고 `main`에 Push합니다.
3. `git tag v1.6.1`, `git push origin v1.6.1`.
4. Actions가 Windows NSIS 설치 파일과 `latest.yml`을 새 공개 Releases에 게시합니다.
5. 이미 설치된 v1.6.0 앱은 시작 약 15초 후, 이후 약 6시간마다 새 릴리스를 확인합니다. 또는 상단 `업데이트` 버튼으로 직접 확인합니다.
6. 새 버전 발견 → `다운로드` → `재시작하여 설치`를 누르면 설치 후 새 버전이 실행됩니다.

## 주의사항

- GitHub Releases와 앱 업데이트가 성공적으로 연결됐는지는 **실제 Windows PC에서 1.6.0 → 1.6.1 실전 테스트**로만 확인할 수 있습니다. 이 프로젝트는 그 연결을 준비한 상태이며 실제 GitHub 저장소에는 아직 게시되지 않았습니다.
- 공개 릴리스에서는 누구나 설치 파일을 내려받을 수 있습니다. 개인 일정 JSON / 메모는 앱에서 로컬로만 저장하고 릴리스에 포함하지 마세요.
- Windows SmartScreen 경고가 뜰 수 있습니다. 배포를 넓힐 경우 코드 서명도 고려하세요. **앱 업데이트에 서명 인증서가 없다는 이유만으로 GitHub 로그인 토큰을 앱에 내장하지 마세요.**
- 무료 공개 저장소/Actions에는 GitHub의 정책과 이용 한도가 적용됩니다.
- GitHub Release에는 **EXE, latest.yml 등 동일한 빌드의 파일**을 함께 올려야 합니다. `latest.yml`을 직접 수정하거나 다른 빌드의 EXE와 혼합하면 업데이트가 실패할 수 있습니다.
- Windows 설치 앱에서만 활성화되며 개발 실행(`npm start`)에서는 업데이트 검사가 비활성화됩니다.
