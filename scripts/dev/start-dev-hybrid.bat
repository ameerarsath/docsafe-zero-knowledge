@echo off
echo ====================================
echo    DocSafe Development Environment
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

cd /d "%~dp0..\.."

REM Start the database containers
echo Starting PostgreSQL and Redis containers...
docker-compose -f config\docker\docker-compose.dev.yml up -d securevault_postgres redis

REM Wait for database to be ready
echo Waiting for database and Redis to be ready...
timeout /t 8 /nobreak >nul

echo.
echo ====================================
echo Setting up Backend Environment...
echo ====================================

cd /d "%~dp0..\..\backend"

REM Activate virtual environment and setup
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

echo Activating virtual environment and installing dependencies...
call venv\Scripts\activate && pip install -r requirements\dev.txt >nul 2>&1

echo.
echo ====================================
echo Running Database Migrations...
echo ====================================

REM Run database migrations
echo Running database migrations...
call venv\Scripts\activate && alembic upgrade head

REM Create admin user if needed
echo Creating admin user (if doesn't exist)...
call venv\Scripts\activate && python scripts\create_admin_user.py

echo.
echo ====================================
echo Setting up Frontend Environment...
echo ====================================

cd /d "%~dp0..\..\frontend"

REM Install Node.js dependencies if needed
if not exist "node_modules" (
    echo Installing Node.js dependencies...
    npm install
)

echo.
echo ====================================
echo Starting Development Servers...
echo ====================================

REM Redis is already started in Docker container
echo Redis is running in Docker container...

REM Start backend server
echo Starting Backend server...
start "DocSafe Backend" cmd /k "cd /d %~dp0..\..\backend && venv\Scripts\activate && echo Backend starting on http://localhost:8002 && uvicorn app.main:app --reload --host 0.0.0.0 --port 8002"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend server
echo Starting Frontend server...
start "DocSafe Frontend" cmd /k "cd /d %~dp0..\..\frontend && echo Frontend starting on http://localhost:3005 && npm run dev"

echo.
echo ====================================
echo DocSafe Development Environment Ready!
echo ====================================
echo.
echo Services:
echo ✓ Database:  PostgreSQL in Docker (localhost:5430)
echo ✓ Redis:     Redis in Docker (localhost:6380)
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
taskkill /f /im "uvicorn.exe" >nul 2>&1
taskkill /f /im "node.exe" >nul 2>&1

echo Stopping Docker containers...
cd /d "%~dp0..\.."
docker-compose -f config\docker\docker-compose.dev.yml down

echo.
echo All services stopped.
pause