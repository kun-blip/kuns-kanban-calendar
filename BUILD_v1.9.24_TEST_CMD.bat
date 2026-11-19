@echo off
setlocal EnableExtensions
cd /d "%~dp0" || exit /b 1
chcp 65001 >nul
title KUNS KANBAN CALENDAR v1.9.24 - Test Installer Only
echo Building v1.9.24 local TEST installer. No GitHub publishing.
where node.exe >nul 2>&1 || goto fail
where npm.cmd >nul 2>&1 || goto fail
node.exe -e "if(require('./package.json').version!=='1.9.24')process.exit(1)" || goto fail
call npm.cmd ci || goto fail
call npm.cmd test || goto fail
call npm.cmd run build:win || goto fail
echo [PASS] Local test installer is in dist.
echo Do not publish until the owner approves the release.
exit /b 0
:fail
echo [ERROR] Test build failed. Nothing was published.
pause
exit /b 1
