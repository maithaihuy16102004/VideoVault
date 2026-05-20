@echo off
REM Start VideoVault development stack using Docker Compose
echo Starting Docker Compose services (build if needed)...
docker-compose up -d --build
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Docker Compose failed to start. Check Docker Desktop and configuration.
  pause
  exit /b %ERRORLEVEL%
)

echo Services started successfully.
exit /b 0
