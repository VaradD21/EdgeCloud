@echo off
echo Starting EdgeCloud Stack...

:: Start Backend
echo Launching Backend...
start "EdgeCloud Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

:: Start Frontend
echo Launching Frontend...
start "EdgeCloud Frontend" cmd /k "cd frontend && npm run dev"

:: Start Agent
echo Launching Agent...
start "EdgeCloud Agent" cmd /k "cd agent && ..\backend\venv\Scripts\python.exe agent.py"

echo.
echo All services launched in separate windows.
pause
