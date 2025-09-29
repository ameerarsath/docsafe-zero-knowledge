#!/usr/bin/env python3
"""
Test script to verify view-only share preview functionality
"""

import requests
import json

def test_view_only_share():
    """Test view-only share preview endpoint"""
    base_url = 'http://localhost:8002'
    
    # Test share token (you'll need to create a real one)
    share_token = 'test_share_token_123'
    
    print("Testing view-only share preview...")
    
    # Test 1: Preview endpoint (should work for view-only)
    try:
        preview_response = requests.get(f'{base_url}/api/v1/shares/{share_token}/preview')
        print(f"Preview endpoint: {preview_response.status_code}")
        if preview_response.status_code == 200:
            print("✅ Preview endpoint works")
        else:
            print(f"❌ Preview failed: {preview_response.text}")
    except Exception as e:
        print(f"❌ Preview error: {e}")
    
    # Test 2: Download endpoint (should be blocked for view-only)
    try:
        download_response = requests.post(f'{base_url}/api/v1/shares/{share_token}/download', 
                                        json={'password': None})
        print(f"Download endpoint: {download_response.status_code}")
        if download_response.status_code == 403:
            print("✅ Download correctly blocked for view-only")
        else:
            print(f"❌ Download should be blocked: {download_response.text}")
    except Exception as e:
        print(f"❌ Download test error: {e}")

if __name__ == "__main__":
    test_view_only_share()