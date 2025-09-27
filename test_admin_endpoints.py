#!/usr/bin/env python3
"""
Test script to verify admin endpoints work without 403 errors.
"""

import requests
import time

def test_admin_endpoints():
    """Test the admin endpoints that were failing with 403 errors."""

    print("Testing Admin Endpoints")
    print("=" * 30)

    backend_url = "http://localhost:8002"

    try:
        # 1. Test login first to get a token
        login_data = {
            "username": "rahumana",
            "password": "TestPass123@"
        }

        print("1. Attempting login...")
        login_response = requests.post(f"{backend_url}/api/auth/login", json=login_data)

        if login_response.status_code == 200:
            token_data = login_response.json()
            access_token = token_data.get("access_token")
            user_role = token_data.get("user", {}).get("role", "unknown")
            print(f"   [OK] Login successful")
            print(f"   [INFO] User role: {user_role}")
            print(f"   [INFO] Token: {access_token[:20]}...")
        else:
            print(f"   [ERROR] Login failed: {login_response.status_code}")
            return False

        headers = {"Authorization": f"Bearer {access_token}"}

        # 2. Test admin system health endpoint (the failing one)
        print("\n2. Testing admin system health endpoint...")
        health_response = requests.get(
            f"{backend_url}/api/v1/admin/system/health",
            headers=headers
        )

        print(f"   [STATUS] Response code: {health_response.status_code}")

        if health_response.status_code == 200:
            print("   [SUCCESS] Admin system health accessible!")
            health_data = health_response.json()
            print(f"   [INFO] Health status: {health_data.get('status', 'unknown')}")
        elif health_response.status_code == 403:
            print("   [STILL FAILING] 403 Forbidden - RBAC issue persists!")
            print(f"   [ERROR] Response: {health_response.text}")
            return False
        else:
            print(f"   [ERROR] Unexpected status: {health_response.status_code}")
            print(f"   [ERROR] Response: {health_response.text}")

        # 3. Test admin system metrics endpoint
        print("\n3. Testing admin system metrics endpoint...")
        metrics_response = requests.get(
            f"{backend_url}/api/v1/admin/system/metrics",
            headers=headers
        )

        print(f"   [STATUS] Response code: {metrics_response.status_code}")

        if metrics_response.status_code == 200:
            print("   [SUCCESS] Admin system metrics accessible!")
        elif metrics_response.status_code == 403:
            print("   [WARNING] 403 Forbidden on metrics (may have different permission)")
        else:
            print(f"   [WARNING] Status: {metrics_response.status_code}")

        # 4. Test admin users endpoint
        print("\n4. Testing admin users endpoint...")
        users_response = requests.get(
            f"{backend_url}/api/v1/admin/users",
            headers=headers
        )

        print(f"   [STATUS] Response code: {users_response.status_code}")

        if users_response.status_code == 200:
            print("   [SUCCESS] Admin users endpoint accessible!")
        elif users_response.status_code == 403:
            print("   [WARNING] 403 Forbidden on users endpoint")
        else:
            print(f"   [WARNING] Status: {users_response.status_code}")

        # 5. Test admin audit logs endpoint
        print("\n5. Testing admin audit logs endpoint...")
        audit_response = requests.get(
            f"{backend_url}/api/v1/admin/audit/logs",
            headers=headers
        )

        print(f"   [STATUS] Response code: {audit_response.status_code}")

        if audit_response.status_code == 200:
            print("   [SUCCESS] Admin audit logs accessible!")
        elif audit_response.status_code == 403:
            print("   [WARNING] 403 Forbidden on audit logs")
        else:
            print(f"   [WARNING] Status: {audit_response.status_code}")

        print("\n" + "=" * 30)

        # Check if the main issue is resolved
        if health_response.status_code == 200:
            print("[SUCCESS] Admin system health endpoint is now working!")
            print("The primary 403 error has been resolved.")
            return True
        else:
            print("[PARTIAL] Some admin endpoints may still have permission issues.")
            return False

    except Exception as e:
        print(f"\n[ERROR] Test failed with exception: {e}")
        return False

if __name__ == "__main__":
    success = test_admin_endpoints()
    if success:
        print("\n✅ Primary admin endpoint issue FIXED!")
    else:
        print("\n❌ Admin endpoint issues persist")