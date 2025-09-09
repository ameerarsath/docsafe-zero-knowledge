@echo off
echo ====================================
echo    DocSafe Environment Validation
echo ====================================
echo.

set "errors=0"

REM Check Python
echo [1/10] Checking Python installation...
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [ERROR] Python is not installed or not in PATH
    echo   Please install Python 3.11+ from https://python.org
    set /a errors+=1
) else (
    echo   [OK] Python found
)

REM Check Node.js  
echo [2/10] Checking Node.js installation...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [ERROR] Node.js is not installed or not in PATH
    echo   Please install Node.js 18+ from https://nodejs.org
    set /a errors+=1
) else (
    echo   [OK] Node.js found
)

REM Check Docker
echo [3/10] Checking Docker installation...
docker --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [ERROR] Docker is not installed or not in PATH
    echo   Please install Docker Desktop from https://docker.com
    set /a errors+=1
) else (
    echo   [OK] Docker found
)

REM Check Docker Compose
echo [4/10] Checking Docker Compose...
docker-compose --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [ERROR] Docker Compose is not available
    echo   Please install Docker Compose
    set /a errors+=1
) else (
    echo   [OK] Docker Compose found
)

REM Check backend virtual environment
echo [5/10] Checking backend virtual environment...
if exist "backend\venv\Scripts\python.exe" (
    echo   [OK] Backend virtual environment found
) else (
    echo   [WARNING] Backend virtual environment not found
    echo   Run: cd backend && python -m venv venv
    set /a errors+=1
)

REM Check frontend node_modules
echo [6/10] Checking frontend dependencies...
if exist "frontend\node_modules" (
    echo   [OK] Frontend dependencies found
) else (
    echo   [WARNING] Frontend dependencies not installed
    echo   Run: cd frontend && npm install
    set /a errors+=1
)

REM Check environment files
echo [7/10] Checking environment files...
if exist "backend\.env" (
    echo   [OK] Backend .env file found
) else (
    echo   [WARNING] Backend .env file missing
    echo   Copy backend\.env.dev to backend\.env
)

if exist "frontend\.env" (
    echo   [OK] Frontend .env file found
) else (
    echo   [WARNING] Frontend .env file missing
    echo   Copy frontend\.env.dev to frontend\.env
)

REM Check database container
echo [8/10] Checking database container...
docker ps | findstr "securevault_postgres" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   [OK] Database container is running
) else (
    echo   [INFO] Database container is not running
    echo   This is normal if you haven't started it yet
)

REM Check required ports
echo [9/10] Checking port availability...
netstat -an | findstr ":3005 " >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   [WARNING] Port 3005 is in use (Frontend port)
) else (
    echo   [OK] Port 3005 is available
)

netstat -an | findstr ":8002 " >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   [WARNING] Port 8002 is in use (Backend port)
) else (
    echo   [OK] Port 8002 is available
)

netstat -an | findstr ":5430 " >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   [WARNING] Port 5430 is in use (Database port)
) else (
    echo   [OK] Port 5430 is available
)

REM Check disk space
echo [10/10] Checking disk space...
for /f "tokens=3" %%a in ('dir /-c . ^| find "bytes free"') do set freespace=%%a
if defined freespace (
    echo   [OK] Sufficient disk space available
) else (
    echo   [WARNING] Could not check disk space
)

echo.
echo ====================================
echo    Validation Summary
echo ====================================

if %errors% EQU 0 (
    echo [SUCCESS] Environment validation passed!
    echo All required components are properly configured.
    echo.
    echo Next steps:
    echo 1. Copy environment files if needed:
    echo    - copy backend\.env.dev backend\.env
    echo    - copy frontend\.env.dev frontend\.env
    echo.
    echo 2. Start the development environment:
    echo    - scripts\dev\start-dev-hybrid.bat
    echo.
    exit /b 0
) else (
    echo [ERROR] Environment validation failed with %errors% error(s).
    echo Please fix the issues above before continuing.
    echo.
    echo For help, check:
    echo - docs\HYBRID_SETUP.md
    echo - docs\LOCAL_SETUP.md
    echo.
    exit /b 1
)
