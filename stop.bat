@echo off
chcp 65001 >nul
title VideoVault - Stop All Services
echo.
echo ========================================
echo    VideoVault - Stopping All Services
echo ========================================
echo.

REM Step 1: Stop Docker Compose services
echo [1/4] Stopping Docker Compose services...
docker-compose -f "%~dp0docker-compose.yml" down 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo    [WARNING] Docker Compose down failed. Docker may not be running.
)

REM Step 2: Kill .NET backend processes
echo [2/4] Stopping Backend (.NET)...
tasklist /FI "IMAGENAME eq dotnet.exe" 2>NUL | find /I "dotnet.exe" >NUL
if %ERRORLEVEL% EQU 0 (
    taskkill /IM dotnet.exe /F >nul 2>&1
    echo    - dotnet.exe stopped
) else (
    echo    - dotnet.exe not running
)

REM Step 3: Kill Node.js frontend processes
echo [3/4] Stopping Frontend (Node.js)...
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I "node.exe" >NUL
if %ERRORLEVEL% EQU 0 (
    taskkill /IM node.exe /F >nul 2>&1
    echo    - node.exe stopped
) else (
    echo    - node.exe not running
)

REM Step 4: Kill Python service processes
echo [4/4] Stopping Python services...
tasklist /FI "IMAGENAME eq python.exe" 2>NUL | find /I "python.exe" >NUL
if %ERRORLEVEL% EQU 0 (
    taskkill /IM python.exe /F >nul 2>&1
    echo    - python.exe stopped
) else (
    echo    - python.exe not running
)

echo.
echo ========================================
echo    All services stopped.
echo ========================================
echo.
exit /b 0
