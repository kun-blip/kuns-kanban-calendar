# KUN’S KANBAN CALENDAR v1.8.3 — macOS 앱 실행 검증판

## 확인된 현상
- v1.8.1과 v1.8.2 모두 Apple Silicon / macOS 26.5.2에서 메인 스레드의 `EXC_BREAKPOINT (SIGTRAP)`로 종료.
- 두 충돌 보고서의 Electron 프레임 상대 오프셋이 동일. 서명 변경만으로 해결되지 않음.

## 유력한 원인 및 변경
- 현재 프로젝트의 electron-builder 26.x에서 **한글 `productName`**을 사용하면, 앱 이름의 유니코드 정규화(NFC/NFD) 차이로 `CFBundleName`과 실제 Helper 번들명이 달라질 수 있음. 참고: electron-builder #9771 및 #9962.
- Windows의 기존 앱 이름과 appId는 그대로 유지하고, **Mac 빌드에만 `-c.productName=KuunsKanbanCalendar`**를 적용. Mac 패키징의 앱/헬퍼 번들은 안전한 ASCII 이름이 되며, macOS 표시 이름은 `CFBundleDisplayName=쿤스 칸반 캘린더` 유지.
- Mac runner를 macOS 26 Apple Silicon으로 변경.
- 빌드 과정에서 `.app`의 `CFBundleName`, `CFBundleExecutable` 및 모든 Helper 번들의 일치 여부 검사.
- 코드 서명만 확인하던 이전 방식과 달리, 패키징된 Mac 실행 파일을 **실제로 실행해 12초 이상 유지되는지 확인**한 후 GitHub Release에 DMG 업로드. 앱 조기 종료 시 빌드를 실패 처리하고 시작 로그 출력.
- Mac 자동 업데이트는 여전히 비활성화. Apple Developer ID/공증도 미적용.

## 배포/검증
1. 프로젝트 백업. 이 ZIP의 파일을 GitHub 프로젝트 루트에 복사. 기존 `.git`을 삭제하지 말 것.
2. GitHub Desktop: `Fix macOS Unicode helper startup v1.8.3` Commit/Push → 최신 커밋에 `v1.8.3` 태그 생성/Push.
3. Actions에서 Windows와 Mac 작업 확인. **Mac 단계 `Check macOS executable and helper bundle names` 및 `Launch built Mac app on macOS 26 Apple Silicon`**를 반드시 확인.
4. Actions가 모두 통과한 뒤에만 Mac 동료에게 v1.8.3 DMG 새로 내려받아 교체 설치를 요청. 회사 보안 정책이 허용하는 환경에서만 실행 테스트.
5. Mac에서 정식 검증 전까지 시험판. 기존 일정/메모는 삭제하지 말 것.

## 제한 사항
- Linux/Windows 환경에서 JS 테스트로 macOS 실행 성공까지 검증할 수 없음.
- GitHub macOS 26 runner에서 통과하더라도 동료 Mac에서의 최종 확인은 필요.
- 서명되지 않은 임시 시험판의 Gatekeeper 경고가 남을 수 있음. 공증 및 Mac 자동 업데이트는 별도 작업.
- 이 수정은 보고된 문제와 일치하는 알려진 패키징 오류에 대한 우회 및 검증 조치이며, 해결을 보장하는 것은 아님.
