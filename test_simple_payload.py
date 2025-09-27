#!/usr/bin/env python3
"""Simple test for share creation payload"""
import sys
sys.path.append('backend')

from backend.app.schemas.document import DocumentShareCreate

# Test different payload variations
test_cases = [
    {
        "name": "Complete payload",
        "data": {
            "share_name": "Test External Share",
            "share_type": "external",
            "allow_download": False,
            "allow_preview": True,
            "allow_comment": False,
            "require_password": False,
            "password": None,
            "expires_at": None,
            "max_access_count": None,
            "access_restrictions": {}
        }
    },
    {
        "name": "Minimal payload",
        "data": {
            "share_name": "Test Share",
            "share_type": "external"
        }
    },
    {
        "name": "Internal share",
        "data": {
            "share_name": "Internal Test Share",
            "share_type": "internal",
            "allow_download": True,
            "allow_preview": True
        }
    }
]

for test_case in test_cases:
    print(f"\n--- Testing: {test_case['name']} ---")
    try:
        # Create the Pydantic model
        share_data = DocumentShareCreate(**test_case['data'])
        print(f"SUCCESS: Pydantic validation passed")
        print(f"Data: {share_data.dict()}")

    except Exception as e:
        print(f"ERROR: Pydantic validation failed: {e}")
        print(f"Error type: {type(e)}")