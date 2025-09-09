@echo off
echo ====================================
echo    DocSafe Production Setup
echo ====================================
echo All services: Docker Containers
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
echo Building and Starting All Services...
echo ====================================

cd /d "%~dp0config\docker"

REM Build and start all services
echo Building Docker images...
docker-compose build

echo Starting all services...
docker-compose up -d

echo.
echo ====================================
echo Waiting for Services to Start...
echo ====================================

REM Wait for services to be ready
echo Waiting for database to be ready...
timeout /t 10 /nobreak >nul

echo Checking service health...
docker-compose ps

echo.
echo ====================================
echo Running Database Migrations...
echo ====================================

REM Run database migrations in the backend container
echo Running Alembic migrations...
docker-compose exec backend alembic upgrade head

echo Creating admin user...
docker-compose exec backend python create_admin_user.py

echo.
echo ====================================
echo DocSafe Production Environment Ready!
echo ====================================
echo.
echo Services:
echo ✓ Database:  PostgreSQL in Docker (localhost:5430)
echo ✓ Redis:     Redis in Docker (localhost:6380)
echo ✓ Backend:   http://localhost:8002
echo ✓ Frontend:  http://localhost:3005
echo ✓ Nginx:     http://localhost:8080
echo ✓ API Docs:  http://localhost:8002/docs
echo.
echo Test Credentials:
echo Username: rahumana
echo Password: TestPass123@
echo Encryption Password: JHNpAZ39g!^Y
echo.
echo View logs: docker-compose logs -f [service-name]
echo Stop services: docker-compose down
echo.
echo Press any key to continue...
pause >nul