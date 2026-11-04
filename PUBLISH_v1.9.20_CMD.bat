@echo off
setlocal EnableExtensions
cd /d "%~dp0" || goto fail
chcp 65001 >nul
title KUNS KANBAN CALENDAR v1.9.20 - Release
echo =================================================
echo  v1.9.20 - Rollback release (CMD)
echo =================================================
where git.exe >nul 2>&1 || goto fail
where node.exe >nul 2>&1 || goto fail
where npm.cmd >nul 2>&1 || goto fail
for /f "delims=" %%V in ('node.exe -p "require('./package.json').version"') do set "VERSION=%%V"
if not "%VERSION%"=="1.9.20" (
 echo ERROR: Expected v1.9.20, found %VERSION%.
 goto fail
)
for /f "delims=" %%B in ('git branch --show-current') do set "BRANCH=%%B"
if not "%BRANCH%"=="main" (
 echo ERROR: Expected main branch, found %BRANCH%.
 goto fail
)
git diff --cached --quiet
if errorlevel 1 (
 echo ERROR: Existing staged changes detected. Unstage separately before publishing.
 echo Review: git diff --cached --name-only
 goto fail
)
git show-ref --quiet --verify refs/tags/v1.9.20
if not errorlevel 1 (
 echo ERROR: Local v1.9.20 tag already exists.
 goto fail
)
git ls-remote --tags origin refs/tags/v1.9.20 > "%TEMP%\kuns-v1920-remote-tag.txt"
if errorlevel 1 (
 echo ERROR: Could not check remote tags. Check network and GitHub credentials.
 goto fail
)
for %%F in ("%TEMP%\kuns-v1920-remote-tag.txt") do if %%~zF GTR 0 (
 echo ERROR: Remote v1.9.20 tag already exists.
 goto fail
)
del /q "%TEMP%\kuns-v1920-remote-tag.txt" >nul 2>&1
call "%~dp0APPLY_v1.9.20_ROLLBACK_CMD.bat" || goto fail
call npm.cmd test || goto fail
echo.
git status --short
echo.
echo This release restores v1.9.18 UI behavior while publishing as v1.9.20.
echo Obsolete sticker files will be removed from Git; server data is preserved.
echo Review any unrelated changes above before continuing.
set /p "CONFIRM=Type PUBLISH to continue (any other input cancels): "
if not "%CONFIRM%"=="PUBLISH" (
 echo Publish cancelled.
 pause
 exit /b 0
)
git add -A -- desktop/main.cjs desktop/preload.cjs desktop/sharing-client.cjs renderer/app.js renderer/index.html renderer/sharing.js desktop/sticker-utils.cjs || goto unstage
git add -A -- renderer/stickers.js test/team-stickers-dev.test.cjs package-lock.json package.json desktop/release-notes.json test/release-v1919.test.cjs test/release-v1920-rollback.test.cjs || goto unstage
git add -A -- APPLY_v1.9.20_ROLLBACK_CMD.bat RUN_v1.9.20_TESTS_CMD.bat PUBLISH_v1.9.20_CMD.bat README_v1.9.20_RELEASE.md test/release-v1911.test.cjs test/release-v1912.test.cjs test/release-v1913.test.cjs || goto unstage
git add -A -- test/release-v1914.test.cjs test/release-v1915.test.cjs test/release-v1916.test.cjs test/release-v1917.test.cjs test/release-v1918.test.cjs test/release-v198.test.cjs test/release-v199.test.cjs || goto unstage
git -c core.whitespace=cr-at-eol diff --cached --check
if errorlevel 1 goto unstage
git diff --cached --quiet
if not errorlevel 1 (
 echo ERROR: Nothing staged.
 goto unstage
)
git commit -m "Remove team stickers and restore calendar UI v1.9.20"
if errorlevel 1 goto unstage
git push origin main || goto fail
git tag v1.9.20 || goto fail
git push origin v1.9.20 || goto fail
echo.
echo [OK] v1.9.20 tag pushed. Verify GitHub Actions and Release files.
pause
exit /b 0
:unstage
echo [ERROR] Git validation failed. Removing only v1.9.20 paths from staging.
git restore --staged -- desktop/main.cjs desktop/preload.cjs desktop/sharing-client.cjs renderer/app.js renderer/index.html renderer/sharing.js desktop/sticker-utils.cjs
git restore --staged -- renderer/stickers.js test/team-stickers-dev.test.cjs package-lock.json package.json desktop/release-notes.json test/release-v1919.test.cjs test/release-v1920-rollback.test.cjs
git restore --staged -- APPLY_v1.9.20_ROLLBACK_CMD.bat RUN_v1.9.20_TESTS_CMD.bat PUBLISH_v1.9.20_CMD.bat README_v1.9.20_RELEASE.md test/release-v1911.test.cjs test/release-v1912.test.cjs test/release-v1913.test.cjs
git restore --staged -- test/release-v1914.test.cjs test/release-v1915.test.cjs test/release-v1916.test.cjs test/release-v1917.test.cjs test/release-v1918.test.cjs test/release-v198.test.cjs test/release-v199.test.cjs
:fail
echo [ERROR] Release not completed. Local edits remain intact.
pause
exit /b 1
