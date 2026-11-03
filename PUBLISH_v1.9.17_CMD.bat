@echo off
setlocal EnableExtensions
cd /d "%~dp0" || goto fail
chcp 65001 >nul
title KUNS KANBAN CALENDAR v1.9.17 - Release
echo =================================================
echo  v1.9.17 - GitHub release (CMD)
echo =================================================
where git.exe >nul 2>&1 || goto fail
where node.exe >nul 2>&1 || goto fail
where npm.cmd >nul 2>&1 || goto fail
for /f "delims=" %%V in ('node.exe -p "require('./package.json').version"') do set "VERSION=%%V"
if not "%VERSION%"=="1.9.17" (
 echo ERROR: Expected version 1.9.17, found %VERSION%.
 goto fail
)
for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if not "%BRANCH%"=="main" (
 echo ERROR: Expected main branch, found %BRANCH%.
 goto fail
)
git diff --cached --quiet
if errorlevel 1 (
 echo ERROR: Existing staged files. Review: git diff --cached --name-only
 echo To unstage without deleting changes: git restore --staged .
 goto fail
)
git rev-parse -q --verify refs/tags/v1.9.17 >nul 2>&1
if not errorlevel 1 (
 echo ERROR: Local v1.9.17 tag already exists.
 goto fail
)
git ls-remote --exit-code --tags origin refs/tags/v1.9.17 >nul 2>&1
if not errorlevel 1 (
 echo ERROR: Remote v1.9.17 tag already exists.
 goto fail
)
call npm.cmd test || goto fail
echo.
git status --short
echo.
echo Only the v1.9.17 release files will be staged.
echo Do NOT proceed if unrelated changes are present.
set /p "CONFIRM=Type PUBLISH to continue (any other input cancels): "
if not "%CONFIRM%"=="PUBLISH" (
 echo Publish cancelled.
 pause
 exit /b 0
)
git add -- PUBLISH_v1.9.17_CMD.bat README_v1.9.17_RELEASE.md RUN_v1.9.17_TESTS_CMD.bat desktop/release-notes.json desktop/sharing-client.cjs package-lock.json package.json test/release-v1911.test.cjs test/release-v1912.test.cjs test/release-v1913.test.cjs test/release-v1914.test.cjs test/release-v1915.test.cjs test/release-v1916.test.cjs test/release-v1917.test.cjs test/release-v198.test.cjs test/release-v199.test.cjs test/sharing-upgrade-continuity-dev.test.cjs || goto fail
rem Windows CRLF is valid. Reject actual trailing whitespace.
git -c core.whitespace=cr-at-eol diff --cached --check
if errorlevel 1 goto unstage
git diff --cached --quiet
if not errorlevel 1 (
 echo ERROR: Nothing staged.
 goto unstage
)
git commit -m "Preserve shared event history and authorship v1.9.17"
if errorlevel 1 goto unstage
git push origin main || goto fail
git tag v1.9.17 || goto fail
git push origin v1.9.17 || goto fail
echo.
echo [OK] v1.9.17 tag pushed. Verify GitHub Actions and Release assets.
pause
exit /b 0
:unstage
echo [ERROR] Git validation failed. Unstaging only v1.9.17 release files.
git restore --staged -- PUBLISH_v1.9.17_CMD.bat README_v1.9.17_RELEASE.md RUN_v1.9.17_TESTS_CMD.bat desktop/release-notes.json desktop/sharing-client.cjs package-lock.json package.json test/release-v1911.test.cjs test/release-v1912.test.cjs test/release-v1913.test.cjs test/release-v1914.test.cjs test/release-v1915.test.cjs test/release-v1916.test.cjs test/release-v1917.test.cjs test/release-v198.test.cjs test/release-v199.test.cjs test/sharing-upgrade-continuity-dev.test.cjs
:fail
echo [ERROR] Release not completed. Local edits remain intact.
pause
exit /b 1
