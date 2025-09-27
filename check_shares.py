#!/usr/bin/env python3
"""
Check if there are any shares in the database and create a test one
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
    """Create a test external share that should work without authentication"""

    token = get_auth_token()
    if not token:
        print("❌ Could not get authentication token")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Create a test external share
    share_data = {
        "document_id": 1,  # Assuming document ID 1 exists
        "share_name": "Test External Share",
        "share_type": "external",  # This is key - external = no auth required
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

            print(f"✅ External share created successfully!")
            print(f"Share Token: {share_token}")
            print(f"Share URL: {share_url}")

            # Test accessing the share without authentication
            print(f"\nTesting external share access (no auth required)...")
            test_response = requests.post(
                f"{BASE_URL}/api/v1/shares/{share_token}/access",
                json={}
            )

            print(f"Access status: {test_response.status_code}")

            if test_response.status_code == 200:
                print("✅ External share works! No authentication required.")
                access_data = test_response.json()
                print(f"Document name: {access_data['document']['name']}")
                print(f"Permissions: {access_data['permissions']}")
            else:
                print(f"❌ External share still requires auth: {test_response.text}")

        else:
            print(f"❌ Failed to create share: {response.text}")

    except Exception as e:
        print(f"❌ Error creating share: {e}")

if __name__ == "__main__":
    create_test_external_share()