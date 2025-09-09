#!/usr/bin/env python3
"""
Simple test to isolate the preview issue
"""

import requests
import json

def test_simple_preview():
    """Test preview with simple requests"""
    
    base_url = "http://localhost:8002"
    
    # Test data
    document_id = 8
    
    print("=== SIMPLE PREVIEW TEST ===")
    print(f"Testing document ID: {document_id}")
    print()
    
    # Step 1: Try to login
    print("=== LOGIN TEST ===")
    try:
        login_data = {
            "username": "admin",
            "password": "admin123"
        }
        
        login_response = requests.post(
            f"{base_url}/api/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10
        )
        
        print(f"Login status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            token_data = login_response.json()
            access_token = token_data["access_token"]
            print("[OK] Login successful")
        else:
            print(f"[ERROR] Login failed: {login_response.text}")
            return
            
    except Exception as e:
        print(f"[ERROR] Login error: {e}")
        return
    
    print()
    
    # Step 2: Test preview endpoint
    print("=== PREVIEW TEST ===")
    try:
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        preview_url = f"{base_url}/api/v1/documents/{document_id}/preview"
        print(f"Testing URL: {preview_url}")
        
        preview_response = requests.get(
            preview_url,
            headers=headers,
            timeout=10
        )
        
        print(f"Preview status: {preview_response.status_code}")
        
        if preview_response.status_code == 200:
            preview_data = preview_response.json()
            print("[OK] Preview successful")
            print(f"Preview type: {preview_data.get('type')}")
            print(f"Preview data keys: {list(preview_data.keys())}")
        else:
            print(f"[ERROR] Preview failed")
            print(f"Response: {preview_response.text}")
            
    except Exception as e:
        print(f"[ERROR] Preview error: {e}")
    
    print()
    print("=== TEST COMPLETED ===")

if __name__ == "__main__":
    test_simple_preview()