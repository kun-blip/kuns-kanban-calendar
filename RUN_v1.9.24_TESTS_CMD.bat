@echo off
setlocal EnableExtensions
cd /d "%~dp0" || exit /b 1
chcp 65001 >nul
title KUNS KANBAN CALENDAR v1.9.24 - Tests
echo KUNS KANBAN CALENDAR v1.9.24 tests
where node.exe >nul 2>&1 || goto fail
where npm.cmd >nul 2>&1 || goto fail
node.exe -e "if(require('./package.json').version!=='1.9.24')process.exit(1)" || goto fail
call npm.cmd test || goto fail
echo [PASS] v1.9.24 tests completed.
exit /b 0
:fail
echo [ERROR] Tests failed. Do not publish.
pause
exit /b 1
