#!/usr/bin/env python3
"""
Test script to simulate frontend token creation and usage
"""

import sys
import requests
import json

# Add the backend directory to the Python path
sys.path.append('.')


def test_frontend_login_and_share():
    """Test the complete flow: login -> create share"""
    print("Testing Frontend Login and Share Creation Flow...")

    base_url = 'http://localhost:8002'

    # Step 1: Login to get a real token (like frontend does)
    login_data = {
        "username": "rahumana",
        "password": "TestPass123@"
    }

    print("Step 1: Logging in...")
    try:
        login_response = requests.post(f'{base_url}/api/auth/login', json=login_data, timeout=10)
        print(f"Login Status: {login_response.status_code}")
        
        if login_response.status_code != 200:
            print(f"Login failed: {login_response.text}")
            return False

        login_result = login_response.json()
        access_token = login_result.get('access_token')
        
        if not access_token:
            print("No access token received")
            return False
            
        print(f"Login successful, got token: {access_token[:50]}...")

    except Exception as e:
        print(f"Login error: {e}")
        return False

    # Step 2: Use the token to create a share (like frontend does)
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }

    share_data = {
        "document_id": 54,
        "share_name": "Frontend Test Share",
        "share_type": "external",
        "allow_preview": True,
        "allow_download": True,
        "allow_comment": False,
        "require_password": False,
        "password": None,
        "expires_at": None,
        "max_access_count": None,
        "access_restrictions": {},
        "encryption_password": "JHNpAZ39g!&Y"  # Use the test encryption password
    }

    print("\nStep 2: Creating share with frontend token...")
    try:
        share_response = requests.post(
            f'{base_url}/api/v1/shares/?document_id=54', 
            headers=headers, 
            json=share_data, 
            timeout=10
        )
        
        print(f"Share Creation Status: {share_response.status_code}")
        
        if share_response.status_code == 201:
            share_result = share_response.json()
            print(f"Share created successfully with ID: {share_result.get('share', {}).get('id')}")
            print(f"Share URL: {share_result.get('shareUrl')}")
            return True
        else:
            print(f"Share creation failed: {share_response.text}")
            return False

    except Exception as e:
        print(f"Share creation error: {e}")
        return False


if __name__ == "__main__":
    print("Frontend Token Test")
    print("=" * 50)
    
    success = test_frontend_login_and_share()
    
    print("\n" + "=" * 50)
    if success:
        print("Frontend token test completed successfully!")
    else:
        print("Frontend token test failed")
        sys.exit(1)