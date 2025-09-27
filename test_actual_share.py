#!/usr/bin/env python3
"""
Test the actual share token from the browser
"""

import requests
import json

BASE_URL = "http://localhost:8002"
SHARE_TOKEN = "uHV39HjwVXP023RbIDl_mKW1z4VhyhwYXLkQoKNkp3k"

def test_actual_share():
    """Test the actual share token that's failing"""

    print(f"Testing share token: {SHARE_TOKEN}")

    try:
        # Test the share access endpoint
        response = requests.post(
            f"{BASE_URL}/api/v1/shares/{SHARE_TOKEN}/access",
            json={},
            timeout=10
        )

        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")

        try:
            data = response.json()
            print(f"Response JSON: {json.dumps(data, indent=2)}")

            # Check if it's an internal share requiring authentication
            if response.status_code == 401:
                error_detail = data.get("detail", {})
                if error_detail.get("requiresLogin"):
                    print("ISSUE: This is an INTERNAL share that requires login!")
                    print("SOLUTION: Need to change share type to EXTERNAL or provide authentication")

        except json.JSONDecodeError:
            print(f"Response text: {response.text}")

        # Also test the share details endpoint to see share configuration
        print(f"\nTesting share details endpoint...")
        details_response = requests.get(
            f"{BASE_URL}/api/v1/shares/{SHARE_TOKEN}",
            timeout=10
        )

        print(f"Details Status: {details_response.status_code}")

        try:
            details_data = details_response.json()
            print(f"Share Details: {json.dumps(details_data, indent=2)}")

            if "shareType" in details_data:
                share_type = details_data.get("shareType")
                print(f"\nShare Type: {share_type}")

                if share_type == "internal":
                    print("❌ PROBLEM: Share is configured as 'internal' - requires authentication")
                    print("✅ SOLUTION: Share should be 'external' for public access")
                elif share_type == "external":
                    print("✅ Share is configured as 'external' - should work without auth")

        except json.JSONDecodeError:
            print(f"Details response text: {details_response.text}")

    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_actual_share()