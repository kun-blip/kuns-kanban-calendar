# KUN'S KANBAN CALENDAR v1.9.21 — release guide

**Target for PATCH:** v1.9.20 repository source (NOT the installed application folder).
**Project folder:** `C:\Users\master\Documents\GitHub\kuns-kanban-calendar`

## Approved in-app update notes

**01. 공유 일정 우선 표시**

여러 일정이 겹칠 때 공유 중인 일정을 타임라인 상단에 우선 표시하도록 개선했어요.

**02. 계정 기반 데이터 동기화**

개인 일정과 메모, 할 일 등을 계정에 저장하고 다른 기기에서도 확인할 수 있도록 계정 동기화 기능을 추가했어요.

## Important safety notes

- **This package does not deploy itself.** GitHub tags, Releases and Windows/Mac installers are not created until the user runs the PUBLISH CMD and the GitHub Actions build succeeds.
- Mini Office code is NOT included. If an earlier experimental Mini Office patch remains on the PC, restore or back up the repository before applying this release. Old untracked Mini Office source files might remain on disk but are not included in the official ZIP and are not staged by the publish script.
- The production Supabase `calendar_account_snapshots` table and owner-only RLS were created earlier. **Do not apply the SQL migration again.** A migration source copy is shipped for version control/audit.
- Existing user data is kept in the original PC until they explicitly connect an account via the new **☁ 연결하기** button. An existing signed-in sharing account does not automatically imply personal data was uploaded.
- Incoming shared event rows remain in the old sharing system and are not duplicated in account snapshots.
- Sync snapshot covers personal schedules, memos, Daily Todo, tag library, game list, quick links, recent colors. Theme and window preferences remain per-device.
- **The first version does NOT merge simultaneous edits** across devices; if a revision conflict occurs, it asks to select account or PC data. Back up both PCs before choosing to overwrite.
- **Data is still cached on the local operating-system profile after sign-out.** Do not switch between private accounts in the same Windows user profile if private data isolation is required. This will need a separate account-isolation improvement.
- Real Windows/Mac multi-device integration and simultaneous-edit tests are pending; automated tests alone cannot guarantee cross-device behavior.

## Apply/test/publish

1. Back up the whole repository at `C:\Users\master\Documents\GitHub\kuns-kanban-calendar` and export/backup the current installed calendar's personal data.
2. Close installed calendar fully from Windows tray.
3. Extract `KUNS_KANBAN_CALENDAR_v1.9.21_PATCH.zip` into **the same project root as `package.json`**. Preserve folder layout; allow overwrite. Do not add an extra ZIP-name subfolder.
4. Run `RUN_v1.9.21_TESTS_CMD.bat` from the project root. If it fails, **stop**.
5. Before official publication, run `npm start`, check the shared-first timeline UI, and test account sync in two clean Windows user profiles or two separate PCs.
6. Run `PUBLISH_v1.9.21_CMD.bat`, review `git status` and the staged file list. It will only stage the approved release files; **type `PUBLISH` twice** to commit/push `main` and the new tag.
7. Verify both Windows and Mac workflow results and downloadable assets on GitHub Release v1.9.21. The release is not considered validated until tested with real users/devices.

### First account sync onboarding

- PC A: Sign in through **일정 공유** using the same account as collaborators, then choose **☁ 연결하기** to upload that PC's local personal schedule.
- PC B: Sign into the same account. A clean install can download automatically after backup; otherwise choose which dataset to keep and make backups first.
- If both devices have unsynchronized local changes, **avoid selecting overwrite until those changes are backed up and reconciled**.

## Delivery files

- `KUNS_KANBAN_CALENDAR_v1.9.21_PATCH.zip`: minimal changed/new files, copy to existing repository
- `KUNS_KANBAN_CALENDAR_v1.9.21_SOURCE.zip`: complete source snapshot for backup or clean source checkout
- `RUN_v1.9.21_TESTS_CMD.bat`, `PUBLISH_v1.9.21_CMD.bat`: included in both archives
