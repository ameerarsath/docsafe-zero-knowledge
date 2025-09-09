#!/usr/bin/env python3
"""
Test the RBAC permissions endpoint directly
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

import requests
import json

# API base URL
API_BASE = "http://localhost:8002/api"

def test_permissions_endpoint():
    """Test the RBAC permissions endpoint directly."""
    
    print("Testing RBAC permissions endpoint...")
    print("=" * 50)
    
    # First login to get token
    login_data = {
        "username": "rahumana",
        "password": "TestPass123@"
    }
    
    try:
        # Login
        print("1. Logging in...")
        response = requests.post(f"{API_BASE}/auth/login", json=login_data)
        
        if response.status_code != 200:
            print(f"   Login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return
        
        data = response.json()
        token = data.get('access_token')
        print(f"   Login successful, got token")
        
        # Test permissions endpoint
        print("\n2. Testing permissions endpoint...")
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{API_BASE}/v1/rbac/users/me/permissions", headers=headers)
        
        print(f"   Status: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        print(f"   Response: {response.text}")
        
        if response.status_code == 200:
            permissions = response.json()
            print(f"   SUCCESS: Got {len(permissions)} permissions:")
            for perm in sorted(permissions):
                print(f"     - {perm}")
        else:
            print(f"   ERROR: Status {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"   Raw response: {response.text}")
    
    except Exception as e:
        print(f"   Exception: {e}")

if __name__ == "__main__":
    test_permissions_endpoint()