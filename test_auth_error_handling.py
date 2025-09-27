#!/usr/bin/env python3
"""
Test script to verify authentication error handling in share access
"""

import requests
import json

BASE_URL = "http://localhost:8002"

def test_auth_scenarios():
    """Test different authentication scenarios"""

    print("Testing authentication error handling scenarios...")
    print("=" * 60)

    # Test cases
    test_cases = [
        {
            "name": "No auth header (external share should work, internal should fail)",
            "headers": {},
            "share_token": "test_external",
            "expected_status": [401, 404]  # 404 if share doesn't exist, 401 if internal
        },
        {
            "name": "Invalid auth token",
            "headers": {"Authorization": "Bearer invalid_token_12345"},
            "share_token": "test_internal",
            "expected_status": [401, 404]
        },
        {
            "name": "Expired token format",
            "headers": {"Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.expired"},
            "share_token": "test_internal",
            "expected_status": [401, 404]
        },
        {
            "name": "Malformed auth header",
            "headers": {"Authorization": "InvalidFormat"},
            "share_token": "test_internal",
            "expected_status": [401, 404]
        }
    ]

    for i, test_case in enumerate(test_cases, 1):
        print(f"\nTest {i}: {test_case['name']}")
        print("-" * 40)

        try:
            response = requests.post(
                f"{BASE_URL}/api/v1/shares/{test_case['share_token']}/access",
                headers=test_case["headers"],
                json={}
            )

            print(f"Status Code: {response.status_code}")
            print(f"Expected: {test_case['expected_status']}")

            # Try to parse response
            try:
                response_data = response.json()
                print("Response Data:")
                print(json.dumps(response_data, indent=2))

                # Check if we get proper error structure
                if response.status_code in [401, 403]:
                    if "detail" in response_data and isinstance(response_data["detail"], dict):
                        detail = response_data["detail"]
                        if "error" in detail and "message" in detail:
                            print(f"✅ Proper error structure: {detail['error']} - {detail['message']}")
                        else:
                            print(f"⚠️  Missing error/message in detail")
                    else:
                        print(f"⚠️  No structured detail in response")

                elif response.status_code == 404:
                    print("✅ Share not found (expected for test tokens)")
                else:
                    print(f"ℹ️  Unexpected status code: {response.status_code}")

            except json.JSONDecodeError:
                print(f"Response Text: {response.text}")

            # Check if status code is as expected
            if response.status_code in test_case["expected_status"]:
                print("✅ Status code matches expected")
            else:
                print(f"❌ Status code {response.status_code} not in expected {test_case['expected_status']}")

        except Exception as e:
            print(f"❌ Request failed: {e}")

        print()

def test_share_token_formats():
    """Test various share token formats"""
    print("\nTesting share token validation...")
    print("=" * 40)

    invalid_tokens = [
        "",
        "too-short",
        "invalid-chars!@#",
        "a" * 100,  # too long
        "../../../etc/passwd",  # path traversal attempt
        "null",
        "undefined"
    ]

    for token in invalid_tokens:
        print(f"Testing token: '{token}'")
        try:
            response = requests.post(
                f"{BASE_URL}/api/v1/shares/{token}/access",
                json={}
            )
            print(f"  Status: {response.status_code}")

            if response.status_code == 404:
                print("  ✅ Properly rejected invalid token")
            elif response.status_code == 422:
                print("  ⚠️  Validation error (expected)")
            else:
                print(f"  ❌ Unexpected status: {response.status_code}")

        except Exception as e:
            print(f"  ❌ Request failed: {e}")

if __name__ == "__main__":
    print("🚀 Starting authentication error handling tests...")
    test_auth_scenarios()
    test_share_token_formats()
    print("\n🎉 Tests completed!")