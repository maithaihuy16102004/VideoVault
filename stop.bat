@echo off
REM Stop VideoVault development stack
echo Stopping Docker Compose services...
docker-compose down
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Docker Compose failed to stop cleanly. You may need to stop containers manually.
  pause
  exit /b %ERRORLEVEL%
)

echo Services stopped.
exit /b 0
