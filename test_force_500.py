#!/usr/bin/env python3
"""
Test to force a 500 error to see the response format
"""

import requests
import json

BASE_URL = "http://localhost:8002"

def test_force_database_error():
    """Try to force a database-related error"""

    # This will create a scenario that gets past initial validations but might fail later
    print("Testing with very long share token to potentially trigger database issues...")

    very_long_token = "a" * 1000  # Extremely long token

    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/shares/{very_long_token}/access",
            json={},
            timeout=10
        )

        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")

        if response.status_code == 500:
            print("Got 500 error!")
            print(f"Response text: {response.text}")

            try:
                error_data = response.json()
                print(f"Error JSON: {json.dumps(error_data, indent=2)}")

                if "detail" in error_data:
                    print("SUCCESS: 500 error has proper 'detail' field")

                    if isinstance(error_data["detail"], dict):
                        print("SUCCESS: 'detail' is structured object")
                        if "error" in error_data["detail"] and "message" in error_data["detail"]:
                            print("SUCCESS: Has 'error' and 'message' fields")
                        else:
                            print("WARNING: Missing 'error' or 'message' fields")
                    else:
                        print("WARNING: 'detail' is not structured")
                else:
                    print("ERROR: 500 response missing 'detail' field")

            except json.JSONDecodeError:
                print("ERROR: 500 response is not valid JSON")
        else:
            print(f"Got status {response.status_code} instead of 500")
            try:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
            except:
                print(f"Response text: {response.text}")

    except Exception as e:
        print(f"Request failed: {e}")

def test_sql_injection_attempt():
    """Test with potential SQL injection to trigger error handling"""

    sql_injection_token = "'; DROP TABLE users; --"

    print(f"\nTesting with SQL injection attempt: {sql_injection_token}")

    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/shares/{sql_injection_token}/access",
            json={},
            timeout=10
        )

        print(f"Status: {response.status_code}")

        if response.status_code >= 400:
            try:
                data = response.json()
                print(f"Response: {json.dumps(data, indent=2)}")
            except:
                print(f"Response text: {response.text}")

    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    print("Testing scenarios that might force 500 errors...")
    test_force_database_error()
    test_sql_injection_attempt()
    print("Done!")