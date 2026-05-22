@echo off
chcp 65001 >nul
title VideoVault - Start All Services
echo.
echo ========================================
echo    VideoVault - Starting All Services
echo ========================================
echo.

REM Step 0: Stop any existing processes first
echo [0/5] Stopping any existing processes first...
call "%~dp0stop.bat"
echo.

REM Step 1: Start infrastructure (Docker)
echo [1/5] Starting infrastructure (Postgres, Redis, MinIO)...
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo    [CRITICAL ERROR] Docker is not running!
    echo    Make sure you open Docker Desktop before running this script.
    echo    The C# Backend requires PostgreSQL to run.
    echo.
    pause
    exit /b 1
)

docker-compose -f "%~dp0docker-compose.yml" up -d postgres redis minio
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo    [CRITICAL ERROR] Docker Compose failed to start the containers.
    echo.
    pause
    exit /b 1
)

REM Wait for Docker containers to initialize
ping 127.0.0.1 -n 4 > nul

REM Step 2: Start Backend (.NET API)
echo [2/5] Starting Backend API (.NET)...
start "VideoVault - Backend API" cmd /k "title VideoVault Backend && cd /d %~dp0backend && dotnet run --project src\VideoVault.API"

REM Step 3: Start Frontend (React + Vite)
echo [3/5] Starting Frontend (React + Vite)...
start "VideoVault - Frontend" cmd /k "title VideoVault Frontend && cd /d %~dp0frontend && npm run dev"

REM Step 4: Start Python Services
echo [4/5] Starting Python Microservices...

if exist "%~dp0services\subtitle_service\subtitle_service.py" (
    echo    - Subtitle STT Service on port 5051 [OK]
    start "VideoVault - STT Service" cmd /k "title STT Service ^(port 5051^) && cd /d %~dp0services\subtitle_service && python subtitle_service.py"
) else (
    echo    - Subtitle Service [SKIPPED - file not found]
)

if exist "%~dp0services\voice_service\voice_service.py" (
    echo    - Voice TTS Service on port 5052 [OK]
    start "VideoVault - TTS Service" cmd /k "title TTS Service ^(port 5052^) && cd /d %~dp0services\voice_service && python voice_service.py"
) else (
    echo    - Voice Service [SKIPPED - file not found]
)

if exist "%~dp0services\video_downloader\main.py" (
    echo    - Video Downloader [OK]
    start "VideoVault - Video Downloader" cmd /k "title Video Downloader && cd /d %~dp0services\video_downloader && python main.py"
) else (
    echo    - Video Downloader [SKIPPED - file not found]
)

if exist "%~dp0services\tiktok_analyzer\api.py" (
    echo    - TikTok Analyzer API on port 5054 [OK]
    start "VideoVault - TikTok Analyzer API" cmd /k "title TikTok Analyzer API ^(port 5054^) && cd /d %~dp0services\tiktok_analyzer && set TIKTOK_ANALYZER_PORT=5054 && (python api.py || py -3.14 api.py)"
) else (
    echo    - TikTok Analyzer API [SKIPPED - file not found]
)

if exist "%~dp0services\dubbing_pipeline\main.py" (
    echo    - Dubbing Pipeline Service on port 5060 [OK]
    start "VideoVault - Dubbing Pipeline" cmd /k "title Dubbing Pipeline ^(port 5060^) && cd /d %~dp0services\dubbing_pipeline && python main.py"
) else (
    echo    - Dubbing Pipeline [SKIPPED - file not found]
)

echo.
echo ========================================
echo    All services started!
echo ========================================
echo.
echo    Backend API :   http://localhost:5141
echo    Swagger UI  :   http://localhost:5141/swagger
echo    Frontend    :   http://localhost:5173
echo    STT Service :   http://localhost:5051
echo    TTS Service :   http://localhost:5052
echo    MinIO       :   http://localhost:9001
echo.
echo    Check the new terminal windows for logs.
echo.
exit /b 0
