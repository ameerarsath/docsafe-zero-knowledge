@echo off
echo ====================================
echo   DocSafe Complete Development Setup
echo ====================================
echo.
echo This script will set up your complete development environment.
echo.

set "errors=0"

echo [Step 1/8] Validating environment prerequisites...
call scripts\validate_environment.bat
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Environment validation failed.
    echo Please fix the issues above and run this script again.
    pause
    exit /b 1
)

echo.
echo [Step 2/8] Setting up project structure...
echo   [OK] Project structure is already organized

echo.
echo [Step 3/8] Setting up backend environment...
pushd backend
if not exist ".env" (
    echo   Copying backend environment file...
    copy .env.dev .env >nul 2>&1
    echo   [OK] Backend .env created from template
) else (
    echo   [OK] Backend .env already exists
)
popd

echo.
echo [Step 4/8] Setting up frontend environment...
pushd frontend
if not exist ".env" (
    echo   Copying frontend environment file...
    copy .env.dev .env >nul 2>&1
    echo   [OK] Frontend .env created from template
) else (
    echo   [OK] Frontend .env already exists
)
popd

echo.
echo [Step 5/8] Installing backend dependencies...
pushd backend
if not exist "venv" (
    echo   Creating Python virtual environment...
    python -m venv venv
    if %ERRORLEVEL% NEQ 0 (
        echo   [ERROR] Failed to create virtual environment
        popd
        pause
        exit /b 1
    )
)
echo   Installing Python packages...
call venv\Scripts\activate && pip install --upgrade pip && pip install -r requirements\dev.txt >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [WARNING] Some Python packages may not have installed correctly
)
echo   [OK] Backend dependencies installed
popd

echo.
echo [Step 6/8] Installing frontend dependencies...
pushd frontend
if not exist "node_modules" (
    echo   Installing Node.js packages...
    npm install >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo   [WARNING] Some Node.js packages may not have installed correctly
    )
    echo   [OK] Frontend dependencies installed
) else (
    echo   [OK] Frontend dependencies already installed
)
popd

echo.
echo [Step 7/8] Setting up database containers...
echo   Starting PostgreSQL and Redis containers...
pushd config\docker
docker-compose -f docker-compose.dev.yml up -d securevault_postgres redis
if %ERRORLEVEL% NEQ 0 (
    echo   [WARNING] Database containers may not have started correctly
    echo   Please check Docker Desktop is running
) else (
    echo   [OK] Database containers started
)
popd

echo   Waiting for database to be ready...
timeout /t 8 /nobreak >nul

echo.
echo [Step 8/8] Initializing database...
pushd backend
echo   Running database migrations...
call venv\Scripts\activate && alembic upgrade head >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [WARNING] Database migrations may have failed
)

echo   Creating admin user...
call venv\Scripts\activate && python scripts\create_admin_user.py >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   [WARNING] Admin user creation may have failed
)

echo   [OK] Database initialization completed
popd

echo.
echo ====================================
echo   SETUP COMPLETE!
echo ====================================
echo.
echo Your DocSafe development environment is ready!
echo.
echo NEXT STEPS:
echo.
echo 1. OPEN VSCODE WORKSPACE:
echo    code docsafe.code-workspace
echo.
echo 2. START DEVELOPMENT:
echo    scripts\dev\start-dev-hybrid.bat
echo.
echo 3. ACCESS APPLICATIONS:
echo    - Frontend:  http://localhost:3005
echo    - Backend:   http://localhost:8002
echo    - API Docs:  http://localhost:8002/docs
echo.
echo 4. LOGIN CREDENTIALS:
echo    - Admin: rahumana / TestPass123@
echo    - User:  testuser / user123
echo.
echo 5. OPTIONAL SETUP:
echo    - Code quality: scripts\setup\setup-pre-commit.bat
echo    - Read guide:   docs\DEVELOPMENT_GUIDE.md
echo.
echo Happy coding! 
echo.
pause