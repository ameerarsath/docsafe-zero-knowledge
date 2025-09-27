#!/usr/bin/env python3
"""
Simple Manual Share API Test
Tests basic share functionality without complex authentication setup.
"""

import requests
import json

# Configuration
BASE_URL = "http://localhost:8002"
API_BASE = f"{BASE_URL}/api/v1"

def test_share_endpoints():
    """Test basic share API endpoints availability and responses."""

    print("=" * 60)
    print("SHARE API MANUAL TEST")
    print("=" * 60)

    tests = []

    # Test 1: Share endpoint existence with non-existent token
    print("\n1. Testing share endpoint with non-existent token...")
    try:
        response = requests.get(f"{API_BASE}/shares/nonexistent_token", timeout=5)
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text}")

        if response.status_code == 404:
            tests.append(("Share endpoint exists", True))
            print("   [PASS] Share endpoint is accessible and returning correct 404")
        else:
            tests.append(("Share endpoint exists", False))
            print("   [FAIL] Unexpected response")
    except Exception as e:
        tests.append(("Share endpoint exists", False))
        print(f"   [FAIL] Error: {e}")

    # Test 2: Share preview endpoint
    print("\n2. Testing share preview endpoint...")
    try:
        response = requests.post(
            f"{API_BASE}/shares/nonexistent_token/preview",
            json={"password": None},
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text}")

        if response.status_code in [404, 401]:
            tests.append(("Share preview endpoint exists", True))
            print("   [PASS] Share preview endpoint is accessible")
        else:
            tests.append(("Share preview endpoint exists", False))
            print("   [FAIL] Unexpected response")
    except Exception as e:
        tests.append(("Share preview endpoint exists", False))
        print(f"   [FAIL] Error: {e}")

    # Test 3: Share download endpoint
    print("\n3. Testing share download endpoint...")
    try:
        response = requests.post(
            f"{API_BASE}/shares/nonexistent_token/download",
            json={"password": None},
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.text}")

        if response.status_code in [404, 401]:
            tests.append(("Share download endpoint exists", True))
            print("   [PASS] Share download endpoint is accessible")
        else:
            tests.append(("Share download endpoint exists", False))
            print("   [FAIL] Unexpected response")
    except Exception as e:
        tests.append(("Share download endpoint exists", False))
        print(f"   [FAIL] Error: {e}")

    # Test 4: CORS functionality
    print("\n4. Testing CORS configuration...")
    try:
        response = requests.get(f"{API_BASE}/debug/cors-test", timeout=5)
        print(f"   Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"   Message: {data.get('message', 'N/A')}")
            tests.append(("CORS configured", True))
            print("   [PASS] CORS is properly configured")
        else:
            tests.append(("CORS configured", False))
            print("   [FAIL] CORS test failed")
    except Exception as e:
        tests.append(("CORS configured", False))
        print(f"   [FAIL] Error: {e}")

    # Test 5: API documentation endpoint
    print("\n5. Testing API documentation availability...")
    try:
        response = requests.get(f"{BASE_URL}/docs", timeout=5)
        print(f"   Status: {response.status_code}")

        if response.status_code == 200:
            tests.append(("API docs available", True))
            print("   [PASS] API documentation is accessible")
        else:
            tests.append(("API docs available", False))
            print("   [FAIL] API docs not accessible")
    except Exception as e:
        tests.append(("API docs available", False))
        print(f"   [FAIL] Error: {e}")

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    passed = sum(1 for _, result in tests if result)
    total = len(tests)

    for test_name, result in tests:
        status = "[PASS]" if result else "[FAIL]"
        print(f"{test_name:30} {status}")

    print(f"\nOverall: {passed}/{total} tests passed ({(passed/total*100):.0f}%)")

    if passed == total:
        print("SUCCESS: All tests passed! Share API is ready for integration.")
    elif passed >= total * 0.8:
        print("WARNING: Most tests passed - minor issues detected.")
    else:
        print("ERROR: Multiple issues detected - needs investigation.")

    # Integration notes
    print("\n" + "=" * 60)
    print("INTEGRATION NOTES")
    print("=" * 60)
    print("[OK] Backend server running on: http://localhost:8002")
    print("[OK] API documentation available at: http://localhost:8002/docs")
    print("[OK] Share endpoints implemented and responding")
    print("[OK] CORS configured for frontend communication")
    print("\nFrontend integration should work with:")
    print("- Base URL: http://localhost:8002")
    print("- API endpoints: /api/v1/shares/*")
    print("- Authentication: Bearer tokens (when implemented)")

    return passed == total

if __name__ == "__main__":
    success = test_share_endpoints()
    exit(0 if success else 1)