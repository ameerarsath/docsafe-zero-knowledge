# SecureVault Database Backup and Restore Instructions

## Backup Information

**Backup Date**: October 2, 2025, 17:36:02
**Database**: securevault
**PostgreSQL Version**: 15.13
**Container**: securevault_db

## Files Created

1. **securevault_backup_20251002_173602.sql** (143 KB)
   - Full SQL dump with schema and data
   - Includes DROP/CREATE statements
   - Human-readable format
   - Can be restored directly

2. **securevault_backup_20251002_173602.sql.gz** (Compressed)
   - Gzip compressed version
   - Smaller file size for storage/transfer
   - Must be uncompressed before restore

## Backup Contents

This backup includes:
- ✅ Database schema (all tables, indexes, constraints)
- ✅ All data from all tables
- ✅ User roles and permissions
- ✅ Sequences and auto-increment values
- ✅ Database configuration
- ✅ Foreign key relationships
- ✅ Full zero-knowledge encryption metadata

## Restore Instructions

### Method 1: Restore Using Docker (Recommended)

**Option A: Restore to running container**

```bash
# Step 1: Copy backup file to container
docker cp backups/securevault_backup_20251002_173602.sql securevault_db:/tmp/backup.sql

# Step 2: Restore the database
docker exec -i securevault_db psql -U securevault_user -d postgres -c "DROP DATABASE IF EXISTS securevault;"
docker exec -i securevault_db psql -U securevault_user -d postgres < /tmp/backup.sql

# Alternative: Single command restore
cat backups/securevault_backup_20251002_173602.sql | docker exec -i securevault_db psql -U securevault_user -d postgres
```

**Option B: Restore from compressed backup**

```bash
# Uncompress and restore in one command
gunzip -c backups/securevault_backup_20251002_173602.sql.gz | docker exec -i securevault_db psql -U securevault_user -d postgres
```

### Method 2: Restore Using psql (Direct Connection)

If you have psql installed locally:

```bash
# Restore to localhost:5430 (mapped port)
psql -h localhost -p 5430 -U securevault_user -d postgres -f backups/securevault_backup_20251002_173602.sql

# Or with password prompt
PGPASSWORD=securevault_password psql -h localhost -p 5430 -U securevault_user -d postgres -f backups/securevault_backup_20251002_173602.sql
```

### Method 3: Restore to Fresh Container

If starting from scratch:

```bash
# Step 1: Start Docker containers
cd config/docker
docker-compose -f docker-compose.dev.yml up -d

# Step 2: Wait for container to be healthy
docker ps | grep securevault_db

# Step 3: Restore database
cat ../../backups/securevault_backup_20251002_173602.sql | docker exec -i securevault_db psql -U securevault_user -d postgres
```

## Verification Steps

After restore, verify the data:

```bash
# 1. Connect to database
docker exec -it securevault_db psql -U securevault_user -d securevault

# 2. Check tables exist
\dt

# 3. Check user count
SELECT COUNT(*) FROM users;

# 4. Check document count
SELECT COUNT(*) FROM documents;

# 5. Verify encryption keys
SELECT COUNT(*) FROM user_encryption_keys;

# 6. Exit
\q
```

## Automated Restore Script (Windows)

Create `restore_database.bat`:

```batch
@echo off
echo ========================================
echo SecureVault Database Restore
echo ========================================
echo.

set BACKUP_FILE=backups\securevault_backup_20251002_173602.sql

echo Checking Docker container status...
docker ps | findstr securevault_db
if %errorlevel% neq 0 (
    echo ERROR: Container securevault_db is not running
    echo Please start it with: cd config\docker ^&^& docker-compose -f docker-compose.dev.yml up -d
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
```

## Automated Restore Script (Linux/Mac)

Create `restore_database.sh`:

```bash
#!/bin/bash

echo "========================================"
echo "SecureVault Database Restore"
echo "========================================"
echo

BACKUP_FILE="backups/securevault_backup_20251002_173602.sql"

echo "Checking Docker container status..."
if ! docker ps | grep -q securevault_db; then
    echo "ERROR: Container securevault_db is not running"
    echo "Please start it with: cd config/docker && docker-compose -f docker-compose.dev.yml up -d"
    exit 1
fi

echo
echo "WARNING: This will DELETE all current data and restore from backup"
echo "Backup file: $BACKUP_FILE"
echo
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo
echo "Restoring database..."
cat "$BACKUP_FILE" | docker exec -i securevault_db psql -U securevault_user -d postgres

if [ $? -eq 0 ]; then
    echo
    echo "========================================"
    echo "Database restored successfully!"
    echo "========================================"
    echo
    echo "Verifying restore..."
    docker exec securevault_db psql -U securevault_user -d securevault -c "SELECT COUNT(*) as user_count FROM users;"
    docker exec securevault_db psql -U securevault_user -d securevault -c "SELECT COUNT(*) as document_count FROM documents;"
else
    echo
    echo "ERROR: Restore failed!"
    echo "Please check the error messages above."
    exit 1
fi
```

## Backup Strategy Recommendations

1. **Automated Backups**: Schedule daily backups using cron (Linux) or Task Scheduler (Windows)
2. **Off-site Storage**: Copy backups to cloud storage or external drive
3. **Retention Policy**: Keep last 7 daily, 4 weekly, and 12 monthly backups
4. **Test Restores**: Periodically test restore process to ensure backups are valid

## Creating Future Backups

### Manual Backup

```bash
# Create timestamped backup
docker exec securevault_db pg_dump -U securevault_user -d securevault --clean --if-exists --create --inserts --column-inserts > "backups/securevault_backup_$(date +%Y%m%d_%H%M%S).sql"

# Compress backup
gzip backups/securevault_backup_*.sql
```

### Automated Backup Script (Windows)

Create `backup_database.bat`:

```batch
@echo off
set TIMESTAMP=%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_FILE=backups\securevault_backup_%TIMESTAMP%.sql

echo Creating backup: %BACKUP_FILE%
docker exec securevault_db pg_dump -U securevault_user -d securevault --clean --if-exists --create --inserts --column-inserts > %BACKUP_FILE%

echo Compressing backup...
gzip %BACKUP_FILE%

echo Backup completed: %BACKUP_FILE%.gz
```

### Automated Backup Script (Linux/Mac)

Create `backup_database.sh`:

```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backups/securevault_backup_${TIMESTAMP}.sql"

echo "Creating backup: $BACKUP_FILE"
docker exec securevault_db pg_dump -U securevault_user -d securevault --clean --if-exists --create --inserts --column-inserts > "$BACKUP_FILE"

echo "Compressing backup..."
gzip "$BACKUP_FILE"

echo "Backup completed: ${BACKUP_FILE}.gz"
```

## Troubleshooting

### Error: "database securevault already exists"

Solution: Drop the existing database first:
```bash
docker exec -i securevault_db psql -U securevault_user -d postgres -c "DROP DATABASE IF EXISTS securevault;"
```

### Error: "role securevault_user does not exist"

Solution: Create the user first:
```bash
docker exec -i securevault_db psql -U postgres -c "CREATE USER securevault_user WITH PASSWORD 'securevault_password';"
docker exec -i securevault_db psql -U postgres -c "ALTER USER securevault_user WITH SUPERUSER;"
```

### Error: "permission denied"

Solution: Make sure you're using the correct user (securevault_user or postgres)

### Container not running

Solution: Start the container:
```bash
cd config/docker
docker-compose -f docker-compose.dev.yml up -d securevault_postgres
```

## Important Notes

⚠️ **Security Warnings**:
- Backup files contain sensitive data in encrypted form
- Store backups securely with encryption
- Do not commit backup files to version control
- Restrict access to backup files
- Keep backup passwords separate from database passwords

✅ **Best Practices**:
- Test your backup before relying on it
- Keep multiple backup versions
- Store backups in multiple locations
- Document your restore procedure
- Practice restoration regularly

## Support

For issues or questions:
1. Check container logs: `docker logs securevault_db`
2. Verify container is healthy: `docker ps`
3. Test database connection: `docker exec securevault_db psql -U securevault_user -d securevault -c "SELECT version();"`

---

**Last Updated**: October 2, 2025
**Backup Created By**: Automated backup script
**Next Recommended Backup**: October 3, 2025
