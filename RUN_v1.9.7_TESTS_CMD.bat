@echo off
setlocal EnableExtensions
cd /d "%~dp0" || goto fail
echo ================================================
echo  KUN'S KANBAN CALENDAR v1.9.7 - CMD TEST
 echo ================================================
if not exist package.json goto missing
where node.exe >nul 2>&1 || goto missing_node
where npm.cmd >nul 2>&1 || goto missing_node
node.exe --check renderer\sharing.js || goto fail
call npm.cmd ci --no-audit --no-fund || goto fail
call npm.cmd test || goto fail
echo.
echo [OK] Checks complete. No files have been published.
pause
exit /b 0
:missing
 echo [ERROR] Run this BAT inside your repository root with package.json.
 goto fail
:missing_node
 echo [ERROR] Node.js or npm is not installed or unavailable in PATH.
:fail
 echo [ERROR] Test failed. Do not publish this update yet.
pause
exit /b 1
