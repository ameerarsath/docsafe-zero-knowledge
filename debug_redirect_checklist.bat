@echo off
REM Redirect Loop Debugging Checklist Script
REM Run this to systematically test for redirect issues

echo ========================================
echo REDIRECT LOOP DEBUGGING CHECKLIST
echo ========================================
echo.

REM Check 1: Test direct share URL access
echo [1/8] Testing direct share URL access...
curl -v --max-redirs 0 -s -o nul http://localhost:3005/share/test123 2>&1 | findstr "HTTP\|Location"
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Share URL test failed - server might be down
) else (
    echo ✅ Share URL accessible
)
echo.

REM Check 2: Test API endpoint directly
echo [2/8] Testing backend API directly...
curl -v --max-redirs 0 -s -o nul http://localhost:8002/api/shares/test123/access 2>&1 | findstr "HTTP\|Location"
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Backend API test failed
) else (
    echo ✅ Backend API accessible
)
echo.

REM Check 3: Check Vite dev server
echo [3/8] Checking Vite dev server status...
netstat -an | findstr ":3005" >nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Vite server running on port 3005
) else (
    echo ❌ Vite server not running on port 3005
)
echo.

REM Check 4: Check backend server
echo [4/8] Checking backend server status...
netstat -an | findstr ":8002" >nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Backend server running on port 8002
) else (
    echo ❌ Backend server not running on port 8002
)
echo.

REM Check 5: Test with different HTTP methods
echo [5/8] Testing different HTTP methods...
echo GET request:
curl -X GET -v --max-redirs 0 -s -o nul http://localhost:3005/share/test123 2>&1 | findstr "HTTP"
echo POST request:
curl -X POST -v --max-redirs 0 -s -o nul http://localhost:3005/share/test123 2>&1 | findstr "HTTP"
echo.

REM Check 6: Test with authentication headers
echo [6/8] Testing with authentication...
curl -H "Authorization: Bearer test-token" -v --max-redirs 0 -s -o nul http://localhost:3005/share/test123 2>&1 | findstr "HTTP\|Location"
echo.

REM Check 7: Check for proxy configuration
echo [7/8] Checking proxy configuration...
if exist "frontend\vite.config.ts" (
    findstr /C:"/share" frontend\vite.config.ts >nul
    if %ERRORLEVEL% EQU 0 (
        echo ❌ Found /share proxy rule in vite.config.ts - this causes conflicts!
        echo    Remove the /share proxy rule to fix the redirect loop
    ) else (
        echo ✅ No conflicting /share proxy rule found
    )
) else (
    echo ⚠️  vite.config.ts not found in expected location
)
echo.

REM Check 8: Test redirect chain
echo [8/8] Testing redirect chain (following up to 3 redirects)...
curl -L --max-redirs 3 -v -s -o nul http://localhost:3005/share/test123 2>&1 | findstr "HTTP\|Location"
echo.

echo ========================================
echo DEBUGGING RECOMMENDATIONS
echo ========================================
echo.
echo If you see redirect loops:
echo 1. Remove /share proxy rule from vite.config.ts
echo 2. Restart Vite dev server: npm run dev
echo 3. Check React Router routes for conflicts
echo 4. Verify authentication middleware
echo.
echo Common fixes:
echo - Remove conflicting proxy rules
echo - Check middleware order in backend
echo - Verify environment variables
echo - Clear browser cache and cookies
echo.

REM Additional diagnostic information
echo ========================================
echo SYSTEM DIAGNOSTICS
echo ========================================
echo.
echo Current directory: %CD%
echo Node.js version:
node --version 2>nul || echo Node.js not found
echo.
echo Python version:
python --version 2>nul || echo Python not found
echo.
echo Active network connections on relevant ports:
netstat -an | findstr ":3005\|:8002\|:8080"
echo.

echo ========================================
echo MANUAL TESTING COMMANDS
echo ========================================
echo.
echo Test in browser (incognito mode):
echo   http://localhost:3005/share/test123
echo.
echo Test with curl (no redirects):
echo   curl -v --max-redirs 0 http://localhost:3005/share/test123
echo.
echo Test backend API directly:
echo   curl -v http://localhost:8002/api/shares/test123/access
echo.
echo Check browser network tab for redirect chain
echo Enable "Preserve log" to see all requests
echo.

pause