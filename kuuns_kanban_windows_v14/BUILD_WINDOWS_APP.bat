@echo off
setlocal EnableExtensions
cd /d "%~dp0"
if errorlevel 1 goto folder_error
title Kuuns Kanban Calendar - Windows Installer Builder

echo.
echo ===============================================
echo  Kuuns Kanban Calendar - Windows App Builder
echo ===============================================
echo.

if not exist "package.json" goto missing_files
if not exist "desktop\main.cjs" goto missing_files

where.exe node.exe >nul 2>&1
if errorlevel 1 goto missing_node
where.exe npm.cmd >nul 2>&1
if errorlevel 1 goto missing_node

echo [1/3] Checking Node.js and npm...
node.exe --version
call npm.cmd --version
if errorlevel 1 goto missing_node

echo.
echo [CONFIG] Checking GitHub Releases configuration...
node.exe scripts\check-github.cjs
if errorlevel 1 goto github_error
echo.
echo [2/3] Installing required build tools...
echo Internet connection is required on the first run.
call npm.cmd install --no-audit --no-fund
if errorlevel 1 goto install_error

echo.
echo [3/3] Building Windows installer (EXE)...
call npm.cmd run build:win
if errorlevel 1 goto build_error

set "SETUP_FOUND="
for %%F in ("dist\*.exe") do if exist "%%~fF" set "SETUP_FOUND=1"
if not defined SETUP_FOUND goto no_exe

echo.
echo ===============================================
echo  SUCCESS: Installer EXE was created.
echo  Open the dist folder to find the setup file.
echo ===============================================
start "" "%CD%\dist"
goto success_exit

:folder_error
echo ERROR: Could not open the project folder.
goto fail_exit

:missing_files
echo ERROR: Project files are missing.
echo This BAT file must be in the same folder as package.json.
echo Extract the entire ZIP before running it.
goto fail_exit

:missing_node
echo ERROR: Node.js or npm is not installed or unavailable.
echo Install Node.js LTS from https://nodejs.org/
echo Then open a new File Explorer window and try again.
goto fail_exit

:github_error
echo ERROR: GitHub configuration is required for automatic updates.
echo Run CONFIGURE_GITHUB.bat first.
goto fail_exit

:install_error
echo ERROR: npm install failed.
echo Check internet access and the errors shown above.
goto fail_exit

:build_error
echo ERROR: Windows EXE build failed.
echo Check the error lines shown above.
goto fail_exit

:no_exe
echo ERROR: Build ended, but no EXE was found in dist.
goto fail_exit

:success_exit
echo.
pause
exit /b 0

:fail_exit
echo.
echo Please send a screenshot of the error to ChatGPT.
pause
exit /b 1
