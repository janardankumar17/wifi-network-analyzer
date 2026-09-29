@echo off
title NetPulse - Backend Server
echo Starting NetPulse Backend (FastAPI + WebSockets)...
cd /d "%~dp0backend"
call venv\Scripts\activate.bat
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
pause
