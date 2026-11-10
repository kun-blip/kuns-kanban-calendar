@echo off
setlocal EnableExtensions
cd /d "%~dp0" || goto fail
chcp 65001 >nul
title KUNS KANBAN CALENDAR v1.9.22 - Release
echo ===============================================
echo  KUNS KANBAN CALENDAR v1.9.22 release (CMD)
echo ===============================================
where git.exe >nul 2>&1 || goto fail
where node.exe >nul 2>&1 || goto fail
where npm.cmd >nul 2>&1 || goto fail
for /f "delims=" %%V in ('node.exe -p "require('./package.json').version"') do set "VERSION=%%V"
if not "%VERSION%"=="1.9.22" (
 echo ERROR: Expected v1.9.22, found %VERSION%.
 goto fail
)
for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if not "%BRANCH%"=="main" (
 echo ERROR: Expected main branch, found %BRANCH%.
 goto fail
)
rem Do not overwrite any pre-existing staging selections.
git diff --cached --quiet
if errorlevel 1 (
 echo ERROR: Existing staged changes; review before publishing.
 echo Use: git diff --cached --name-only
 goto fail
)
git show-ref --quiet --verify refs/tags/v1.9.22
if not errorlevel 1 (
 echo ERROR: Local v1.9.22 tag already exists.
 goto fail
)
set "REMOTE_CHECK=%TEMP%\kuns-v1922-remote-tag-%RANDOM%.txt"
git ls-remote --tags origin refs/tags/v1.9.22 > "%REMOTE_CHECK%"
if errorlevel 1 (
 echo ERROR: Could not check remote v1.9.22 tag.
 del /q "%REMOTE_CHECK%" >nul 2>&1
 goto fail
)
for %%F in ("%REMOTE_CHECK%") do if %%~zF GTR 0 (
 echo ERROR: Remote v1.9.22 tag already exists.
 del /q "%REMOTE_CHECK%" >nul 2>&1
 goto fail
)
del /q "%REMOTE_CHECK%" >nul 2>&1
call "%~dp0RUN_v1.9.22_TESTS_CMD.bat" || goto fail
if exist "renderer\mini-office.js" (
 echo ERROR: Mini Office development files detected. Remove after backup before publishing.
 goto fail
)
if exist "renderer\office-sprites" (
 echo ERROR: Mini Office sprites detected. Remove after backup before publishing.
 goto fail
)
echo.
echo Review working directory status carefully:
git status --short
echo.
echo This release includes timeline row drag, account isolation and fresh-install cleanup.
echo Personal data is preserved; legacy import is opt-in.
echo IMPORTANT: Multi-device account synchronization still needs real Windows/Mac checks.
echo Feedback image server support may require Google Apps Script upgrade.
echo Only the explicitly listed release paths will be staged.
set /p "CONFIRM=Type PUBLISH to continue (any other input cancels): "
if not "%CONFIRM%"=="PUBLISH" (
 echo Publish cancelled.
 pause
 exit /b 0
)
git add -A -- package.json package-lock.json desktop/release-notes.json desktop/main.cjs || goto unstage
git add -A -- desktop/preload.cjs desktop/account-profiles.cjs desktop/feedback.cjs desktop/sharing-client.cjs || goto unstage
git add -A -- renderer/account-sync.js renderer/app.js renderer/index.html renderer/sharing.js || goto unstage
git add -A -- renderer/timeline-priority.js renderer/feedback-image.js test/account-profile-segregation-dev.test.cjs test/fresh-empty-install.test.cjs || goto unstage
git add -A -- test/timeline-feedback-image-cs-dev.test.cjs test/timeline-free-row-dnd.test.cjs test/timeline-order-dnd.test.cjs test/release-v1922.test.cjs || goto unstage
git add -A -- test/release-v1921.test.cjs test/release-v1910.test.cjs test/release-v1911.test.cjs test/release-v1912.test.cjs test/release-v1913.test.cjs || goto unstage
git add -A -- test/release-v1914.test.cjs test/release-v1915.test.cjs test/release-v1916.test.cjs test/release-v1917.test.cjs || goto unstage
git add -A -- test/release-v1918.test.cjs test/release-v198.test.cjs test/release-v199.test.cjs test/release-v1920-rollback.test.cjs || goto unstage
git add -A -- RUN_v1.9.22_TESTS_CMD.bat PUBLISH_v1.9.22_CMD.bat README_v1.9.22_RELEASE.md || goto unstage
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
set /p "FINALCONFIRM=Type PUBLISH again to commit and push v1.9.22: "
if not "%FINALCONFIRM%"=="PUBLISH" goto unstage
git commit -m "Timeline row drag and account-isolated profiles v1.9.22"
if errorlevel 1 goto fail
git push origin main || goto fail
git tag v1.9.22 || goto fail
git push origin v1.9.22 || goto fail
echo.
echo [OK] v1.9.22 tag pushed. Verify GitHub Actions and Windows/Mac Release files.
pause
exit /b 0
:unstage
echo [ERROR] Git validation cancelled or failed. Clearing only v1.9.22 staged paths.
git restore --staged -- package.json package-lock.json desktop/release-notes.json desktop/main.cjs >nul 2>&1
git restore --staged -- desktop/preload.cjs desktop/account-profiles.cjs desktop/feedback.cjs desktop/sharing-client.cjs >nul 2>&1
git restore --staged -- renderer/account-sync.js renderer/app.js renderer/index.html renderer/sharing.js >nul 2>&1
git restore --staged -- renderer/timeline-priority.js renderer/feedback-image.js test/account-profile-segregation-dev.test.cjs test/fresh-empty-install.test.cjs >nul 2>&1
git restore --staged -- test/timeline-feedback-image-cs-dev.test.cjs test/timeline-free-row-dnd.test.cjs test/timeline-order-dnd.test.cjs test/release-v1922.test.cjs >nul 2>&1
git restore --staged -- test/release-v1921.test.cjs test/release-v1910.test.cjs test/release-v1911.test.cjs test/release-v1912.test.cjs test/release-v1913.test.cjs >nul 2>&1
git restore --staged -- test/release-v1914.test.cjs test/release-v1915.test.cjs test/release-v1916.test.cjs test/release-v1917.test.cjs >nul 2>&1
git restore --staged -- test/release-v1918.test.cjs test/release-v198.test.cjs test/release-v199.test.cjs test/release-v1920-rollback.test.cjs >nul 2>&1
git restore --staged -- RUN_v1.9.22_TESTS_CMD.bat PUBLISH_v1.9.22_CMD.bat README_v1.9.22_RELEASE.md >nul 2>&1
:fail
echo [ERROR] Release not completed. Local edits remain intact.
pause
exit /b 1
