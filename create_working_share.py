#!/usr/bin/env python3
"""
Create a working external share for testing
"""

import requests
import json

BASE_URL = "http://localhost:8002"

def create_working_external_share():
    """Create a working external share that can be accessed without auth"""

    print("Step 1: Login to get auth token...")

    # Try different login endpoints
    login_endpoints = [
        "/api/auth/login",
        "/api/v1/auth/login",
        "/auth/login",
        "/login"
    ]

    login_data = {"username": "admin", "password": "admin123"}
    token = None

    for endpoint in login_endpoints:
        try:
            print(f"Trying login at: {endpoint}")
            response = requests.post(f"{BASE_URL}{endpoint}", json=login_data)
            if response.status_code == 200:
                data = response.json()
                token = data.get("access_token") or data.get("token")
                if token:
                    print(f"SUCCESS: Got token from {endpoint}")
                    break
        except Exception as e:
            print(f"Failed {endpoint}: {e}")

    if not token:
        print("ERROR: Could not get auth token with any endpoint")
        print("Available options:")
        print("1. Make sure the backend is running")
        print("2. Check if admin user exists")
        print("3. Try different credentials")
        return None

    print("Step 2: Create external share...")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Try to create a share for different document IDs
    for doc_id in [1, 2, 3, 47, 48]:
        share_data = {
            "document_id": doc_id,
            "share_name": f"External Share for Doc {doc_id}",
            "share_type": "external",  # KEY: This makes it accessible without auth
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
            print(f"Trying to create share for document {doc_id}...")
            response = requests.post(
                f"{BASE_URL}/api/v1/shares/?document_id={doc_id}",
                json=share_data,
                headers=headers
            )

            if response.status_code == 201:
                result = response.json()
                share_token = result["share"]["shareToken"]

                print(f"SUCCESS: External share created!")
                print(f"Document ID: {doc_id}")
                print(f"Share Token: {share_token}")
                print(f"Frontend URL: http://localhost:3005/share/{share_token}")

                # Test the share access
                print("Step 3: Testing external share access...")
                test_response = requests.post(
                    f"{BASE_URL}/api/v1/shares/{share_token}/access",
                    json={}
                )

                if test_response.status_code == 200:
                    print("SUCCESS: External share accessible without auth!")
                    return share_token
                else:
                    print(f"WARNING: Share created but access failed: {test_response.status_code}")
                    try:
                        error_data = test_response.json()
                        print(f"Error: {json.dumps(error_data, indent=2)}")
                    except:
                        print(f"Response: {test_response.text}")

            else:
                print(f"Failed to create share for doc {doc_id}: {response.status_code}")
                if response.status_code == 404:
                    print(f"Document {doc_id} doesn't exist")

        except Exception as e:
            print(f"Error creating share for doc {doc_id}: {e}")

    print("ERROR: Could not create any working external shares")
    return None

if __name__ == "__main__":
    create_working_external_share()