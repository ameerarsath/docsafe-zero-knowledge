#!/usr/bin/env python3
"""
Debug script to test the login endpoint exactly like the frontend does.
"""

import requests
import json
import sys

def test_login():
    """Test login endpoint with the same parameters as frontend."""

    # Backend URL
    backend_url = "http://localhost:8002"
    login_url = f"{backend_url}/api/auth/login"

    # Request payload (exactly as frontend sends it)
    payload = {
        "username": "rahumana",
        "password": "TestPass123@"
    }

    # Headers (exactly as frontend sends them)
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Origin": "http://localhost:3005",
        "User-Agent": "Mozilla/5.0 (compatible; Debug script)"
    }

    try:
        print(f"TESTING: Login at {login_url}")
        print(f"PAYLOAD: {json.dumps(payload, indent=2)}")
        print(f"HEADERS: {json.dumps(headers, indent=2)}")
        print("-" * 50)

        # Make the request
        response = requests.post(
            login_url,
            json=payload,
            headers=headers,
            timeout=10,
            verify=False  # For testing
        )

        print(f"STATUS: {response.status_code}")
        print(f"RESPONSE HEADERS: {dict(response.headers)}")

        if response.status_code == 200:
            print("SUCCESS: Login worked!")
            data = response.json()
            print(f"DATA KEYS: {list(data.keys())}")
            print(f"ACCESS TOKEN: {data.get('access_token', 'Not found')[:50]}...")
            print(f"USERNAME: {data.get('username', 'Not found')}")
            print(f"ROLE: {data.get('role', 'Not found')}")
        else:
            print("FAILED: Login did not work!")
            try:
                error_data = response.json()
                print(f"ERROR: {json.dumps(error_data, indent=2)}")
            except:
                print(f"RAW ERROR: {response.text}")

    except requests.exceptions.ConnectionError:
        print("CONNECTION ERROR: Cannot connect to backend server!")
        print("   Make sure the backend is running on http://localhost:8002")
        return False
    except requests.exceptions.Timeout:
        print("TIMEOUT ERROR: Request took too long!")
        return False
    except requests.exceptions.RequestException as e:
        print(f"REQUEST ERROR: {e}")
        return False
    except Exception as e:
        print(f"UNEXPECTED ERROR: {e}")
        return False

    return response.status_code == 200

def test_health_check():
    """Test if backend is running."""
    try:
        response = requests.get("http://localhost:8002/health", timeout=5)
        if response.status_code == 200:
            print("SUCCESS: Backend health check passed")
            return True
        else:
            print(f"FAILED: Backend health check failed: {response.status_code}")
            return False
    except:
        print("FAILED: Backend not reachable")
        return False

if __name__ == "__main__":
    print("DEBUG: SecureVault Login Debug Script")
    print("=" * 50)

    # Test backend health first
    if not test_health_check():
        print("\nTIP: Make sure to start the backend server first:")
        print("   cd backend && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8002")
        sys.exit(1)

    # Test login
    print()
    success = test_login()

    if success:
        print("\nSUCCESS: Login test successful! The backend is working correctly.")
        print("   If the frontend is still failing, the issue is likely in:")
        print("   1. Frontend Axios configuration")
        print("   2. CORS preflight requests")
        print("   3. Frontend error handling")
    else:
        print("\nFAILED: Login test failed. Check the backend logs for more details.")