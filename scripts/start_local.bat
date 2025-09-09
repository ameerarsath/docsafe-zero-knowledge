@echo off
echo ====================================
echo    DocSafe Local Development Setup
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

REM Check PostgreSQL
psql --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: PostgreSQL not found in PATH
    echo Make sure PostgreSQL is installed and running
    echo You can still continue if PostgreSQL is running as a service
)
echo ✓ PostgreSQL check passed

echo.
echo ====================================
echo Setting up Backend...
echo ====================================

cd /d "%~dp0backend"

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate

REM Install dependencies
echo Installing Python dependencies...
pip install -r requirements.txt
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)

echo.
echo ====================================
echo Setting up Frontend...
echo ====================================

cd /d "%~dp0frontend"

REM Install Node.js dependencies
if not exist "node_modules" (
    echo Installing Node.js dependencies...
    npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install Node.js dependencies
        pause
        exit /b 1
    )
)

echo.
echo ====================================
echo Setup Complete!
echo ====================================
echo.
echo Next steps:
echo 1. Set up your PostgreSQL database (see LOCAL_SETUP.md)
echo 2. Configure .env files (see LOCAL_SETUP.md)
echo 3. Run database migrations: 'cd backend && alembic upgrade head'
echo 4. Start the services using start_dev.bat
echo.
echo For detailed instructions, see LOCAL_SETUP.md
echo.
pause