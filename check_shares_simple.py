#!/usr/bin/env python3
"""
Check shares and create test external share (no unicode)
"""

import requests
import json

BASE_URL = "http://localhost:8002"

def get_auth_token():
    """Get authentication token"""
    login_data = {
        "username": "admin",
        "password": "admin123"
    }

    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code == 200:
            return response.json().get("access_token")
    except:
        pass

    return None

def create_test_external_share():
    """Create a test external share"""

    token = get_auth_token()
    if not token:
        print("Could not get authentication token")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Create a test external share
    share_data = {
        "document_id": 1,
        "share_name": "Test External Share",
        "share_type": "external",  # KEY: external = no auth required
        "allow_download": True,
        "allow_preview": True,
        "allow_comment": False,
        "require_password": False,
        "password": None,
        "expires_at": None,
        "max_access_count": None,
        "access_restrictions": {},
        "encryption_password": "testpass123"
    }

    try:
        print("Creating test external share...")
        response = requests.post(
            f"{BASE_URL}/api/v1/shares/?document_id=1",
            json=share_data,
            headers=headers
        )

        print(f"Create share status: {response.status_code}")

        if response.status_code == 201:
            result = response.json()
            share_token = result["share"]["shareToken"]
            share_url = result["shareUrl"]

            print(f"SUCCESS: External share created!")
            print(f"Share Token: {share_token}")
            print(f"Share URL: {share_url}")

            # Test accessing without authentication
            print(f"\nTesting external share access (no auth)...")
            test_response = requests.post(
                f"{BASE_URL}/api/v1/shares/{share_token}/access",
                json={}
            )

            print(f"Access status: {test_response.status_code}")

            if test_response.status_code == 200:
                print("SUCCESS: External share works without auth!")
                access_data = test_response.json()
                print(f"Document: {access_data['document']['name']}")
                print(f"Permissions: {access_data['permissions']}")

                print(f"\nYou can test this URL in your browser:")
                print(f"http://localhost:3005/share/{share_token}")

            else:
                print(f"FAIL: External share still requires auth")
                try:
                    error_data = test_response.json()
                    print(f"Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"Response: {test_response.text}")

        else:
            print(f"FAIL: Could not create share")
            print(f"Response: {test_response.text}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_test_external_share()