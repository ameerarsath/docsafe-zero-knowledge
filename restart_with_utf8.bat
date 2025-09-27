@echo off
echo Restarting SecureVault with UTF-8 encoding...

REM Set UTF-8 environment variables
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1
set LANG=en_US.UTF-8
set LC_ALL=en_US.UTF-8

REM Navigate to backend directory
cd backend

echo Starting backend with UTF-8 encoding...
python start_utf8.py

pause