@echo off
echo ====================================
echo    DocSafe Development Setup
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

cd /d "%~dp0..\..\backend"

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
    if exist "..\config\environments\.env.development" (
        copy "..\config\environments\.env.development" ".env"
        echo ✓ Backend .env created from template
    ) else (
        echo WARNING: No .env template found, please create manually
    )
)

echo.
echo ====================================
echo Setting up Frontend Environment...
echo ====================================

cd /d "%~dp0..\..\frontend"

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
    if exist "..\config\environments\.env.development" (
        copy "..\config\environments\.env.development" ".env"
        echo ✓ Frontend .env created from template
    ) else (
        echo WARNING: No .env template found, please create manually
    )
)

echo.
echo ====================================
echo Development Setup Complete!
echo ====================================
echo.
echo Next steps:
echo.
echo 1. Start development environment:
echo    scripts\dev\start-dev-hybrid.bat
echo.
echo 2. Or start services individually:
echo    - Database: docker-compose -f config\docker\docker-compose.dev.yml up -d postgres
echo    - Backend:  scripts\dev\start-backend.bat
echo    - Frontend: scripts\dev\start-frontend.bat
echo.
echo 3. Access your application:
echo    - Frontend: http://localhost:3005
echo    - Backend:  http://localhost:8002
echo    - API Docs: http://localhost:8002/docs
echo.
echo Test credentials:
echo   Username: rahumana
echo   Password: TestPass123@
echo   Encryption Password: JHNpAZ39g!^Y
echo.
pause