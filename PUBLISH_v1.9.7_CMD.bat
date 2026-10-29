@echo off
setlocal EnableExtensions
cd /d "%~dp0" || goto fail
title KUNS KANBAN CALENDAR v1.9.7 - Release
 echo ================================================
 echo  v1.9.7 - GitHub tag release (CMD)
 echo ================================================
if not exist package.json goto fail
where git.exe >nul 2>&1 || goto fail
where npm.cmd >nul 2>&1 || goto fail
for /f "delims=" %%V in ('node.exe -p "require('./package.json').version"') do set "VERSION=%%V"
if not "%VERSION%"=="1.9.7" (
 echo ERROR: package.json version must be 1.9.7, got %VERSION%.
 goto fail
)
for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if not "%BRANCH%"=="main" (
 echo ERROR: Please switch to the main branch before publishing. Current: %BRANCH%
 goto fail
)
git diff --cached --quiet
if errorlevel 1 (
 echo ERROR: Unrelated changes are already staged. Please review/unstage them first.
 goto fail
)
git rev-parse -q --verify refs/tags/v1.9.7 >nul 2>&1
if not errorlevel 1 (
 echo ERROR: The v1.9.7 tag already exists locally. Nothing was pushed.
 goto fail
)
call npm.cmd test || goto fail
echo.
git status --short
echo.
echo This script will commit only the v1.9.7 fix files and push main + tag v1.9.7.
set /p "CONFIRM=Type PUBLISH to continue (any other input cancels): "
if not "%CONFIRM%"=="PUBLISH" (
 echo Publish cancelled.
 pause
 exit /b 0
)
git add -- renderer/sharing.js renderer/index.html package.json package-lock.json test/release-v196.test.cjs test/release-v197.test.cjs README_v1.9.7_GROUP_INVITE_FIX.md RUN_v1.9.7_TESTS_CMD.bat PUBLISH_v1.9.7_CMD.bat || goto fail
git diff --cached --quiet
if not errorlevel 1 (
 echo ERROR: No staged changes to commit.
 goto fail
)
git commit -m "Fix group invitations and shared calendar UI v1.9.7" || goto fail
git push origin main || goto fail
git tag v1.9.7 || goto fail
git push origin v1.9.7 || goto fail
echo.
echo [OK] Tag pushed. Check GitHub Actions and Release before using the update.
pause
exit /b 0
:fail
echo [ERROR] Release was not completed. Check the messages above.
pause
exit /b 1
