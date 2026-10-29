@echo off
setlocal EnableExtensions
cd /d "%~dp0" || goto fail
title KUNS KANBAN CALENDAR v1.9.10 - Release
echo ================================================
echo   v1.9.10 - GitHub tag release (CMD)
echo ================================================
if not exist package.json goto fail
where git.exe >nul 2>&1 || goto fail
where node.exe >nul 2>&1 || goto fail
where npm.cmd >nul 2>&1 || goto fail
for /f "delims=" %%V in ('node.exe -p "require('./package.json').version"') do set "VERSION=%%V"
if not "%VERSION%"=="1.9.10" (
 echo ERROR: package.json version must be 1.9.10, got %VERSION%.
 goto fail
)
for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if not "%BRANCH%"=="main" (
 echo ERROR: Please switch to main. Current: %BRANCH%
 goto fail
)
git diff --cached --quiet
if errorlevel 1 (
 echo ERROR: Other changes are already staged. Unstage and review them first.
 goto fail
)
git rev-parse -q --verify refs/tags/v1.9.10 >nul 2>&1
if not errorlevel 1 (
 echo ERROR: v1.9.10 tag already exists locally.
 goto fail
)
call npm.cmd test || goto fail
echo.
git status --short
echo.
echo Only the following v1.9.10 files will be committed.
echo This will push main and tag v1.9.10 to GitHub.
set /p "CONFIRM=Type PUBLISH to continue (any other input cancels): "
if not "%CONFIRM%"=="PUBLISH" (
 echo Publish cancelled.
 pause
 exit /b 0
)
git add -- package.json package-lock.json desktop/release-notes.json desktop/update-controller.cjs renderer/index.html renderer/update-center.js renderer/sharing.js test/release-v1910.test.cjs test/release-v199.test.cjs test/release-v198.test.cjs test/update-center.test.cjs README_v1.9.10_MAC_BLUE_DOTS.md RUN_v1.9.10_TESTS_CMD.bat PUBLISH_v1.9.10_CMD.bat || goto fail
git diff --cached --quiet
if not errorlevel 1 (
 echo ERROR: No staged changes. Confirm this patch was copied into the project.
 goto fail
)
git commit -m "Add Mac release notices and blue attention dots v1.9.10" || goto fail
git push origin main || goto fail
git tag v1.9.10 || goto fail
git push origin v1.9.10 || goto fail
echo.
echo [OK] Tag pushed. Confirm GitHub Actions and GitHub Release.
pause
exit /b 0
:fail
echo [ERROR] Release was not completed. Review the messages above.
pause
exit /b 1
