@echo off
setlocal EnableExtensions
cd /d "%~dp0" || goto fail
chcp 65001 >nul
title KUNS KANBAN CALENDAR v1.9.11 - Test
echo =================================================
echo  v1.9.11 TEST - No GitHub upload
echo =================================================
if not exist package.json goto fail
where node.exe >nul 2>&1 || goto fail
where npm.cmd >nul 2>&1 || goto fail
for /f "delims=" %%V in ('node.exe -p "require('./package.json').version"') do set "VERSION=%%V"
if not "%VERSION%"=="1.9.11" (
echo ERROR: package.json version is %VERSION%, expected 1.9.11
 goto fail
)
for %%F in (renderer\app.js renderer\sharing.js renderer\event-tags.js desktop\sharing-client.cjs renderer\release-notes.js) do (
 node.exe --check "%%F" || goto fail
)
call npm.cmd ci --no-audit --no-fund || goto fail
call npm.cmd test || goto fail
echo.
echo [OK] v1.9.11 tests passed. No release was published.
pause
exit /b 0
:fail
echo [ERROR] Tests failed. Do not publish.
pause
exit /b 1
