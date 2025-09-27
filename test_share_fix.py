#!/usr/bin/env python3
"""
Test script to verify the 422 share creation fix
"""

import requests
import json
import sys

# API Base URL
BASE_URL = "http://localhost:8002"

def test_share_creation():
    """Test creating a document share with the fixed payload"""

    # First, let's try to get a valid auth token
    print("🔐 Getting authentication token...")

    # Try to login with test credentials
    login_data = {
        "username": "admin",
        "password": "admin123"
    }

    try:
        login_response = requests.post(f"{BASE_URL}/api/v1/auth/login", json=login_data)
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.status_code} - {login_response.text}")
            return False

        token_data = login_response.json()
        access_token = token_data.get("access_token")

        if not access_token:
            print("❌ No access token in response")
            return False

        print("✅ Authentication successful")

    except Exception as e:
        print(f"❌ Login error: {e}")
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

    print("📋 Testing share creation with payload:")
    print(json.dumps(share_payload, indent=2))

    try:
        # Make the API call
        response = requests.post(
            f"{BASE_URL}/api/v1/shares/?document_id={document_id}",
            json=share_payload,
            headers=headers
        )

        print(f"📡 Response Status: {response.status_code}")
        print(f"📡 Response Headers: {dict(response.headers)}")

        if response.status_code == 201:
            print("✅ SUCCESS: Share created successfully!")
            result = response.json()
            print("📋 Response data:")
            print(json.dumps(result, indent=2))
            return True
        else:
            print(f"❌ FAILED: Status {response.status_code}")
            print(f"📋 Response: {response.text}")

            # Try to parse error details
            try:
                error_data = response.json()
                print(f"📋 Error details:")
                print(json.dumps(error_data, indent=2))
            except:
                pass

            return False

    except Exception as e:
        print(f"❌ Request error: {e}")
        return False

def test_various_payloads():
    """Test different payload variations to ensure fix works"""

    print("\n" + "="*50)
    print("🧪 Testing various payload scenarios...")
    print("="*50)

    # Get token first (simplified)
    login_data = {"username": "admin", "password": "admin123"}
    login_response = requests.post(f"{BASE_URL}/api/v1/auth/login", json=login_data)

    if login_response.status_code != 200:
        print("❌ Cannot get auth token for extended tests")
        return

    token = login_response.json().get("access_token")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    document_id = 47

    test_cases = [
        {
            "name": "Empty expires_at (should be null)",
            "payload": {
                "document_id": document_id,
                "share_name": "Test Empty Expires",
                "share_type": "internal",
                "allow_download": True,
                "allow_preview": True,
                "allow_comment": False,
                "require_password": False,
                "password": None,
                "expires_at": None,  # This was the main issue
                "max_access_count": None,
                "access_restrictions": {},
                "encryption_password": "testpass123"
            }
        },
        {
            "name": "With future expiration date",
            "payload": {
                "document_id": document_id,
                "share_name": "Test With Expiration",
                "share_type": "external",
                "allow_download": False,
                "allow_preview": True,
                "allow_comment": False,
                "require_password": False,
                "password": None,
                "expires_at": "2025-12-31T23:59:59",
                "max_access_count": 10,
                "access_restrictions": {},
                "encryption_password": "testpass123"
            }
        }
    ]

    for i, test_case in enumerate(test_cases, 1):
        print(f"\n🧪 Test {i}: {test_case['name']}")

        response = requests.post(
            f"{BASE_URL}/api/v1/shares/?document_id={document_id}",
            json=test_case["payload"],
            headers=headers
        )

        if response.status_code == 201:
            print(f"✅ Test {i} PASSED")
        else:
            print(f"❌ Test {i} FAILED: {response.status_code}")
            print(f"   Error: {response.text[:200]}")

if __name__ == "__main__":
    print("🚀 Starting share creation fix test...")

    success = test_share_creation()

    if success:
        test_various_payloads()
        print("\n🎉 All tests completed!")
    else:
        print("\n❌ Basic test failed, skipping extended tests")
        sys.exit(1)