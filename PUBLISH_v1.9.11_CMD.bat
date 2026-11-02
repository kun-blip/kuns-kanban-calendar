@echo off
setlocal EnableExtensions
cd /d "%~dp0" || goto fail
chcp 65001 >nul
title KUNS KANBAN CALENDAR v1.9.11 - Release
echo =================================================
echo  v1.9.11 - GitHub release (CMD)
echo =================================================
if not exist package.json goto fail
where git.exe >nul 2>&1 || goto fail
where node.exe >nul 2>&1 || goto fail
where npm.cmd >nul 2>&1 || goto fail
for /f "delims=" %%V in ('node.exe -p "require('./package.json').version"') do set "VERSION=%%V"
if not "%VERSION%"=="1.9.11" (
 echo ERROR: Expected v1.9.11 but found %VERSION%.
 goto fail
)
for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if not "%BRANCH%"=="main" (
 echo ERROR: Switch to main before publishing. Current: %BRANCH%.
 goto fail
)
git diff --cached --quiet
if errorlevel 1 (
 echo ERROR: Other files are already staged. Unstage and review first.
 goto fail
)
git rev-parse -q --verify refs/tags/v1.9.11 >nul 2>&1
if not errorlevel 1 (
 echo ERROR: v1.9.11 local tag already exists. Avoid duplicate publishing.
 goto fail
)
git ls-remote --exit-code --tags origin refs/tags/v1.9.11 >nul 2>&1
if not errorlevel 1 (
 echo ERROR: v1.9.11 remote tag already exists. Do not publish twice.
 goto fail
)
call npm.cmd test || goto fail
echo.
git status --short
echo.
echo Only the v1.9.11 files listed in this script will be committed.
echo This pushes main and tag v1.9.11 to GitHub and triggers Actions.
echo Do NOT proceed if you have unrelated local changes in those files.
set /p "CONFIRM=Type PUBLISH to continue (other input cancels): "
if not "%CONFIRM%"=="PUBLISH" (
 echo Publish cancelled.
 pause
 exit /b 0
)
git add -- package.json package-lock.json desktop/release-notes.json renderer/app.js renderer/index.html renderer/sharing.js renderer/event-tags.js desktop/sharing-client.cjs test/sharing.test.cjs test/calendar-enhancements-draft.test.cjs test/release-v1910.test.cjs test/release-v198.test.cjs test/release-v199.test.cjs test/release-v1911.test.cjs RUN_v1.9.11_TESTS_CMD.bat PUBLISH_v1.9.11_CMD.bat README_v1.9.11_RELEASE.md || goto fail
git diff --cached --quiet
if not errorlevel 1 (
 echo ERROR: No staged changes. Confirm correct patch extraction.
 goto fail
)
git diff --cached --check || goto fail
git commit -m "Improve calendar sharing sync and timeline editing v1.9.11" || goto fail
git push origin main || goto fail
git tag v1.9.11 || goto fail
git push origin v1.9.11 || goto fail
echo.
echo [OK] v1.9.11 tag pushed. Confirm GitHub Actions and Release assets.
pause
exit /b 0
:fail
echo [ERROR] Release not completed. Review error output.
pause
exit /b 1
