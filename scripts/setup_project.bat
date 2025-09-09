@echo off
echo ====================================
echo    DocSafe Project Setup
echo ====================================
echo.

echo Checking prerequisites...

REM Check Python
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.11+ from https://python.org
    pause
    exit /b 1
)
echo ✓ Python found

REM Check Node.js
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)
echo ✓ Node.js found

REM Check Docker
docker --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker is not installed or not in PATH
    echo Please install Docker Desktop from https://docker.com
    pause
    exit /b 1
)
echo ✓ Docker found

echo.
echo ====================================
echo Setting up Backend Environment...
echo ====================================

cd /d "%~dp0backend"

REM Create virtual environment
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Install backend dependencies
echo Installing Python dependencies...
call venv\Scripts\activate && pip install --upgrade pip && pip install -r requirements.txt

REM Copy environment file
if not exist ".env" (
    echo Creating backend .env file...
    copy "..\config\environments\.env.local" ".env"
    echo Please edit backend\.env file with your settings
)

echo.
echo ====================================
echo Setting up Frontend Environment...
echo ====================================

cd /d "%~dp0frontend"

REM Install frontend dependencies
echo Installing Node.js dependencies...
npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install Node.js dependencies
    pause
    exit /b 1
)

REM Copy environment file
if not exist ".env" (
    echo Creating frontend .env file...
    copy "..\config\environments\.env.local" ".env"
    echo Please edit frontend\.env file with your settings
)

echo.
echo ====================================
echo Setup Complete!
echo ====================================
echo.
echo Next steps:
echo.
echo For DEVELOPMENT (hybrid - local frontend/backend, Docker database):
echo   1. Run: start_dev_hybrid.bat
echo   2. Access: http://localhost:3005
echo.
echo For PRODUCTION (all Docker containers):
echo   1. Run: start_prod_full.bat
echo   2. Access: http://localhost:8080
echo.
echo Test credentials:
echo   Username: rahumana
echo   Password: TestPass123@
echo   Encryption Password: JHNpAZ39g!^Y
echo.
echo Documentation:
echo   - docs\HYBRID_SETUP.md (development setup)
echo   - docs\LOCAL_SETUP.md (all local setup)
echo   - docs\PROJECT_STRUCTURE.md (project organization)
echo   - API docs: http://localhost:8002/docs
echo.
pause