#!/usr/bin/env python3
"""
Simple test script to verify the 422 share creation fix
"""

import requests
import json
import sys

# API Base URL
BASE_URL = "http://localhost:8002"

def test_share_creation():
    """Test creating a document share with the fixed payload"""

    print("Getting authentication token...")

    # Try to login with test credentials
    login_data = {
        "username": "admin",
        "password": "admin123"
    }

    try:
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if login_response.status_code != 200:
            print(f"Login failed: {login_response.status_code} - {login_response.text}")
            return False

        token_data = login_response.json()
        access_token = token_data.get("access_token")

        if not access_token:
            print("No access token in response")
            return False

        print("Authentication successful")

    except Exception as e:
        print(f"Login error: {e}")
        return False

    # Set up headers
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    # Test document ID (we'll use 47 as mentioned in the issue)
    document_id = 47

    # Create test share payload with the fixed format
    share_payload = {
        "document_id": document_id,
        "share_name": "Test Share Fix",
        "share_type": "internal",
        "allow_download": True,
        "allow_preview": True,
        "allow_comment": False,
        "require_password": False,
        "password": None,  # null instead of empty string
        "expires_at": None,  # null instead of empty string
        "max_access_count": None,  # null instead of undefined
        "access_restrictions": {},
        "encryption_password": "testpass123"  # Include encryption password
    }

    print("Testing share creation with payload:")
    print(json.dumps(share_payload, indent=2))

    try:
        # Make the API call
        response = requests.post(
            f"{BASE_URL}/api/v1/shares/?document_id={document_id}",
            json=share_payload,
            headers=headers
        )

        print(f"Response Status: {response.status_code}")

        if response.status_code == 201:
            print("SUCCESS: Share created successfully!")
            result = response.json()
            print("Response data:")
            print(json.dumps(result, indent=2))
            return True
        else:
            print(f"FAILED: Status {response.status_code}")
            print(f"Response: {response.text}")

            # Try to parse error details
            try:
                error_data = response.json()
                print(f"Error details:")
                print(json.dumps(error_data, indent=2))
            except:
                pass

            return False

    except Exception as e:
        print(f"Request error: {e}")
        return False

if __name__ == "__main__":
    print("Starting share creation fix test...")
    success = test_share_creation()

    if success:
        print("Test completed successfully!")
    else:
        print("Test failed")
        sys.exit(1)