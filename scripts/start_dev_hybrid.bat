@echo off
echo ====================================
echo    DocSafe Hybrid Development Setup
echo ====================================
echo Frontend & Backend: Local
echo Database: Docker Container
echo ====================================
echo.

REM Check if Docker is running
docker version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker is not running or not installed
    echo Please start Docker Desktop
    pause
    exit /b 1
)
echo ✓ Docker is running

echo.
echo ====================================
echo Starting Database Container...
echo ====================================

REM Start the database container
echo Starting PostgreSQL container...
docker-compose -f docker-compose.dev.yml up -d postgres

REM Wait for database to be ready
echo Waiting for database to be ready...
timeout /t 5 /nobreak >nul

REM Check if database is healthy
docker-compose -f docker-compose.dev.yml ps postgres

echo.
echo ====================================
echo Setting up Backend Environment...
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

REM Activate virtual environment and install dependencies
echo Activating virtual environment and installing dependencies...
call venv\Scripts\activate && pip install -r requirements.txt >nul 2>&1

echo.
echo ====================================
echo Setting up Database Schema...
echo ====================================

REM Wait a bit more for database to be fully ready
timeout /t 3 /nobreak >nul

REM Run database migrations
echo Running database migrations...
call venv\Scripts\activate && alembic upgrade head

REM Create admin user if needed
echo Creating admin user (if doesn't exist)...
call venv\Scripts\activate && python create_admin_user.py

echo.
echo ====================================
echo Setting up Frontend Environment...
echo ====================================

cd /d "%~dp0frontend"

REM Install Node.js dependencies if needed
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
echo Starting Development Servers...
echo ====================================

REM Start Redis locally (optional)
echo Starting Redis server locally...
start "Redis Server" cmd /k "redis-server --port 6379 || echo Redis failed to start, using Docker Redis"

REM Wait a moment
timeout /t 2 /nobreak >nul

REM Start backend server
echo Starting Backend server...
start "DocSafe Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && echo Backend starting... && uvicorn app.main:app --reload --host 0.0.0.0 --port 8002"

REM Wait for backend to start
timeout /t 5 /nobreak >nul

REM Start frontend server
echo Starting Frontend server...
start "DocSafe Frontend" cmd /k "cd /d %~dp0frontend && echo Frontend starting... && npm run dev"

echo.
echo ====================================
echo DocSafe Development Environment Ready!
echo ====================================
echo.
echo Services:
echo ✓ Database:  PostgreSQL in Docker (localhost:5432)
echo ✓ Redis:     Local Redis (localhost:6379)
echo ✓ Backend:   http://localhost:8002
echo ✓ Frontend:  http://localhost:3005
echo ✓ API Docs:  http://localhost:8002/docs
echo.
echo Test Credentials:
echo Username: rahumana
echo Password: TestPass123@
echo Encryption Password: JHNpAZ39g!^Y
echo.
echo Press any key to stop all services...
pause >nul

echo.
echo ====================================
echo Stopping Development Environment...
echo ====================================
echo Stopping local services...
taskkill /f /im "redis-server.exe" >nul 2>&1
taskkill /f /im "uvicorn.exe" >nul 2>&1
taskkill /f /im "node.exe" >nul 2>&1

echo Stopping Docker containers...
docker-compose -f docker-compose.dev.yml down

echo.
echo All services stopped.
pause