#!/usr/bin/env python3
"""
Test to reproduce the 500 error when accessing shared documents
"""

import requests
import json

BASE_URL = "http://localhost:8002"

def test_share_access_with_real_scenario():
    """Test the share access endpoint that's causing 500 errors"""

    # Test different scenarios that might cause 500 errors
    scenarios = [
        {
            "name": "No auth header, non-existent share",
            "share_token": "non_existent_share_token",
            "headers": {},
            "data": {}
        },
        {
            "name": "Invalid auth header, non-existent share",
            "share_token": "non_existent_share_token",
            "headers": {"Authorization": "Bearer invalid_token_12345"},
            "data": {}
        },
        {
            "name": "Expired JWT format",
            "share_token": "test_share_token",
            "headers": {"Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjoxNjAwMDAwMDAwfQ.invalid_signature"},
            "data": {"password": "test"}
        },
        {
            "name": "Valid-looking JWT with non-existent user ID",
            "share_token": "test_share_token",
            "headers": {"Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI5OTk5OTkiLCJleHAiOjk5OTk5OTk5OTl9.invalid_signature"},
            "data": {}
        },
        {
            "name": "Empty payload",
            "share_token": "",
            "headers": {},
            "data": {}
        },
        {
            "name": "Special characters in share token",
            "share_token": "../../etc/passwd",
            "headers": {},
            "data": {}
        },
    ]

    for i, scenario in enumerate(scenarios, 1):
        print(f"\n{'='*60}")
        print(f"Test {i}: {scenario['name']}")
        print(f"{'='*60}")

        try:
            url = f"{BASE_URL}/api/v1/shares/{scenario['share_token']}/access"
            print(f"URL: {url}")
            print(f"Headers: {scenario['headers']}")
            print(f"Data: {scenario['data']}")

            response = requests.post(
                url,
                headers=scenario["headers"],
                json=scenario["data"],
                timeout=10
            )

            print(f"\nStatus Code: {response.status_code}")

            # Check if we get a 500 error
            if response.status_code == 500:
                print("❌ REPRODUCED 500 ERROR!")
                print(f"Response text: {response.text}")

                # Try to extract any JSON
                try:
                    error_data = response.json()
                    print(f"Error JSON: {json.dumps(error_data, indent=2)}")
                except:
                    print("No valid JSON in 500 response")

            else:
                print(f"✅ Got proper HTTP status: {response.status_code}")

                # Try to parse response
                try:
                    response_data = response.json()
                    print(f"Response JSON: {json.dumps(response_data, indent=2)}")

                    # Check if response has proper structure
                    if "detail" in response_data:
                        print("✅ Response has 'detail' field for frontend parsing")

                        if isinstance(response_data["detail"], dict) and "error" in response_data["detail"]:
                            print("✅ Response has structured error format")
                        else:
                            print("⚠️ Response 'detail' is not structured")
                    else:
                        print("⚠️ Response missing 'detail' field")

                except json.JSONDecodeError:
                    print(f"Response text: {response.text}")

        except requests.exceptions.RequestException as e:
            print(f"❌ Request failed: {e}")
        except Exception as e:
            print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    print("Testing share access scenarios that might cause 500 errors...")
    test_share_access_with_real_scenario()
    print("\nTest completed!")