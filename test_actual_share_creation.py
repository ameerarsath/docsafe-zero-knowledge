#!/usr/bin/env python3
"""Test actual share creation by calling the endpoint directly"""
import requests
import json

# Test with the exact same data the frontend would send
def test_share_creation():
    print("Testing Share Creation with Real Request")
    print("=" * 50)

    # Test data - exactly what frontend sends
    url = "http://localhost:8002/api/v1/shares/?document_id=48"

    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwiZW1haWwiOiJ0ZXN0dXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU4Nzc1MzMxLCJleHAiOjE3NTg4NjE3MzF9.Ahf5PXSlxxKd_alfT61cSvzcUiFhriXZmddgaW77QAc"
    }

    data = {
        "share_name": "Test External Share",
        "share_type": "external",
        "allow_preview": True,
        "allow_download": False
    }

    try:
        print(f"POST {url}")
        print(f"Headers: {json.dumps(dict(headers), indent=2)}")
        print(f"Data: {json.dumps(data, indent=2)}")

        response = requests.post(url, json=data, headers=headers, timeout=10)

        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")

        try:
            response_data = response.json()
            print(f"Response JSON: {json.dumps(response_data, indent=2)}")
        except:
            print(f"Response Text: {response.text}")

        # Analyze the response
        if response.status_code == 201:
            print("\n✓ SUCCESS: Share created successfully!")
        elif response.status_code == 401:
            print("\n✗ AUTHENTICATION FAILED")
        elif response.status_code == 422:
            print("\n✗ VALIDATION ERROR - This is the actual issue!")
        else:
            print(f"\n? Unexpected status code: {response.status_code}")

    except requests.exceptions.RequestException as e:
        print(f"\n✗ REQUEST FAILED: {e}")

    except Exception as e:
        print(f"\n✗ ERROR: {e}")

if __name__ == "__main__":
    test_share_creation()