@echo off
setlocal
cd /d "%~dp0"
where.exe node.exe >nul 2>&1
if errorlevel 1 (echo Node.js is required. & pause & exit /b 1)
echo Configure a PUBLIC GitHub repository for app updates.
node.exe scripts\configure-github.cjs
if errorlevel 1 (echo Setup failed. & pause & exit /b 1)
echo.
echo Configuration saved. Build/publish after uploading source to GitHub.
pause
