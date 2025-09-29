#!/usr/bin/env python3
"""
Create a test share for validation
"""

import requests
import json
import sys

def create_test_share():
    """Create a test share to validate the fix"""

    base_url = "http://localhost:8000"

    # Login to get token
    login_data = {
        "username": "admin",
        "password": "admin123"
    }

    try:
        login_response = requests.post(f"{base_url}/api/auth/login", json=login_data)
        if login_response.status_code != 200:
            print(f"Login failed: {login_response.status_code}")
            return None

        token_data = login_response.json()
        access_token = token_data.get("access_token")

        if not access_token:
            print("No access token")
            return None

        print("Login successful")

    except Exception as e:
        print(f"Login error: {e}")
        return None

    # Create share
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    share_payload = {
        "document_id": 47,
        "share_name": "Test External Share Fix",
        "share_type": "external",
        "permissions": ["view", "download"],
        "expires_at": None,
        "max_access_count": None,
        "require_password": False,
        "password": None
    }

    try:
        response = requests.post(
            f"{base_url}/api/v1/shares/?document_id=47",
            json=share_payload,
            headers=headers
        )

        print(f"Share creation status: {response.status_code}")

        if response.status_code == 201:
            result = response.json()
            share_token = result.get("share_token")
            print(f"Share created successfully: {share_token}")
            return share_token
        else:
            print(f"Share creation failed: {response.text}")
            return None

    except Exception as e:
        print(f"Share creation error: {e}")
        return None

if __name__ == "__main__":
    print("Creating test share...")
    token = create_test_share()

    if token:
        print(f"Test share token: {token}")
    else:
        print("Failed to create test share")
        sys.exit(1)