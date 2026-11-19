@echo off
setlocal
cd /d "%~dp0"

echo SWEETS LINK Download server
echo Recording runs headlessly; no roulette window is opened.
echo.
call "%~dp0start-shared-machine-tunnel.cmd" -Edition Download %*
exit /b %ERRORLEVEL%
