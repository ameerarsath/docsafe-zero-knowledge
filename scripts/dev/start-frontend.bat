@echo off
echo ====================================
echo    DocSafe Frontend Server
echo ====================================
echo.

cd /d "%~dp0..\..\frontend"

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing Node.js dependencies...
    npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install Node.js dependencies
        pause
        exit /b 1
    )
)

REM Check if .env exists
if not exist ".env" (
    echo WARNING: .env file not found
    echo Using environment example file
    if exist "..\config\environments\.env.development" (
        copy "..\config\environments\.env.development" ".env"
    )
)

echo Starting Frontend server...
echo Frontend will be available at: http://localhost:3005
echo.

REM Start development server
npm run dev

pause