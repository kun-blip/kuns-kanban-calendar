@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0" || goto fail
chcp 65001 >nul
set "GIT_PAGER=cat"
title KUNS KANBAN CALENDAR v1.9.25 - Publish
echo ==============================================================
echo   KUNS KANBAN CALENDAR v1.9.25 approved final release
echo ==============================================================
where git.exe >nul 2>&1 || goto fail
where node.exe >nul 2>&1 || goto fail
where npm.cmd >nul 2>&1 || goto fail
for /f "delims=" %%V in ('node.exe -p "require('./package.json').version"') do set "VERSION=%%V"
if not "%VERSION%"=="1.9.25" (
  echo ERROR: Expected version 1.9.25. Found %VERSION%.
  goto fail
)
for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if not "%BRANCH%"=="main" (
  echo ERROR: Switch to the reviewed main branch first. Current: %BRANCH%.
  goto fail
)
git diff --cached --quiet
if errorlevel 1 (
  echo ERROR: Preexisting staged changes must be reviewed separately.
  git --no-pager diff --cached --name-status
  goto fail
)
git show-ref --quiet --verify refs/tags/v1.9.25
if not errorlevel 1 (
  echo ERROR: v1.9.25 already exists locally.
  goto fail
)
set "KUNS_REMOTE_TAG=%TEMP%\kuns-v1925-tag-%RANDOM%.txt"
git ls-remote --tags origin refs/tags/v1.9.25 > "!KUNS_REMOTE_TAG!"
if errorlevel 1 (
  del /q "!KUNS_REMOTE_TAG!" >nul 2>&1
  goto fail
)
for %%F in ("!KUNS_REMOTE_TAG!") do if %%~zF GTR 0 (
  echo ERROR: v1.9.25 already exists on GitHub.
  del /q "!KUNS_REMOTE_TAG!" >nul 2>&1
  goto fail
)
del /q "!KUNS_REMOTE_TAG!" >nul 2>&1
call npm.cmd test || goto fail
if exist "renderer\mini-office.js" goto fail
if exist "renderer\office-sprites" goto fail
echo.
echo BEFORE PUBLISH, confirm these manual checks:
echo  [ ] Production Slack owner-consent migration applied and verified
echo  [ ] Updated Edge Function deployed with sending OFF
echo  [ ] Database send_enabled=false, Secret SLACK_SEND_ENABLED=false
echo  [ ] Version and patch notes approved by owner (v1.9.25)
echo  [ ] GitHub repository is kun-blip/kuns-kanban-calendar
echo  [ ] Existing user calendar data must NOT be overwritten
set /p "CONFIRM=Type PUBLISH to stage approved release files, or anything else to cancel: "
if not "!CONFIRM!"=="PUBLISH" goto fail
git add -A -- "package.json" "package-lock.json" "desktop/feedback.cjs" "desktop/main.cjs" "desktop/preload.cjs" "desktop/release-notes.json" "desktop/sharing-client.cjs" || goto fail
git add -A -- "renderer/account-sync.js" "renderer/app.js" "renderer/index.html" "renderer/sharing.js" "renderer/slack-integration.js" || goto fail
git add -A -- "supabase/REGINA_ACTIVATION.md" "supabase/config.toml" "supabase/drafts" "supabase/functions" "supabase/migrations/20261113000000_trusted_invite_server_accept.sql" "supabase/migrations/20261118000000_slack_regina_staged.sql" || goto fail
git add -A -- "test" "tools/FEEDBACK_APPS_SCRIPT_IMAGE_SUPPORT.gs" "PUBLISH_v1.9.25_CMD.bat" "README_v1.9.25_RELEASE.md" || goto fail
git add -A -- "PUBLISH_v1.9.23_CMD.bat" "RUN_v1.9.23_TESTS_CMD.bat" "RUN_v1.9.24_TESTS_CMD.bat" "BUILD_v1.9.24_TEST_CMD.bat" || goto fail
git -c core.whitespace=cr-at-eol diff --cached --check
if errorlevel 1 goto fail
git diff --cached --quiet
if not errorlevel 1 goto fail
echo.
echo Exact files being committed:
git --no-pager diff --cached --name-status
echo.
set /p "FINALCONFIRM=Type PUBLISH again to commit and push v1.9.25: "
if not "!FINALCONFIRM!"=="PUBLISH" goto fail
git commit -m "Release v1.9.25 with Regina owner consent and consolidated UI" || goto fail
git push origin main || goto fail
git tag v1.9.25 || goto fail
git push origin v1.9.25 || goto fail
echo.
echo [OK] Tag v1.9.25 pushed. Verify GitHub Actions, the installer,
echo latest.yml and automatic update after the CI job completes.
echo Slack automatic dispatch must remain OFF until users consent in app.
pause
exit /b 0
:fail
echo.
echo [STOP] Release did not complete. If the failure happened after a push,
echo check GitHub before retrying: a commit or tag may already be online.
echo Review staged files with: git --no-pager diff --cached --name-status
echo Existing work files are preserved. Do not force reset.
pause
exit /b 1
