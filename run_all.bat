@echo off
title NetPulse Launcher
echo ===================================================
echo   Launching NetPulse Wi-Fi ^& Network Analyzer
echo ===================================================
echo Starting Backend on http://localhost:8000
start "NetPulse Backend" cmd /k "cd /d %~dp0 && call run_backend.bat"

timeout /t 2 /nobreak >nul

echo Starting Frontend on http://localhost:3000
start "NetPulse Frontend" cmd /k "cd /d %~dp0 && call run_frontend.bat"

echo.
echo Both servers are starting!
echo Backend Docs: http://localhost:8000/docs
echo Web App:      http://localhost:3000
echo.
pause
