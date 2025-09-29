#!/usr/bin/env python3
"""
Test script to verify that document preview now shows original content
"""

import requests
import json

def test_document_preview_fix():
    """Test that document 9 preview shows original content instead of mock content"""
    
    base_url = "http://localhost:8002"
    
    # Test credentials
    username = "rahumana"
    password = "TestPass123@"
    encryption_password = "JHNpAZ39g!&Y"
    
    print("Testing Document Preview Fix")
    print("=" * 50)
    
    # Step 1: Login to get token
    print("1. Logging in...")
    login_response = requests.post(f"{base_url}/api/v1/auth/login", json={
        "username": username,
        "password": password
    })
    
    if login_response.status_code != 200:
        print(f"Login failed: {login_response.status_code}")
        print(f"Response: {login_response.text}")
        return
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login successful")
    
    # Step 2: Check document 9 preview (should require password)
    print("\n2. Checking document 9 preview (encrypted)...")
    preview_response = requests.get(f"{base_url}/api/v1/documents/9/preview", headers=headers)
    
    if preview_response.status_code == 200:
        preview_data = preview_response.json()
        print(f"Preview response received")
        print(f"   - Type: {preview_data.get('type')}")
        print(f"   - Requires password: {preview_data.get('requires_password')}")
        
        if preview_data.get('type') == 'encrypted':
            print("Document correctly identified as encrypted")
        else:
            print("Document not identified as encrypted")
            return
    else:
        print(f"Preview request failed: {preview_response.status_code}")
        print(f"Response: {preview_response.text}")
        return
    
    # Step 3: Get encrypted document preview with password
    print("\n3. Getting encrypted document preview with password...")
    encrypted_preview_response = requests.post(
        f"{base_url}/api/v1/documents/9/preview/encrypted",
        headers=headers,
        json={"password": encryption_password}
    )
    
    if encrypted_preview_response.status_code == 200:
        encrypted_preview = encrypted_preview_response.json()
        print(f"Encrypted preview response received")
        print(f"   - Type: {encrypted_preview.get('type')}")
        print(f"   - Preview type: {encrypted_preview.get('preview_type')}")
        
        # Check if we got actual content or mock content
        if 'preview' in encrypted_preview:
            preview_content = encrypted_preview['preview']
            print(f"   - Preview content length: {len(preview_content)} characters")
            
            # Check for mock content indicators
            mock_indicators = [
                "Mock Document Content",
                "This is a preview of an encrypted document",
                "Lorem ipsum dolor sit amet",
                "mock decryption",
                "Mock preview data"
            ]
            
            is_mock = any(indicator in preview_content for indicator in mock_indicators)
            
            if is_mock:
                print("STILL SHOWING MOCK CONTENT!")
                print("   Mock indicators found in preview")
                print(f"   First 200 characters: {repr(preview_content[:200])}")
            else:
                print("SHOWING REAL CONTENT!")
                print("   No mock indicators found")
                print(f"   First 200 characters: {repr(preview_content[:200])}")
                
        elif 'message' in encrypted_preview:
            message = encrypted_preview['message']
            print(f"   - Message: {message}")
            
            if "mock" in message.lower() or "preview of an encrypted" in message.lower():
                print("Still showing mock content message")
            else:
                print("Showing real content message")
        
        # Show full response for debugging
        print(f"\nFull response keys: {list(encrypted_preview.keys())}")
        
    else:
        print(f"Encrypted preview request failed: {encrypted_preview_response.status_code}")
        print(f"Response: {encrypted_preview_response.text}")
        
        # Check if it's a 401 (wrong password)
        if encrypted_preview_response.status_code == 401:
            print("   This might be a wrong password error")
        elif encrypted_preview_response.status_code == 500:
            print("   This might be a server error during decryption")

if __name__ == "__main__":
    test_document_preview_fix()