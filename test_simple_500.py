#!/usr/bin/env python3
"""
Simple test to reproduce the 500 error
"""

import requests
import json

BASE_URL = "http://localhost:8002"

def test_basic_scenarios():
    """Test basic scenarios that might cause 500 errors"""

    scenarios = [
        {
            "name": "No auth, non-existent share",
            "token": "non_existent",
            "headers": {},
            "data": {}
        },
        {
            "name": "Invalid JWT",
            "token": "test_share",
            "headers": {"Authorization": "Bearer invalid_jwt_token"},
            "data": {}
        },
        {
            "name": "Malformed JWT",
            "token": "test_share",
            "headers": {"Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.malformed"},
            "data": {}
        }
    ]

    for i, scenario in enumerate(scenarios, 1):
        print(f"\nTest {i}: {scenario['name']}")
        print("-" * 40)

        try:
            url = f"{BASE_URL}/api/v1/shares/{scenario['token']}/access"

            response = requests.post(
                url,
                headers=scenario["headers"],
                json=scenario["data"],
                timeout=5
            )

            print(f"Status: {response.status_code}")

            if response.status_code == 500:
                print("ERROR: Got 500 - this is the problem!")
                print(f"Response: {response.text}")
            else:
                print("OK: Got proper status code")

                try:
                    data = response.json()
                    print(f"JSON: {json.dumps(data, indent=2)}")
                except:
                    print(f"Text: {response.text}")

        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == "__main__":
    test_basic_scenarios()