@echo off
setlocal
cd /d "%~dp0"

echo SWEETS LINK shared machine launcher
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-shared-machine-tunnel.ps1" %*
set EXIT_CODE=%ERRORLEVEL%

if not "%EXIT_CODE%"=="0" (
  echo.
  echo An error occurred. See the message above and the .runtime logs.
  pause
)
exit /b %EXIT_CODE%
