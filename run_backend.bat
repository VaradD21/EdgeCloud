@echo off
echo Starting EdgeCloud Backend...
cd backend
py -m uvicorn main:app --reload
pause
