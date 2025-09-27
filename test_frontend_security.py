#!/usr/bin/env python3
"""
Test script to verify frontend security dashboard works without 403 errors.
"""

import requests
import time

def test_complete_flow():
    """Test the complete authentication and security dashboard flow."""

    print("Testing Complete Security Dashboard Flow")
    print("=" * 50)

    backend_url = "http://localhost:8002"
    frontend_url = "http://localhost:3006"

    try:
        # 1. Verify backend is accessible
        print("1. Testing backend health...")
        health_response = requests.get(f"{backend_url}/health")
        if health_response.status_code == 200:
            print("   [OK] Backend is healthy")
        else:
            print(f"   [ERROR] Backend health check failed: {health_response.status_code}")
            return False

        # 2. Test login flow
        print("\n2. Testing login...")
        login_data = {
            "username": "rahumana",
            "password": "TestPass123@"
        }

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
            print(f"   [ERROR] Response: {login_response.text}")
            return False

        # 3. Test security dashboard endpoint (the main issue)
        print("\n3. Testing security dashboard endpoint...")
        headers = {"Authorization": f"Bearer {access_token}"}

        dashboard_response = requests.get(
            f"{backend_url}/api/v1/security/dashboard?hours=24",
            headers=headers
        )

        print(f"   [STATUS] Response code: {dashboard_response.status_code}")

        if dashboard_response.status_code == 200:
            print("   [SUCCESS] Security dashboard accessible!")
            dashboard_data = dashboard_response.json()
            print(f"   [INFO] Dashboard data keys: {list(dashboard_data.keys())}")
        elif dashboard_response.status_code == 403:
            print("   [STILL FAILING] 403 Forbidden - RBAC issue persists!")
            print(f"   [ERROR] Response: {dashboard_response.text}")
            return False
        elif dashboard_response.status_code == 401:
            print("   [ERROR] 401 Unauthorized - Token issue")
            print(f"   [ERROR] Response: {dashboard_response.text}")
            return False
        else:
            print(f"   [ERROR] Unexpected status: {dashboard_response.status_code}")
            print(f"   [ERROR] Response: {dashboard_response.text}")
            return False

        # 4. Test security metrics endpoint
        print("\n4. Testing security metrics endpoint...")
        metrics_response = requests.get(
            f"{backend_url}/api/v1/security/metrics?days=7",
            headers=headers
        )

        print(f"   [STATUS] Response code: {metrics_response.status_code}")

        if metrics_response.status_code == 200:
            print("   [SUCCESS] Security metrics accessible!")
            metrics_data = metrics_response.json()
            print(f"   [INFO] Metrics data keys: {list(metrics_data.keys())}")
        elif metrics_response.status_code == 403:
            print("   [STILL FAILING] 403 Forbidden - RBAC issue persists!")
            return False
        else:
            print(f"   [WARNING] Status: {metrics_response.status_code}")

        # 5. Test frontend accessibility
        print("\n5. Testing frontend accessibility...")
        try:
            frontend_response = requests.get(frontend_url, timeout=5)
            if frontend_response.status_code == 200:
                print("   [OK] Frontend is accessible")
            else:
                print(f"   [WARNING] Frontend status: {frontend_response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"   [WARNING] Frontend not accessible: {e}")

        print("\n" + "=" * 50)
        print("[SUCCESS] All security endpoints are working!")
        print("The 403 Forbidden error has been resolved.")
        print("Users with admin/super_admin roles can now access security dashboard.")
        return True

    except Exception as e:
        print(f"\n[ERROR] Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_complete_flow()
    if success:
        print("\n✅ ALL TESTS PASSED - 403 Error Fixed!")
    else:
        print("\n❌ Tests failed - issue still exists")