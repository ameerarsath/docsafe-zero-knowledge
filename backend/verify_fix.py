#!/usr/bin/env python3
"""
DocSafe Quick Fix Verification Script

This script tests all the fixes applied to resolve CORS and backend issues.
"""

import requests
import json
import sys
from datetime import datetime

def test_endpoint(url, description, method="GET", headers=None, data=None):
    """Test an API endpoint and return results."""
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=5)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=5)
        
        return {
            "success": True,
            "status_code": response.status_code,
            "data": response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
        }
    except requests.exceptions.ConnectionError:
        return {"success": False, "error": "Connection refused - server not running"}
    except requests.exceptions.Timeout:
        return {"success": False, "error": "Request timeout"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    """Main verification function."""
    print("🔧 DocSafe Fix Verification")
    print("=" * 50)
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()
    
    base_url = "http://localhost:8002"
    tests_passed = 0
    total_tests = 0
    
    # Test cases
    test_cases = [
        {
            "url": f"{base_url}/",
            "description": "Root endpoint",
            "expected_status": 200
        },
        {
            "url": f"{base_url}/health",
            "description": "Health check",
            "expected_status": 200
        },
        {
            "url": f"{base_url}/health/db",
            "description": "Database health",
            "expected_status": 200
        },
        {
            "url": f"{base_url}/health/redis",
            "description": "Redis health", 
            "expected_status": 200
        },
        {
            "url": f"{base_url}/docs",
            "description": "API documentation",
            "expected_status": 200
        },
        {
            "url": f"{base_url}/api/v1/auth/health",
            "description": "Auth health check",
            "expected_status": 200
        }
    ]
    
    print("🧪 Running endpoint tests...")
    print()
    
    for test_case in test_cases:
        total_tests += 1
        result = test_endpoint(test_case["url"], test_case["description"])
        
        if result["success"]:
            if result["status_code"] == test_case["expected_status"]:
                print(f"SUCCESS: {test_case['description']}: PASS ({result['status_code']})")
                tests_passed += 1
            else:
                print(f"WARNING:  {test_case['description']}: UNEXPECTED STATUS ({result['status_code']})")
        else:
            print(f"ERROR: {test_case['description']}: FAIL - {result['error']}")
    
    print()
    print("🔍 CORS Test...")
    
    # Test CORS headers
    try:
        response = requests.options(f"{base_url}/api/v1/documents/statistics", 
                                   headers={
                                       "Origin": "http://localhost:3005",
                                       "Access-Control-Request-Method": "GET",
                                       "Access-Control-Request-Headers": "authorization"
                                   }, timeout=5)
        
        cors_headers = {
            "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
            "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
            "Access-Control-Allow-Headers": response.headers.get("Access-Control-Allow-Headers"),
            "Access-Control-Allow-Credentials": response.headers.get("Access-Control-Allow-Credentials")
        }
        
        if cors_headers["Access-Control-Allow-Origin"]:
            print("SUCCESS: CORS: Headers present")
            total_tests += 1
            tests_passed += 1
            
            print(f"   Origin: {cors_headers['Access-Control-Allow-Origin']}")
            print(f"   Methods: {cors_headers['Access-Control-Allow-Methods']}")
            print(f"   Credentials: {cors_headers['Access-Control-Allow-Credentials']}")
        else:
            print("ERROR: CORS: Missing headers")
            total_tests += 1
            
    except Exception as e:
        print(f"ERROR: CORS: Test failed - {e}")
        total_tests += 1
    
    print()
    print("📊 Configuration Check...")
    
    # Check if we can access the root endpoint for configuration info
    root_result = test_endpoint(f"{base_url}/", "Configuration check")
    if root_result["success"] and isinstance(root_result["data"], dict):
        config_data = root_result["data"]
        print(f"SUCCESS: App Name: {config_data.get('message', 'Unknown')}")
        print(f"SUCCESS: Version: {config_data.get('version', 'Unknown')}")
        print(f"SUCCESS: Environment: {config_data.get('environment', 'Unknown')}")
        print(f"SUCCESS: Status: {config_data.get('status', 'Unknown')}")
    else:
        print("ERROR: Could not retrieve configuration info")
    
    print()
    print("=" * 50)
    print(f"📈 Test Results: {tests_passed}/{total_tests} passed")
    
    if tests_passed == total_tests:
        print("🎉 ALL TESTS PASSED! Your DocSafe backend is working correctly.")
        print()
        print("SUCCESS: Next steps:")
        print("   1. Start your frontend with: npm run dev")
        print("   2. Access the app at: http://localhost:3005")
        print("   3. API docs available at: http://localhost:8002/docs")
        print()
        return True
    else:
        print("ERROR: Some tests failed. Check the issues above.")
        print()
        print("🔧 Troubleshooting:")
        if tests_passed == 0:
            print("   - Backend server may not be running")
            print("   - Run: python run_server.py")
        else:
            print("   - Some services may not be configured correctly")
            print("   - Check database and Redis connections")
            print("   - Run: python health_check.py")
        print()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
