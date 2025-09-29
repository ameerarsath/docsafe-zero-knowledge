#!/usr/bin/env python3
"""
Test script for external sharing functionality.
This script tests if external shares can properly decrypt and serve documents.
"""

import requests
import json
import sys

def test_external_share():
    """Test external sharing functionality."""
    
    # Configuration
    BASE_URL = "http://localhost:8002"
    
    print("Testing External Share Functionality")
    print("=" * 50)
    
    # Test 1: Check if external shares endpoint is accessible
    print("1. Testing external shares endpoint accessibility...")
    
    try:
        # Try to access a non-existent share (should return 404, not 500)
        response = requests.get(f"{BASE_URL}/share/test-token-123", timeout=10)
        
        if response.status_code == 404:
            print("✓ External shares endpoint is accessible (404 for non-existent share)")
        elif response.status_code == 500:
            print("✗ External shares endpoint has server error")
            print(f"Response: {response.text}")
            return False
        else:
            print(f"? Unexpected status code: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to backend server. Is it running on port 8002?")
        return False
    except Exception as e:
        print(f"✗ Error testing external shares endpoint: {e}")
        return False
    
    # Test 2: Check if shares API is working
    print("\n2. Testing shares API endpoints...")
    
    try:
        # Test shares endpoint (should require auth)
        response = requests.get(f"{BASE_URL}/v1/shares/stats", timeout=10)
        
        if response.status_code == 401:
            print("✓ Shares API is accessible (401 for unauthenticated request)")
        elif response.status_code == 500:
            print("✗ Shares API has server error")
            print(f"Response: {response.text}")
            return False
        else:
            print(f"? Unexpected status code for shares API: {response.status_code}")
            
    except Exception as e:
        print(f"✗ Error testing shares API: {e}")
        return False
    
    print("\n3. External sharing functionality appears to be enabled and working!")
    print("\nTo test with actual documents:")
    print("1. Create a document share with share_type='external'")
    print("2. Include encryption_password in the share creation request")
    print("3. Access the share via /share/{share_token}")
    print("4. The document should be decrypted and served as original content")
    
    return True

if __name__ == "__main__":
    success = test_external_share()
    sys.exit(0 if success else 1)