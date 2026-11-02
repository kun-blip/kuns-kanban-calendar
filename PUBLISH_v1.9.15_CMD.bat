@echo off
setlocal EnableExtensions
cd /d "%~dp0" || goto fail
chcp 65001 >nul
title KUNS KANBAN CALENDAR v1.9.15 - Release
echo =================================================
echo  v1.9.15 - GitHub release (CMD)
echo =================================================
where git.exe >nul 2>&1 || goto fail
where node.exe >nul 2>&1 || goto fail
where npm.cmd >nul 2>&1 || goto fail
for /f "delims=" %%V in ('node.exe -p "require('./package.json').version"') do set "VERSION=%%V"
if not "%VERSION%"=="1.9.15" (
 echo ERROR: Expected version 1.9.15, found %VERSION%.
 goto fail
)
for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if not "%BRANCH%"=="main" (
 echo ERROR: Expected main branch, found %BRANCH%.
 goto fail
)
git diff --cached --quiet
if errorlevel 1 (
 echo ERROR: Files are already staged. Review: git diff --cached --name-only
 echo To unstage without deleting edits: git restore --staged .
 goto fail
)
git rev-parse -q --verify refs/tags/v1.9.15 >nul 2>&1
if not errorlevel 1 (
 echo ERROR: Local v1.9.15 tag already exists.
 goto fail
)
git ls-remote --exit-code --tags origin refs/tags/v1.9.15 >nul 2>&1
if not errorlevel 1 (
 echo ERROR: Remote v1.9.15 tag already exists.
 goto fail
)
call npm.cmd test || goto fail
echo.
git status --short
echo.
echo This stages ONLY v1.9.15 release files, then pushes main and tag v1.9.15.
echo Do NOT proceed if listed edits include unrelated work.
set /p "CONFIRM=Type PUBLISH to continue (any other input cancels): "
if not "%CONFIRM%"=="PUBLISH" (
 echo Publish cancelled.
 pause
 exit /b 0
)
git add -- desktop/sharing-client.cjs renderer/app.js renderer/event-tags.js renderer/index.html renderer/planner.js renderer/tag-library.js package.json package-lock.json desktop/release-notes.json test/calendar-enhancements-draft.test.cjs test/custom-event-tags.test.cjs test/release-v198.test.cjs test/release-v199.test.cjs test/release-v1911.test.cjs test/release-v1912.test.cjs test/release-v1913.test.cjs test/release-v1914.test.cjs test/release-v1915.test.cjs test/tag-library.test.cjs test/tag-color-preview-dev.test.cjs test/weekend-single-day-timeline.test.cjs RUN_v1.9.15_TESTS_CMD.bat PUBLISH_v1.9.15_CMD.bat README_v1.9.15_RELEASE.md || goto fail
rem Respect Windows batch CRLF, but reject trailing whitespace in content.
git -c core.whitespace=cr-at-eol diff --cached --check
if errorlevel 1 goto unstage
git diff --cached --quiet
if not errorlevel 1 (
 echo ERROR: No staged changes. Check patch extraction.
 goto unstage
)
git commit -m "Improve tag UI and weekend event display v1.9.15"
if errorlevel 1 goto unstage
git push origin main || goto fail
git tag v1.9.15 || goto fail
git push origin v1.9.15 || goto fail
echo.
echo [OK] v1.9.15 tag pushed. Verify GitHub Actions and Release assets.
pause
exit /b 0
:unstage
echo [ERROR] Git validation failed. Unstaging v1.9.15 files only.
git restore --staged -- desktop/sharing-client.cjs renderer/app.js renderer/event-tags.js renderer/index.html renderer/planner.js renderer/tag-library.js package.json package-lock.json desktop/release-notes.json test/calendar-enhancements-draft.test.cjs test/custom-event-tags.test.cjs test/release-v198.test.cjs test/release-v199.test.cjs test/release-v1911.test.cjs test/release-v1912.test.cjs test/release-v1913.test.cjs test/release-v1914.test.cjs test/release-v1915.test.cjs test/tag-library.test.cjs test/tag-color-preview-dev.test.cjs test/weekend-single-day-timeline.test.cjs RUN_v1.9.15_TESTS_CMD.bat PUBLISH_v1.9.15_CMD.bat README_v1.9.15_RELEASE.md
:fail
echo [ERROR] Release not completed. Review output; local edits remain intact.
pause
exit /b 1
