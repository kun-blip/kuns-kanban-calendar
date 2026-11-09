@echo off
setlocal EnableExtensions
cd /d "%~dp0" || goto fail
chcp 65001 >nul
title KUNS KANBAN CALENDAR v1.9.21 - Release
echo ===============================================
echo  KUNS KANBAN CALENDAR v1.9.21 release (CMD)
echo ===============================================
where git.exe >nul 2>&1 || goto fail
where node.exe >nul 2>&1 || goto fail
where npm.cmd >nul 2>&1 || goto fail
for /f "delims=" %%V in ('node.exe -p "require('./package.json').version"') do set "VERSION=%%V"
if not "%VERSION%"=="1.9.21" (
 echo ERROR: Expected v1.9.21, found %VERSION%.
 goto fail
)
for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if not "%BRANCH%"=="main" (
 echo ERROR: Expected main branch, found %BRANCH%.
 goto fail
)
git diff --cached --quiet
if errorlevel 1 (
 echo ERROR: Existing staged changes. Please review them before publishing.
 echo Use: git diff --cached --name-only
 goto fail
)
git show-ref --quiet --verify refs/tags/v1.9.21
if not errorlevel 1 (
 echo ERROR: Local v1.9.21 tag already exists.
 goto fail
)
set "REMOTE_CHECK=%TEMP%\kuns-v1921-remote-tag-%RANDOM%.txt"
git ls-remote --tags origin refs/tags/v1.9.21 > "%REMOTE_CHECK%"
if errorlevel 1 (
 echo ERROR: Could not check remote v1.9.21 tag.
 del /q "%REMOTE_CHECK%" >nul 2>&1
 goto fail
)
for %%F in ("%REMOTE_CHECK%") do if %%~zF GTR 0 (
 echo ERROR: Remote v1.9.21 tag already exists.
 del /q "%REMOTE_CHECK%" >nul 2>&1
 goto fail
)
del /q "%REMOTE_CHECK%" >nul 2>&1
call "%~dp0RUN_v1.9.21_TESTS_CMD.bat" || goto fail
echo.
echo Review working directory status carefully:
git status --short
echo.
echo This release adds shared-first timeline and opt-in account sync.
echo Personal data is preserved locally until account sync onboarding.
echo IMPORTANT: Two-device synchronization still requires Windows/Mac checks.
echo No Mini Office code is part of this release.
set /p "CONFIRM=Type PUBLISH to continue (any other input cancels): "
if not "%CONFIRM%"=="PUBLISH" (
 echo Publish cancelled.
 pause
 exit /b 0
)
git add -A -- desktop/main.cjs desktop/preload.cjs desktop/sharing-client.cjs renderer/account-sync.js renderer/app.js renderer/index.html renderer/sharing.js || goto unstage
git add -A -- renderer/timeline-priority.js desktop/release-notes.json package.json package-lock.json supabase/migrations/20261109000000_calendar_account_snapshots.sql || goto unstage
git add -A -- test/account-sync-cs-dev.test.cjs test/release-v1921.test.cjs test/release-v1920-rollback.test.cjs test/release-v198.test.cjs test/release-v1918.test.cjs || goto unstage
git add -A -- test/release-v1916.test.cjs test/release-v1913.test.cjs test/release-v1912.test.cjs test/release-v1914.test.cjs test/release-v1911.test.cjs || goto unstage
git add -A -- test/release-v1915.test.cjs test/release-v1917.test.cjs test/release-v199.test.cjs RUN_v1.9.21_TESTS_CMD.bat PUBLISH_v1.9.21_CMD.bat README_v1.9.21_RELEASE.md || goto unstage
git -c core.whitespace=cr-at-eol diff --cached --check
if errorlevel 1 goto unstage
git diff --cached --quiet
if not errorlevel 1 (
 echo ERROR: Nothing staged.
 goto unstage
)
echo.
echo Files being committed:
git diff --cached --name-status
echo.
set /p "FINALCONFIRM=Type PUBLISH again to commit and push v1.9.21: "
if not "%FINALCONFIRM%"=="PUBLISH" goto unstage
git commit -m "Prioritize shared timelines and add account sync v1.9.21"
if errorlevel 1 goto unstage
git push origin main || goto fail
git tag v1.9.21 || goto fail
git push origin v1.9.21 || goto fail
echo.
echo [OK] v1.9.21 tag pushed. Verify GitHub Actions and Release files.
pause
exit /b 0
:unstage
echo [ERROR] Git validation cancelled or failed. Removing only v1.9.21 paths from staging.
git restore --staged -- desktop/main.cjs desktop/preload.cjs desktop/sharing-client.cjs renderer/account-sync.js renderer/app.js renderer/index.html renderer/sharing.js >nul 2>&1
git restore --staged -- renderer/timeline-priority.js desktop/release-notes.json package.json package-lock.json supabase/migrations/20261109000000_calendar_account_snapshots.sql >nul 2>&1
git restore --staged -- test/account-sync-cs-dev.test.cjs test/release-v1921.test.cjs test/release-v1920-rollback.test.cjs test/release-v198.test.cjs test/release-v1918.test.cjs >nul 2>&1
git restore --staged -- test/release-v1916.test.cjs test/release-v1913.test.cjs test/release-v1912.test.cjs test/release-v1914.test.cjs test/release-v1911.test.cjs >nul 2>&1
git restore --staged -- test/release-v1915.test.cjs test/release-v1917.test.cjs test/release-v199.test.cjs RUN_v1.9.21_TESTS_CMD.bat PUBLISH_v1.9.21_CMD.bat README_v1.9.21_RELEASE.md >nul 2>&1
:fail
echo [ERROR] Release not completed. Local edits remain intact.
pause
exit /b 1
