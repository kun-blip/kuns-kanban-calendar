@echo off
setlocal EnableExtensions
cd /d "%~dp0" || goto fail
title KUNS KANBAN CALENDAR v1.9.9 - Release
 echo ================================================
 echo  v1.9.9 - GitHub tag release (CMD)
 echo ================================================
if not exist package.json goto fail
where git.exe >nul 2>&1 || goto fail
where npm.cmd >nul 2>&1 || goto fail
for /f "delims=" %%V in ('node.exe -p "require('./package.json').version"') do set "VERSION=%%V"
if not "%VERSION%"=="1.9.9" (
 echo ERROR: package.json version must be 1.9.9, got %VERSION%.
 goto fail
)
for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if not "%BRANCH%"=="main" (
 echo ERROR: Please switch to main. Current: %BRANCH%
 goto fail
)
git diff --cached --quiet
if errorlevel 1 (
 echo ERROR: Other changes are already staged. Unstage/review them first.
 goto fail
)
git rev-parse -q --verify refs/tags/v1.9.9 >nul 2>&1
if not errorlevel 1 (
 echo ERROR: v1.9.9 tag already exists locally.
 goto fail
)
call npm.cmd test || goto fail
echo.
git status --short
echo.
echo This will commit v1.9.9 status UI, alignment, and release notes changes, then push main + tag v1.9.9.
set /p "CONFIRM=Type PUBLISH to continue (any other input cancels): "
if not "%CONFIRM%"=="PUBLISH" (
 echo Publish cancelled.
 pause
 exit /b 0
)
git add -- package.json package-lock.json desktop/release-notes.json renderer/index.html renderer/app.js renderer/sharing.js test/release-v196.test.cjs test/release-v198.test.cjs test/release-v199.test.cjs README_v1.9.9_UI_ALIGNMENT.md RUN_v1.9.9_TESTS_CMD.bat PUBLISH_v1.9.9_CMD.bat || goto fail
git diff --cached --quiet
if not errorlevel 1 (
 echo ERROR: No staged changes to commit.
 goto fail
)
git commit -m "Simplify status options and align fold controls v1.9.9" || goto fail
git push origin main || goto fail
git tag v1.9.9 || goto fail
git push origin v1.9.9 || goto fail
echo.
echo [OK] Tag pushed. Confirm GitHub Actions + Release before applying update.
pause
exit /b 0
:fail
echo [ERROR] Release was not completed. Review the messages above.
pause
exit /b 1
