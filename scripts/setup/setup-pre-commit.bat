@echo off
echo ====================================
echo    DocSafe Pre-commit Setup
echo ====================================
echo.

echo Installing pre-commit hooks for code quality...
echo.

REM Check if pip is available
pip --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: pip is not available
    echo Please install Python and pip first
    pause
    exit /b 1
)

REM Install pre-commit
echo [1/4] Installing pre-commit package...
pip install pre-commit
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install pre-commit
    pause
    exit /b 1
)
echo   [OK] Pre-commit installed

REM Navigate to project root
pushd "%~dp0..\.."

REM Install pre-commit hooks
echo [2/4] Installing pre-commit hooks...
pre-commit install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install pre-commit hooks
    popd
    pause
    exit /b 1
)
echo   [OK] Pre-commit hooks installed

REM Install commit message hook
echo [3/4] Installing commit message hook...
pre-commit install --hook-type commit-msg
if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Failed to install commit message hook
) else (
    echo   [OK] Commit message hook installed
)

REM Test installation
echo [4/4] Testing pre-commit installation...
pre-commit --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Pre-commit installation test failed
    popd
    pause
    exit /b 1
)
echo   [OK] Pre-commit is working

popd

echo.
echo ====================================
echo    Pre-commit Setup Complete!
echo ====================================
echo.
echo Pre-commit hooks have been installed successfully!
echo.
echo What this means:
echo - Code will be automatically formatted before each commit
echo - Security issues will be detected
echo - Code quality will be enforced
echo - Commit messages will follow conventional format
echo.
echo To run hooks manually:
echo   pre-commit run --all-files
echo.
echo To skip hooks (not recommended):
echo   git commit --no-verify -m "message"
echo.
pause
