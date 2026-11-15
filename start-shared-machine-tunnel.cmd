@echo off
setlocal
cd /d "%~dp0"

echo SWEETS LINK shared machine launcher
echo.

if not exist "%~dp0.runtime\named-tunnel-host.txt" (
  echo Named Tunnel is not configured yet.
  call "%~dp0setup-named-tunnel.cmd"
  if errorlevel 1 exit /b %ERRORLEVEL%
)
if not exist "%~dp0.runtime\named-tunnel-token.txt" (
  echo Named Tunnel token is missing.
  call "%~dp0setup-named-tunnel.cmd"
  if errorlevel 1 exit /b %ERRORLEVEL%
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-shared-machine-tunnel.ps1" %*
set EXIT_CODE=%ERRORLEVEL%

if not "%EXIT_CODE%"=="0" (
  echo.
  echo An error occurred. See the message above and the .runtime logs.
  pause
)
exit /b %EXIT_CODE%
