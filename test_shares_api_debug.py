#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Debug the shares API 422 validation error
"""

import requests
import json
import sys
import os
import codecs

# Force UTF-8 encoding for Windows console
if sys.platform.startswith('win'):
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# API Configuration
BASE_URL = "http://localhost:8000"
API_URL = f"{BASE_URL}/api/v1"

def test_shares_endpoint():
    """Test the shares endpoint to debug 422 error"""

    print("Testing POST /api/v1/shares/ endpoint...")

    # Test data similar to what the frontend sends
    test_payload = {
        "share_name": "test_share",
        "share_type": "internal",
        "allow_download": True,
        "allow_preview": True,
        "allow_comment": False,
        "require_password": False,
        "password": None,
        "expires_at": None,
        "max_access_count": None
    }

    # Test with document_id=48 as mentioned in the error
    document_id = 48

    print(f"Request URL: {API_URL}/shares/?document_id={document_id}")
    print(f"Request payload: {json.dumps(test_payload, indent=2)}")

    try:
        # First, try without authentication to see what happens
        print("\nTesting without authentication...")
        response = requests.post(
            f"{API_URL}/shares/",
            params={"document_id": document_id},
            json=test_payload,
            headers={"Content-Type": "application/json"}
        )

        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")

        try:
            response_data = response.json()
            print(f"Response body: {json.dumps(response_data, indent=2)}")
        except:
            print(f"Response body (raw): {response.text}")

    except Exception as e:
        print(f"Request failed: {e}")

    print("\n" + "="*50)

    # Try with minimal payload
    minimal_payload = {
        "share_name": "test"
    }

    print(f"Testing with minimal payload: {json.dumps(minimal_payload, indent=2)}")

    try:
        response = requests.post(
            f"{API_URL}/shares/",
            params={"document_id": document_id},
            json=minimal_payload,
            headers={"Content-Type": "application/json"}
        )

        print(f"Response status: {response.status_code}")

        try:
            response_data = response.json()
            print(f"Response body: {json.dumps(response_data, indent=2)}")
        except:
            print(f"Response body (raw): {response.text}")

    except Exception as e:
        print(f"Request failed: {e}")

def test_server_status():
    """Test if the server is running"""
    print("Testing server status...")

    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f"Server is running. Health check status: {response.status_code}")
        return True
    except Exception as e:
        print(f"Server not accessible: {e}")
        return False

if __name__ == "__main__":
    print("Starting Shares API Debug Test")
    print("=" * 50)

    if test_server_status():
        test_shares_endpoint()
    else:
        print("Cannot test API - server is not running")
        print("Please start the backend server first: python backend/run_server.py")