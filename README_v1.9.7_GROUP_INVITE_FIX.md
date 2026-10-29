# KUN'S KANBAN CALENDAR v1.9.7 — 그룹 초대 및 UI 수정

**기준 소스**: v1.9.6 · **목표 버전**: v1.9.7 · **데이터 마이그레이션**: 없음

## 수정 내역

1. 일정 생성/수정 창에서 등록된 동료 그룹을 드롭다운으로 선택하면 **그룹 전체가 한 줄로 추가**됩니다. 아래에 그룹원 이름을 모두 펼치지 않습니다. 그룹 한 줄의 `보기만` / `편집 가능` 권한이 그룹원 전체에 적용됩니다.
2. 동료 단독 초대는 검색어를 입력한 경우에만 후보를 보여주고, 그룹으로 이미 선택된 사람은 중복 선택되지 않습니다. 실제 초대 전에는 현재 그룹원 명단을 개별 이메일 목록으로 변환해 기존 공유 서버 API에 전달합니다(기존 20명 상한 유지, 초과 시 경고).
3. 이미 공유 중인 일정의 `일정 초대 및 공유` 관리 화면에도 동일한 그룹 단위 일괄 초대를 추가했습니다.
4. 일정 등록/수정 모달의 **스크롤 영역과 하단 저장 버튼을 분리**했습니다. 내용만 스크롤되며 `취소` / `저장하기` 버튼은 고정됩니다.
5. `작업 체크리스트`와 `자세한 메모` 접이식 영역의 배경·테두리·간격을 통일했습니다. 다크 모드도 동일합니다.
6. `일정 초대 및 공유` 창 오른쪽 `X`를 가로 36px / 세로 36px 고정 크기로 수정했습니다.
7. `동료 관리 > 동료 그룹 관리` 내부의 각 그룹별 목록을 따로 접고 펼칠 수 있습니다. 화면을 새로고침해도 펼침 상태를 기억합니다. 그룹이 없는 연락처도 별도 접이식 목록으로 관리합니다.

**기존 일정·체크리스트·동료 주소록·공유 권한 데이터 자체는 변경하지 않습니다.** 백엔드/DB 변경 없이 UI와 로컬 렌더러만 수정합니다.

## 적용 (CMD / Windows)

기존 앱에서 데이터를 백업해 두고, **앱을 닫은 다음** 진행하세요.

1. GitHub 프로젝트의 실제 루트 폴더(`package.json`이 있는 폴더)를 엽니다. 예: `C:\Users\master\Documents\GitHub\kuns-kanban-calendar`.
2. `KUNS_KANBAN_CALENDAR_v1.9.7_PATCH.zip`을 **그 프로젝트 루트에 풀어 덮어씁니다.** `renderer`, `test` 폴더가 기존 폴더와 병합되어야 합니다. ZIP 최상위 폴더를 새로 만들지 마세요.
3. 프로젝트 루트에서 `RUN_v1.9.7_TESTS_CMD.bat`을 더블클릭하거나 `CMD`에서 실행합니다. Node.js 설치가 필요합니다.
4. 테스트 성공 및 파일 변경 상태를 확인합니다. GitHub 배포를 진행하려면 `PUBLISH_v1.9.7_CMD.bat`을 프로젝트 루트에서 실행합니다. 해당 스크립트는 `main` 브랜치를 확인하고 동의를 받은 뒤 명시된 패치 파일만 커밋·푸시하고 `v1.9.7` 태그를 푸시합니다.
5. 태그가 올라가면 저장소의 GitHub Actions가 Windows 설치 프로그램 빌드 및 GitHub Release 발행을 수행합니다. **배포 성공과 사용자 PC 업데이트는 아직 별도 확인이 필요합니다.**

### CMD 수동 명령 (BAT 대신 실행 가능)

```bat
cd /d "C:\Users\master\Documents\GitHub\kuns-kanban-calendar"
npm.cmd ci --no-audit --no-fund
npm.cmd test
node.exe --check renderer\sharing.js
git status --short
git add renderer\sharing.js renderer\index.html package.json package-lock.json test\release-v196.test.cjs test\release-v197.test.cjs README_v1.9.7_GROUP_INVITE_FIX.md RUN_v1.9.7_TESTS_CMD.bat PUBLISH_v1.9.7_CMD.bat
git commit -m "Fix group invitations and shared calendar UI v1.9.7"
git push origin main
git tag v1.9.7
git push origin v1.9.7
```

배포용 Git 명령은 **반드시 테스트와 변경 검토 이후** 실행하세요. 이미 동일한 태그가 있으면 새 태그를 만들지 마세요.

## 테스트 결과

- `node --check renderer/sharing.js`: 통과
- `npm test`: **98건 통과 / 0건 실패** (2026-10-29)
- 신규 테스트: 그룹 일괄 선택, 그룹 권한 전체 반영, 그룹 제거, 검색 결과 기본 접힘, 그룹별 동료 목록 접기/상태 유지, 기존 공유 일정 그룹 초대, 여러 그룹 동시 선택, CSS 정적 검증
- Windows GUI 수동 테스트 및 실제 GitHub Actions 빌드는 **미실행**. 실제 UI와 설치형 업데이트까지 확인 후 완료로 판단해 주세요.

## 검수 순서

- [ ] 새 일정 → 초대 그룹 선택 → 항목 1줄 표시 → 편집 권한 선택 → 저장 완료
- [ ] 기존 공유 일정 → 동료 초대 → 그룹 선택 → 구성원 전체 권한 확인
- [ ] 저장 버튼이 창 맨 아래에 보이고 스크롤 시 계속 표시되는지
- [ ] 체크리스트 / 메모 색과 테두리가 같게 보이는지 (다크 모드)
- [ ] 공유창 닫기 X가 정사각형인지
- [ ] 동료 관리 → 동료 그룹 관리 → 각 동료 목록 접기/펼치기
