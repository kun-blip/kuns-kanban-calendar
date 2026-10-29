@echo off
setlocal EnableExtensions
cd /d "%~dp0" || goto fail
title KUNS KANBAN CALENDAR v1.9.8 - Test
 echo ================================================
 echo  KUNS KANBAN CALENDAR v1.9.8 - CMD TEST
 echo ================================================
if not exist package.json goto fail
where node.exe >nul 2>&1 || goto fail
where npm.cmd >nul 2>&1 || goto fail
node.exe --check desktop\main.cjs || goto fail
node.exe --check desktop\release-notes-state.cjs || goto fail
node.exe --check renderer\release-notes.js || goto fail
node.exe --check renderer\update-center.js || goto fail
call npm.cmd ci --no-audit --no-fund || goto fail
call npm.cmd test || goto fail
echo.
echo [OK] All checks passed. Nothing has been published.
pause
exit /b 0
:fail
echo [ERROR] Tests failed. Do not publish yet.
pause
exit /b 1
