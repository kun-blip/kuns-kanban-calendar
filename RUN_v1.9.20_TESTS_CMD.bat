@echo off
setlocal EnableExtensions
cd /d "%~dp0" || goto fail
chcp 65001 >nul
title KUNS KANBAN CALENDAR v1.9.20 - Rollback Tests
echo =================================================
echo  v1.9.20 rollback tests - No GitHub upload
echo =================================================
where node.exe >nul 2>&1 || goto fail
where npm.cmd >nul 2>&1 || goto fail
for /f "delims=" %%V in ('node.exe -p "require('./package.json').version"') do set "VERSION=%%V"
if not "%VERSION%"=="1.9.20" (
 echo ERROR: Expected version 1.9.20, found %VERSION%.
 goto fail
)
call "%~dp0APPLY_v1.9.20_ROLLBACK_CMD.bat" || goto fail
for %%F in (renderer\app.js renderer\sharing.js desktop\sharing-client.cjs desktop\main.cjs desktop\preload.cjs desktop\update-controller.cjs) do (
 node.exe --check "%%F" || goto fail
)
call npm.cmd ci --no-audit --no-fund || goto fail
call npm.cmd test || goto fail
echo.
echo [OK] v1.9.20 rollback tests passed. Release has NOT been published.
pause
exit /b 0
:fail
echo [ERROR] Tests failed. Do not publish.
pause
exit /b 1
