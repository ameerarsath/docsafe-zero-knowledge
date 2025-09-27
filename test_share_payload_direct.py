#!/usr/bin/env python3
"""
Direct test of share creation payload (to see exact error)
"""

import requests
import json

BASE_URL = "http://localhost:8002"

def test_direct_payload():
    """Test the share payload directly to see the exact validation error"""

    # Test the old problematic payload format first
    old_payload = {
        "document_id": 47,
        "share_name": "",
        "share_type": "internal",
        "allow_download": True,
        "allow_preview": True,
        "allow_comment": False,
        "require_password": False,
        "password": "",
        "expires_at": "",  # This is the main issue - empty string instead of null
        "max_access_count": None,
        "access_restrictions": {}
    }

    print("Testing OLD payload format (should fail with 422):")
    print(json.dumps(old_payload, indent=2))

    # Make request without auth to see the validation error
    response = requests.post(
        f"{BASE_URL}/api/v1/shares/?document_id=47",
        json=old_payload
    )

    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    print("-" * 50)

    # Now test the fixed payload format
    new_payload = {
        "document_id": 47,
        "share_name": "Test Share",
        "share_type": "internal",
        "allow_download": True,
        "allow_preview": True,
        "allow_comment": False,
        "require_password": False,
        "password": None,  # null instead of empty string
        "expires_at": None,  # null instead of empty string
        "max_access_count": None,
        "access_restrictions": {},
        "encryption_password": "testpass123"
    }

    print("Testing NEW payload format (should pass validation):")
    print(json.dumps(new_payload, indent=2))

    response = requests.post(
        f"{BASE_URL}/api/v1/shares/?document_id=47",
        json=new_payload
    )

    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    test_direct_payload()