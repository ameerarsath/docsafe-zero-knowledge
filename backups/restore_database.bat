@echo off
echo ========================================
echo SecureVault Database Restore
echo ========================================
echo.

set BACKUP_FILE=securevault_backup_20251002_173602.sql

echo Checking Docker container status...
docker ps | findstr securevault_db
if %errorlevel% neq 0 (
    echo ERROR: Container securevault_db is not running
    echo Please start it with: cd ..\config\docker ^&^& docker-compose -f docker-compose.dev.yml up -d
    pause
    exit /b 1
)

echo.
echo WARNING: This will DELETE all current data and restore from backup
echo Backup file: %BACKUP_FILE%
echo.
set /p CONFIRM="Are you sure you want to continue? (yes/no): "

if /i "%CONFIRM%" neq "yes" (
    echo Restore cancelled.
    pause
    exit /b 0
)

echo.
echo Restoring database...
type %BACKUP_FILE% | docker exec -i securevault_db psql -U securevault_user -d postgres

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo Database restored successfully!
    echo ========================================
    echo.
    echo Verifying restore...
    docker exec securevault_db psql -U securevault_user -d securevault -c "SELECT COUNT(*) as user_count FROM users;"
    docker exec securevault_db psql -U securevault_user -d securevault -c "SELECT COUNT(*) as document_count FROM documents;"
) else (
    echo.
    echo ERROR: Restore failed!
    echo Please check the error messages above.
)

echo.
pause
