#!/usr/bin/env python3
"""
Test script to debug the share API endpoint
"""

import requests
import json

# Test data
login_data = {
    "username": "rahumana",
    "password": "TestPass123@"
}

share_data = {
    "document_id": 48,
    "share_name": "Test Share",
    "share_type": "external",
    "allow_download": True,
    "allow_preview": True,
    "allow_comment": False,
    "require_password": False,
    "password": None,
    "expires_at": None,
    "max_access_count": None,
    "access_restrictions": {},
    "encryption_password": "JHNpAZ39g!&Y"
}

def test_share_api():
    base_url = "http://localhost:8002"
    
    # Login first
    print("1. Logging in...")
    try:
        login_response = requests.post(f"{base_url}/api/auth/login", json=login_data)
        print(f"Login status: {login_response.status_code}")
        
        if login_response.status_code != 200:
            print(f"Login failed: {login_response.text}")
            return
            
        login_result = login_response.json()
        token = login_result.get("access_token")
        
        if not token:
            print("No access token received")
            return
            
        print("Login successful")
        
    except Exception as e:
        print(f"Login error: {e}")
        return
    
    # Test share creation
    print("\n2. Creating share...")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        share_response = requests.post(
            f"{base_url}/api/v1/shares/?document_id=48", 
            json=share_data,
            headers=headers
        )
        
        print(f"Share creation status: {share_response.status_code}")
        print(f"Response headers: {dict(share_response.headers)}")
        
        if share_response.status_code != 201:
            print(f"Share creation failed: {share_response.text}")
            try:
                error_json = share_response.json()
                print(f"Error JSON: {json.dumps(error_json, indent=2)}")
            except:
                pass
        else:
            result = share_response.json()
            print(f"Share created: {json.dumps(result, indent=2)}")
            
    except Exception as e:
        print(f"Share creation error: {e}")

if __name__ == "__main__":
    test_share_api()