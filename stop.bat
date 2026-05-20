
@echo off
REM Stop development stack and kill local dev processes

echo Stopping Docker Compose services (all)...
docker-compose down
if %ERRORLEVEL% NEQ 0 (
  echo Warning: docker-compose down exited with error. Check Docker.
)

echo Killing frontend and backend dev processes (node.exe, dotnet.exe)...

tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I "node.exe" >NUL
if %ERRORLEVEL% EQU 0 (
  echo Killing node.exe processes...
  taskkill /IM node.exe /F >nul 2>&1 || echo Failed to kill node.exe
)

tasklist /FI "IMAGENAME eq dotnet.exe" 2>NUL | find /I "dotnet.exe" >NUL
if %ERRORLEVEL% EQU 0 (
  echo Killing dotnet.exe processes...
  taskkill /IM dotnet.exe /F >nul 2>&1 || echo Failed to kill dotnet.exe
)

echo Stop complete.
exit /b 0
