@echo off
echo ================================================
echo    Single Role Policy Enforcement Test
echo ================================================
echo.

echo Step 1: Authenticate user rahumana...
curl -s -X POST "http://localhost:8002/api/auth/login" ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"rahumana\",\"password\":\"TestPass123@\"}" > auth_response.json

if %errorlevel% neq 0 (
    echo ERROR: Authentication failed
    exit /b 1
)

echo ✓ Authentication successful

echo.
echo Step 2: Check database before role assignment...
docker exec -i securevault_db psql -U securevault_user -d securevault -c "SELECT user_id, role_id, assigned_at FROM user_roles WHERE user_id = 12;"

echo.
echo Step 3: Extract token and test role assignment...

REM Parse JSON to extract access token (simple approach)
for /f "tokens=2 delims=:," %%i in ('type auth_response.json ^| findstr "access_token"') do (
    set "token=%%i"
    set "token=%token:"=%"
    set "token=%token: =%"
)

echo Using token: %token:~0,20%...

echo.
echo Step 4: Assign manager role (ID: 3) to user 12...
curl -s -X POST "http://localhost:8002/api/v1/rbac/users/12/roles" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer %token%" ^
  -d "{\"role_id\":3,\"is_primary\":false}"

echo.
echo Step 5: Check database after role assignment...
docker exec -i securevault_db psql -U securevault_user -d securevault -c "SELECT user_id, role_id, assigned_at FROM user_roles WHERE user_id = 12;"

echo.
echo Step 6: Verify single role policy - count roles for user 12...
docker exec -i securevault_db psql -U securevault_user -d securevault -t -A -c "SELECT COUNT(*) FROM user_roles WHERE user_id = 12;" > role_count.txt

set /p role_count=<role_count.txt

echo User 12 has %role_count% role(s)

if "%role_count%"=="1" (
    echo ✅ SUCCESS: Single role policy enforced correctly!
) else (
    echo ❌ FAILURE: User has %role_count% roles, expected 1
)

echo.
echo Step 7: Final verification - show all current role assignments...
docker exec -i securevault_db psql -U securevault_user -d securevault -c "SELECT u.username, r.name as role_name, ur.assigned_at FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id ORDER BY u.id;"

echo.
echo Cleaning up temporary files...
del auth_response.json 2>nul
del role_count.txt 2>nul

echo.
echo ================================================
echo            Test Complete
echo ================================================