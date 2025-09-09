@echo off
echo ====================================
echo    DocSafe Backend Server
echo ====================================
echo.

cd /d "%~dp0..\..\backend"

REM Check if virtual environment exists
if not exist "venv" (
    echo ERROR: Virtual environment not found
    echo Please run setup-dev.bat first
    pause
    exit /b 1
)

REM Check if .env exists
if not exist ".env" (
    echo WARNING: .env file not found
    echo Using environment example file
    if exist "config\environments\.env.development" (
        copy "config\environments\.env.development" ".env"
    )
)

echo Starting Backend server...
echo Backend will be available at: http://localhost:8002
echo API Documentation at: http://localhost:8002/docs
echo.

REM Activate virtual environment and start server
call venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8002

pause