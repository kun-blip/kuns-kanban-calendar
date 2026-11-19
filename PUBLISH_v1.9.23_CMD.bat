@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0" || goto fail
chcp 65001 >nul
set "GIT_PAGER=cat"
title KUNS KANBAN CALENDAR v1.9.23 - Publish
echo ==================================================
echo  KUNS KANBAN CALENDAR v1.9.23 release (CMD)
echo ==================================================
where git.exe >nul 2>&1 || goto fail
where node.exe >nul 2>&1 || goto fail
where npm.cmd >nul 2>&1 || goto fail
for /f "delims=" %%V in ('node.exe -p "require('./package.json').version"') do set "VERSION=%%V"
if not "%VERSION%"=="1.9.23" (
 echo ERROR: Expected v1.9.23, found %VERSION%.
 goto fail
)
for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if not "%BRANCH%"=="main" (
 echo ERROR: Expected main branch, found %BRANCH%.
 goto fail
)
rem Check the index, but never silently alter a user's existing staging selection.
git diff --cached --quiet
if errorlevel 1 (
 echo.
 echo Existing staged changes detected. Files currently staged:
 git --no-pager diff --cached --name-status
 echo.
 echo Only the staging selection will be cleared; working source files stay intact.
 set /p "INDEX_CONFIRM=Type UNSTAGE to clear the existing staging selection, or anything else to cancel: "
 if not "!INDEX_CONFIRM!"=="UNSTAGE" goto fail
 git restore --staged . || goto fail
 git diff --cached --quiet || goto fail
)
rem Forbid a duplicate local or remote release tag.
git show-ref --quiet --verify refs/tags/v1.9.23
if not errorlevel 1 (
 echo ERROR: Local v1.9.23 tag already exists; do not republish.
 goto fail
)
set "REMOTE_CHECK=%TEMP%\kuns-v1923-remote-tag-%RANDOM%.txt"
git ls-remote --tags origin refs/tags/v1.9.23 > "%REMOTE_CHECK%"
if errorlevel 1 (
 echo ERROR: Remote tag lookup failed.
 del /q "%REMOTE_CHECK%" >nul 2>&1
 goto fail
)
for %%F in ("%REMOTE_CHECK%") do if %%~zF GTR 0 (
 echo ERROR: Remote v1.9.23 tag already exists; do not republish.
 del /q "%REMOTE_CHECK%" >nul 2>&1
 goto fail
)
del /q "%REMOTE_CHECK%" >nul 2>&1
call "%~dp0RUN_v1.9.23_TESTS_CMD.bat" || goto fail
if exist "renderer\mini-office.js" (
 echo ERROR: Mini Office development code detected; do not publish.
 goto fail
)
if exist "renderer\office-sprites" (
 echo ERROR: Mini Office sprites detected; do not publish.
 goto fail
)
echo.
echo Review local working changes before release:
git status --short
echo.
echo v1.9.23 includes accepted invitation handling, compact toolbar and image feedback.
echo No user calendar data is cleared. Server-side auto-accept is already applied.
echo IMPORTANT: Google Apps Script image receiver must be deployed before users send screenshots.
echo The release will stage ONLY the specific files listed in the script.
set /p "CONFIRM=Type PUBLISH to stage v1.9.23 files (anything else cancels): "
if not "%CONFIRM%"=="PUBLISH" (
 echo Publish cancelled.
 pause
 exit /b 0
)
git add -A -- "package.json" "package-lock.json" "desktop/release-notes.json" "renderer/index.html" || goto unstage
git add -A -- "renderer/app.js" "renderer/account-sync.js" "renderer/sharing.js" "desktop/feedback.cjs" || goto unstage
git add -A -- "tools/FEEDBACK_APPS_SCRIPT_IMAGE_SUPPORT.gs" "supabase/migrations/20261113000000_trusted_invite_server_accept.sql" "test/cs-autoaccept-toolbar-feedback-dev.test.cjs" "test/timeline-feedback-image-cs-dev.test.cjs" || goto unstage
git add -A -- "test/release-v1923.test.cjs" "test/release-v1922.test.cjs" "RUN_v1.9.23_TESTS_CMD.bat" "PUBLISH_v1.9.23_CMD.bat" || goto unstage
git add -A -- "README_v1.9.23_RELEASE.md" "test/release-v1921.test.cjs" "test/release-v1917.test.cjs" "test/release-v1912.test.cjs" || goto unstage
git add -A -- "test/release-v198.test.cjs" "test/release-v199.test.cjs" "test/release-v1918.test.cjs" "test/release-v1913.test.cjs" || goto unstage
git add -A -- "test/release-v1914.test.cjs" "test/release-v1915.test.cjs" "test/release-v1911.test.cjs" "test/release-v1920-rollback.test.cjs" || goto unstage
git add -A -- "test/release-v1916.test.cjs" || goto unstage
git -c core.whitespace=cr-at-eol diff --cached --check
if errorlevel 1 goto unstage
git diff --cached --quiet
if not errorlevel 1 (
 echo ERROR: No release changes are staged.
 goto unstage
)
echo.
echo Files being committed (no pager):
git --no-pager diff --cached --name-status
echo.
set /p "FINALCONFIRM=Type PUBLISH again to commit and push v1.9.23: "
if not "!FINALCONFIRM!"=="PUBLISH" goto unstage
git commit -m "Improve auto-invite, toolbar, and screenshot feedback v1.9.23"
if errorlevel 1 goto fail
git push origin main || goto fail
git tag v1.9.23 || goto fail
git push origin v1.9.23 || goto fail
echo.
echo [OK] v1.9.23 tag pushed. Check GitHub Actions and Release assets.
pause
exit /b 0
:unstage
echo [ERROR] Release cancelled or failed validation. Only release paths will be unstaged.
git restore --staged -- "package.json" "package-lock.json" "desktop/release-notes.json" "renderer/index.html" >nul 2>&1
git restore --staged -- "renderer/app.js" "renderer/account-sync.js" "renderer/sharing.js" "desktop/feedback.cjs" >nul 2>&1
git restore --staged -- "tools/FEEDBACK_APPS_SCRIPT_IMAGE_SUPPORT.gs" "supabase/migrations/20261113000000_trusted_invite_server_accept.sql" "test/cs-autoaccept-toolbar-feedback-dev.test.cjs" "test/timeline-feedback-image-cs-dev.test.cjs" >nul 2>&1
git restore --staged -- "test/release-v1923.test.cjs" "test/release-v1922.test.cjs" "RUN_v1.9.23_TESTS_CMD.bat" "PUBLISH_v1.9.23_CMD.bat" >nul 2>&1
git restore --staged -- "README_v1.9.23_RELEASE.md" "test/release-v1921.test.cjs" "test/release-v1917.test.cjs" "test/release-v1912.test.cjs" >nul 2>&1
git restore --staged -- "test/release-v198.test.cjs" "test/release-v199.test.cjs" "test/release-v1918.test.cjs" "test/release-v1913.test.cjs" >nul 2>&1
git restore --staged -- "test/release-v1914.test.cjs" "test/release-v1915.test.cjs" "test/release-v1911.test.cjs" "test/release-v1920-rollback.test.cjs" >nul 2>&1
git restore --staged -- "test/release-v1916.test.cjs" >nul 2>&1
:fail
echo [ERROR] Release not completed. Local edits remain intact.
pause
exit /b 1
