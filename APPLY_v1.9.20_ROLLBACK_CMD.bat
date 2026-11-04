@echo off
setlocal EnableExtensions
cd /d "%~dp0" || exit /b 1
chcp 65001 >nul
echo [v1.9.20] Removing obsolete sticker-only source files...
for %%F in ("desktop\sticker-utils.cjs" "renderer\stickers.js" "test\team-stickers-dev.test.cjs") do (
 if exist "%%~F" (
  del /f /q "%%~F"
  if exist "%%~F" (
   echo [ERROR] Could not remove %%~F
   exit /b 1
  )
 )
)
echo [OK] Sticker-only source files removed. Shared events, user data and server records are untouched.
exit /b 0
