@echo off
echo ====================================
echo    Starting DocSafe Development
echo ====================================
echo.

REM Start Redis (if installed locally)
echo Starting Redis server...
start "Redis Server" cmd /k "redis-server --port 6379 || echo Redis not found locally, please start Redis manually"

REM Wait a moment for Redis to start
timeout /t 2 /nobreak >nul

echo Starting Backend server...
start "DocSafe Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8002"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

echo Starting Frontend server...
start "DocSafe Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ====================================
echo DocSafe Development Servers Starting
echo ====================================
echo.
echo Backend:  http://localhost:8002
echo Frontend: http://localhost:3005
echo API Docs: http://localhost:8002/docs
echo.
echo Press any key to stop all servers...
pause >nul

echo.
echo Stopping development servers...
taskkill /f /im "redis-server.exe" >nul 2>&1
taskkill /f /im "uvicorn.exe" >nul 2>&1
taskkill /f /im "node.exe" >nul 2>&1
echo Servers stopped.