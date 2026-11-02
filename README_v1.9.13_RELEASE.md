# KUN'S KANBAN CALENDAR v1.9.13

## 확정 패치노트

**일정 태그 입력 개선**

`@태그` 입력 후 Enter를 누르면 즉시 태그가 생성되도록 개선했습니다.

## 변경 사항

- 일정 제목에 `@쿤` 입력 후 Enter로 태그를 즉시 확정합니다.
- 한글 입력기(IME) 조합 중 Enter와 태그 확정 동작을 구분합니다.
- Enter로 태그를 만들 때 새 일정 저장이 실행되지 않도록 처리합니다.
- 기존 Space/포커스 이동 태그 생성, 색상 변경, 자유 태그, 공유 데이터 호환성을 유지합니다.
- 기존 v1.9.12 및 이전 버전 패치노트는 유지합니다.

## Windows CMD 테스트 및 배포

1. 기존 GitHub 프로젝트 루트에 `KUNS_KANBAN_CALENDAR_v1.9.13_PATCH.zip` 압축을 **내용 그대로** 덮어씁니다.
2. `RUN_v1.9.13_TESTS_CMD.bat`을 실행해 테스트가 통과하는지 확인합니다.
3. `PUBLISH_v1.9.13_CMD.bat`을 실행합니다.
4. 수정 목록에 관련 없는 파일이 없는지 확인한 후 `PUBLISH`를 입력합니다.
5. GitHub Actions의 Windows 및 macOS 빌드가 모두 성공하고 GitHub Release 파일이 생성되는지 확인합니다.
6. Windows/Mac 앱에서 `@쿤` 입력 후 Enter가 바로 태그 칩을 만드는지 실제 확인합니다.

### 유의 사항

- 프로젝트 폴더 경로(기존 사용자 환경): `C:\Users\master\Documents\GitHub\kuns-kanban-calendar`
- Windows 앱이 설치된 폴더가 아닌 **GitHub 소스 프로젝트 폴더**입니다.
- `git diff --cached --name-only`로 이미 등록 대기 중인 파일이 있다면 확인 후 등록 대기 해제가 필요할 수 있습니다.
- `git restore --staged .`는 파일의 편집 내용을 삭제하지 않고 Git 등록 대기 상태만 해제합니다.
- 스크립트의 `git diff --cached --check` 검사에서 오류가 생기면 수정 파일은 남겨 두고 등록 대기 상태만 해제하도록 했습니다.
- macOS/Windows 실사용 동작 검증 전이므로 테스트 통과만으로 전체 환경의 정상 작동을 보장하지 않습니다.
