#!/usr/bin/env python3
"""
Simple test of authentication error handling in share access
"""

import requests
import json

BASE_URL = "http://localhost:8002"

def test_no_auth():
    """Test access with no authentication"""
    print("Testing no authentication...")

    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/shares/test_token/access",
            json={}
        )

        print(f"Status Code: {response.status_code}")

        try:
            response_data = response.json()
            print("Response Data:")
            print(json.dumps(response_data, indent=2))
        except:
            print(f"Response Text: {response.text}")

        # We expect either 404 (share not found) or 401 (auth required)
        # Both are better than 500 (server error)
        if response.status_code in [401, 403, 404]:
            print("SUCCESS: No 500 error - proper HTTP status returned")
        else:
            print(f"ISSUE: Got status {response.status_code}, expected 401/403/404")

    except Exception as e:
        print(f"Request failed: {e}")

def test_invalid_token():
    """Test access with invalid token"""
    print("\nTesting invalid token...")

    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/shares/test_token/access",
            headers={"Authorization": "Bearer invalid_token"},
            json={}
        )

        print(f"Status Code: {response.status_code}")

        try:
            response_data = response.json()
            print("Response Data:")
            print(json.dumps(response_data, indent=2))
        except:
            print(f"Response Text: {response.text}")

        if response.status_code in [401, 403, 404]:
            print("SUCCESS: No 500 error - proper HTTP status returned")
        else:
            print(f"ISSUE: Got status {response.status_code}, expected 401/403/404")

    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    print("Starting authentication error handling tests...")
    test_no_auth()
    test_invalid_token()
    print("Tests completed!")