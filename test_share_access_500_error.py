#!/usr/bin/env python3
"""
Test script to reproduce the 500 Internal Server Error on /api/v1/shares/.../access endpoint
and capture the full Python traceback.
"""

import requests
import json
import sys
import traceback
from typing import Optional

# Configuration
BASE_URL = "http://127.0.0.1:8000"
SHARE_TOKEN = "0HobD9ZtaHQOk9pp2-nO_zUufwzBQL06MReUIMw2VWM"  # The token from the error log

def test_share_access_500_error():
    """Test the share access endpoint to reproduce the 500 error."""

    print("=" * 60)
    print("Testing Share Access 500 Error Reproduction")
    print("=" * 60)

    # Test the exact endpoint that's failing
    access_url = f"{BASE_URL}/api/v1/shares/{SHARE_TOKEN}/access"

    print(f"Testing URL: {access_url}")
    print(f"Share Token: {SHARE_TOKEN}")

    # Test payload (minimal)
    test_payload = {
        "password": None
    }

    print(f"Test Payload: {json.dumps(test_payload, indent=2)}")
    print("-" * 60)

    try:
        # Make the request
        print("Making POST request to share access endpoint...")
        response = requests.post(
            access_url,
            json=test_payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            timeout=30
        )

        print(f"Response Status Code: {response.status_code}")
        print(f"Response Headers:")
        for header, value in response.headers.items():
            print(f"  {header}: {value}")

        print("\nResponse Body:")
        try:
            response_json = response.json()
            print(json.dumps(response_json, indent=2))
        except Exception as json_error:
            print(f"Failed to parse JSON response: {json_error}")
            print(f"Raw response text: {response.text}")

        # Additional analysis based on status code
        if response.status_code == 500:
            print("\n" + "="*60)
            print("500 INTERNAL SERVER ERROR DETECTED")
            print("="*60)
            print("This confirms the issue exists.")
            print("Check the server logs for the Python traceback.")
            return False
        elif response.status_code == 404:
            print("\n" + "="*60)
            print("404 NOT FOUND - Share Token Does Not Exist")
            print("="*60)
            print("The share token may have been deleted or is invalid.")
            return False
        elif response.status_code in [401, 403]:
            print("\n" + "="*60)
            print("AUTHENTICATION/AUTHORIZATION ERROR")
            print("="*60)
            print("This is expected behavior for protected shares.")
            return True
        elif response.status_code == 200:
            print("\n" + "="*60)
            print("SUCCESS - Share access worked!")
            print("="*60)
            return True
        else:
            print(f"\nUnexpected status code: {response.status_code}")
            return False

    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to the server.")
        print(f"Make sure the server is running on {BASE_URL}")
        return False
    except requests.exceptions.Timeout:
        print("ERROR: Request timed out.")
        return False
    except Exception as e:
        print(f"ERROR: Unexpected exception occurred: {e}")
        print(f"Exception type: {type(e).__name__}")
        print(f"Traceback:")
        traceback.print_exc()
        return False

def test_with_different_payloads():
    """Test with various payloads to isolate the issue."""

    print("\n" + "="*60)
    print("TESTING DIFFERENT PAYLOADS")
    print("="*60)

    access_url = f"{BASE_URL}/api/v1/shares/{SHARE_TOKEN}/access"

    # Test cases with different payload variations
    test_cases = [
        {
            "name": "Empty payload",
            "payload": {}
        },
        {
            "name": "Password as empty string",
            "payload": {"password": ""}
        },
        {
            "name": "Password as None",
            "payload": {"password": None}
        },
        {
            "name": "Valid password",
            "payload": {"password": "testpass123"}
        },
        {
            "name": "No password field",
            "payload": {}
        }
    ]

    for test_case in test_cases:
        print(f"\nTesting: {test_case['name']}")
        print(f"Payload: {json.dumps(test_case['payload'])}")

        try:
            response = requests.post(
                access_url,
                json=test_case['payload'],
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                timeout=10
            )

            print(f"Status Code: {response.status_code}")

            # Only print the first few lines of the response to avoid clutter
            try:
                response_json = response.json()
                if 'error' in response_json:
                    print(f"Error: {response_json.get('error')}")
                if 'message' in response_json:
                    print(f"Message: {response_json.get('message')}")
                if response.status_code == 500:
                    print("*** 500 ERROR DETECTED ***")
            except:
                print(f"Raw response (first 200 chars): {response.text[:200]}")

        except Exception as e:
            print(f"Request failed: {e}")

def test_share_details_endpoint():
    """Test the share details endpoint to see if the share exists."""

    print("\n" + "="*60)
    print("TESTING SHARE DETAILS ENDPOINT")
    print("="*60)

    details_url = f"{BASE_URL}/api/v1/shares/{SHARE_TOKEN}"

    print(f"Testing URL: {details_url}")

    try:
        response = requests.get(
            details_url,
            headers={"Accept": "application/json"},
            timeout=10
        )

        print(f"Response Status Code: {response.status_code}")

        if response.status_code == 200:
            try:
                response_json = response.json()
                print("Share Details:")
                print(json.dumps(response_json, indent=2))
                return True
            except Exception as json_error:
                print(f"Failed to parse JSON: {json_error}")
                return False
        elif response.status_code == 404:
            print("Share not found - the token may be invalid or expired")
            return False
        else:
            print(f"Unexpected status code: {response.status_code}")
            try:
                print(f"Response: {response.json()}")
            except:
                print(f"Raw response: {response.text}")
            return False

    except Exception as e:
        print(f"Request failed: {e}")
        return False

def check_server_health():
    """Check if the server is running and responding."""

    print("\n" + "="*60)
    print("CHECKING SERVER HEALTH")
    print("="*60)

    health_url = f"{BASE_URL}/health"

    try:
        response = requests.get(health_url, timeout=5)
        print(f"Health check status: {response.status_code}")

        if response.status_code == 200:
            try:
                health_data = response.json()
                print(f"Health data: {json.dumps(health_data, indent=2)}")
            except:
                print(f"Health response: {response.text}")
            return True
        else:
            print("Server health check failed")
            return False

    except requests.exceptions.ConnectionError:
        print("ERROR: Cannot connect to server - make sure it's running")
        return False
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def main():
    """Main test function."""

    print("Share Access 500 Error Debug Script")
    print("This script will test the failing share access endpoint")
    print(f"Server: {BASE_URL}")
    print(f"Share Token: {SHARE_TOKEN}")

    # Step 1: Check server health
    if not check_server_health():
        print("\nServer is not responding. Please start the server first.")
        sys.exit(1)

    # Step 2: Test share details endpoint
    share_exists = test_share_details_endpoint()

    # Step 3: Test the failing access endpoint
    test_share_access_500_error()

    # Step 4: Test with different payloads
    test_with_different_payloads()

    print("\n" + "="*60)
    print("DEBUG RECOMMENDATIONS")
    print("="*60)
    print("1. Check the server terminal/logs for Python tracebacks")
    print("2. Look for database connection issues")
    print("3. Check if the DocumentShare model relationships are properly loaded")
    print("4. Verify the share token exists in the database")
    print("5. Check for any missing foreign key relationships")
    print("\nServer logs should show the exact Python exception causing the 500 error.")

if __name__ == "__main__":
    main()