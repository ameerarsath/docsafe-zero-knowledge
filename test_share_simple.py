#!/usr/bin/env python3
"""
Simple Share Document Functionality Test

Tests the basic sharing functionality endpoints.
"""

import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8002"
API_BASE = f"{BASE_URL}/api/v1"

def test_shares_endpoint():
    """Test if shares endpoints are accessible"""
    print("Testing Share Document Functionality")
    print("=" * 50)

    # Create session with test auth
    session = requests.Session()
    session.headers.update({
        "Authorization": "Bearer test-token",
        "Content-Type": "application/json"
    })

    test_document_id = 1

    print(f"1. Testing share creation for document ID: {test_document_id}")

    # Test 1: Create external share
    try:
        response = session.post(
            f"{API_BASE}/shares/?document_id={test_document_id}",
            json={
                "share_name": "Test External Share",
                "share_type": "external",
                "allow_preview": True,
                "allow_download": False,
                "require_password": False,
                "expires_at": (datetime.now() + timedelta(hours=24)).isoformat()
            }
        )

        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            share_data = response.json()
            share_token = share_data.get("share", {}).get("shareToken", "")
            share_url = share_data.get("shareUrl", "")
            print(f"   SUCCESS: Share created with token: {share_token[:10]}...")
            print(f"   Share URL: {share_url}")

            # Test 2: Access the share
            print("2. Testing share access")
            try:
                access_response = session.get(f"{API_BASE}/shares/{share_token}")
                print(f"   Share details status: {access_response.status_code}")

                if access_response.status_code == 200:
                    print("   SUCCESS: Share details retrieved")

                    # Test 3: Test document access
                    print("3. Testing document access via share")
                    doc_access_response = session.post(
                        f"{API_BASE}/shares/{share_token}/access",
                        json={"password": None}
                    )
                    print(f"   Document access status: {doc_access_response.status_code}")

                    if doc_access_response.status_code == 200:
                        access_data = doc_access_response.json()
                        permissions = access_data.get("permissions", [])
                        print(f"   SUCCESS: Document access granted with permissions: {permissions}")
                    else:
                        print(f"   Document access failed: {doc_access_response.text}")

                else:
                    print(f"   Share details failed: {access_response.text}")

            except Exception as e:
                print(f"   Share access error: {e}")

        elif response.status_code == 401:
            print("   EXPECTED: Invalid token (authentication required)")
            print("   This confirms the endpoint is working and validating auth")
        else:
            print(f"   FAILED: {response.text}")

    except Exception as e:
        print(f"   ERROR: {e}")

    print()
    print("4. Testing share listing")
    try:
        list_response = session.get(f"{API_BASE}/shares/document/{test_document_id}")
        print(f"   List shares status: {list_response.status_code}")

        if list_response.status_code == 200:
            shares_data = list_response.json()
            share_count = len(shares_data.get("shares", []))
            print(f"   SUCCESS: Found {share_count} shares")
        elif list_response.status_code == 401:
            print("   EXPECTED: Authentication required")
        else:
            print(f"   Response: {list_response.text}")

    except Exception as e:
        print(f"   ERROR: {e}")

    print()
    print("5. Testing invalid share access")
    try:
        invalid_response = session.get(f"{API_BASE}/shares/invalid-token-123")
        print(f"   Invalid share status: {invalid_response.status_code}")

        if invalid_response.status_code == 404:
            print("   SUCCESS: Invalid share properly returns 404")
        elif invalid_response.status_code == 401:
            print("   EXPECTED: Authentication required first")
        else:
            print(f"   Unexpected: {invalid_response.text}")

    except Exception as e:
        print(f"   ERROR: {e}")

    print("\n" + "=" * 50)
    print("Share functionality test completed!")
    print("Note: Authentication errors are expected without valid user login")
    print("The important thing is that endpoints respond correctly")

if __name__ == "__main__":
    test_shares_endpoint()