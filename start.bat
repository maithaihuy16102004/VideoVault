
@echo off
REM Start full development stack:
REM - Start infra via Docker Compose (Postgres, Redis, MinIO)
REM - Launch backend (dotnet run) in new terminal
REM - Launch frontend (npm run dev) in new terminal

echo Stopping any existing stack first...
call "%~dp0stop.bat"

echo Starting infrastructure (Postgres, Redis, MinIO)...
docker-compose up -d postgres redis minio
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Docker Compose failed to start infra. Check Docker Desktop and configuration.
  pause
)

timeout /t 2 >nul

echo Starting backend (dotnet run) in a new terminal...
start "VideoVault API" cmd /k "cd /d %~dp0backend && dotnet run --project src\VideoVault.API"

echo Starting frontend (npm run dev) in a new terminal...
start "VideoVault Frontend" cmd /k "cd /d %~dp0frontend && if exist package.json (npm install) else echo package.json not found && npm run dev"

echo All start commands executed. Check the new terminals for logs.
exit /b 0
