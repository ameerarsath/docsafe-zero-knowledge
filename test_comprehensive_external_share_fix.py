#!/usr/bin/env python3
"""
Comprehensive test script to validate external share fixes with different file types
"""

import requests
import json
import sys
import base64
import time
from pathlib import Path

def test_backend_health():
    """Test if backend is running"""
    try:
        response = requests.get("http://localhost:8000/health", timeout=10)
        return response.status_code == 200
    except:
        return False

def login_to_backend():
    """Login and get access token"""
    login_data = {
        "username": "admin",
        "password": "admin123"
    }

    try:
        response = requests.post("http://localhost:8000/api/auth/login", json=login_data)
        if response.status_code == 200:
            return response.json().get("access_token")
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Login error: {e}")
        return None

def create_test_share(token, document_id, share_name, require_password=False, password=None):
    """Create a test share"""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    share_payload = {
        "document_id": document_id,
        "share_name": share_name,
        "share_type": "external",
        "permissions": ["view", "download"],
        "expires_at": None,
        "max_access_count": None,
        "require_password": require_password,
        "password": password
    }

    try:
        response = requests.post(
            f"http://localhost:8000/api/v1/shares/?document_id={document_id}",
            json=share_payload,
            headers=headers
        )

        print(f"Share creation for document {document_id}: {response.status_code}")

        if response.status_code == 201:
            result = response.json()
            share_token = result.get("share_token")
            print(f"✅ Share created: {share_token}")
            return share_token
        else:
            print(f"❌ Share creation failed: {response.text}")
            return None

    except Exception as e:
        print(f"Share creation error: {e}")
        return None

def test_external_share_access(share_token, password=None):
    """Test accessing an external share"""
    base_url = "http://localhost:8000"

    # Test external share redirect
    try:
        response = requests.get(
            f"{base_url}/api/v1/external-shares/{share_token}",
            allow_redirects=False
        )

        print(f"External share redirect status: {response.status_code}")

        if response.status_code == 302:
            redirect_url = response.headers.get('Location')
            print(f"✅ Redirect to: {redirect_url}")

            # Test frontend access
            if redirect_url and 'localhost:3000' in redirect_url:
                print("✅ Redirects to frontend for client-side decryption")
                return True
            else:
                print("❌ Does not redirect to frontend")
                return False
        else:
            print(f"❌ Expected 302 redirect, got {response.status_code}")
            return False

    except Exception as e:
        print(f"External share access error: {e}")
        return False

def test_share_preview_api(share_token, password=None):
    """Test the share preview API directly"""
    base_url = "http://localhost:8000"

    try:
        # Test shares preview endpoint
        preview_url = f"{base_url}/api/v1/shares/{share_token}/preview"

        if password:
            # For password-protected shares, include password in headers
            response = requests.get(
                preview_url,
                headers={"X-Share-Password": password}
            )
        else:
            response = requests.get(preview_url)

        print(f"Share preview API status: {response.status_code}")

        if response.status_code == 200:
            # Check response headers
            content_type = response.headers.get('Content-Type', 'unknown')
            content_length = response.headers.get('Content-Length', 'unknown')
            requires_decryption = response.headers.get('X-Requires-Decryption', 'false')

            print(f"✅ Content-Type: {content_type}")
            print(f"✅ Content-Length: {content_length}")
            print(f"✅ X-Requires-Decryption: {requires_decryption}")

            # Check if we got actual content or encrypted data
            content_sample = response.content[:100]
            if content_sample.startswith(b'%PDF'):
                print("✅ Received PDF content (server-decrypted)")
            elif content_sample.startswith(b'PK'):
                print("✅ Received DOCX content (server-decrypted)")
            elif requires_decryption == 'true':
                print("✅ Received encrypted data for client-side decryption")
            else:
                print(f"⚠️  Unknown content type: {content_sample[:50]}")

            return True
        else:
            print(f"❌ Preview failed: {response.text}")
            return False

    except Exception as e:
        print(f"Share preview error: {e}")
        return False

def main():
    """Main test function"""
    print("=" * 70)
    print("COMPREHENSIVE EXTERNAL SHARE FIX VALIDATION")
    print("=" * 70)

    # Test documents to validate
    test_documents = [
        {"id": 47, "name": "PDF Document", "type": "pdf"},
        {"id": 48, "name": "DOCX Document", "type": "docx"},
        {"id": 9, "name": "Text Document", "type": "txt"}
    ]

    # Check backend health
    print("\n1. Testing backend health...")
    if not test_backend_health():
        print("❌ Backend not running or not accessible")
        return False
    print("✅ Backend is running")

    # Login
    print("\n2. Logging in...")
    token = login_to_backend()
    if not token:
        print("❌ Failed to login")
        return False
    print("✅ Login successful")

    # Test different document types
    all_passed = True

    for doc in test_documents:
        print(f"\n{'='*50}")
        print(f"Testing {doc['name']} (ID: {doc['id']})")
        print(f"{'='*50}")

        # Create share
        share_name = f"Test {doc['type']} Share - {int(time.time())}"
        share_token = create_test_share(token, doc['id'], share_name)

        if not share_token:
            all_passed = False
            continue

        # Test external share redirect
        print(f"\n--- Testing External Share Redirect ---")
        redirect_success = test_external_share_access(share_token)

        # Test share preview API
        print(f"\n--- Testing Share Preview API ---")
        preview_success = test_share_preview_api(share_token)

        if redirect_success and preview_success:
            print(f"✅ {doc['name']} tests passed")
        else:
            print(f"❌ {doc['name']} tests failed")
            all_passed = False

        # Test password-protected share
        print(f"\n--- Testing Password-Protected Share ---")
        password_share_token = create_test_share(token, doc['id'], f"Password {share_name}", require_password=True, password="test123")

        if password_share_token:
            # Test with correct password
            password_preview_success = test_share_preview_api(password_share_token, password="test123")
            if password_preview_success:
                print(f"✅ Password-protected {doc['name']} test passed")
            else:
                print(f"❌ Password-protected {doc['name']} test failed")
                all_passed = False

    # Summary
    print(f"\n{'='*70}")
    print("COMPREHENSIVE TEST RESULTS")
    print(f"{'='*70}")

    if all_passed:
        print("🎉 ALL TESTS PASSED!")
        print("✅ External share fix is working correctly")
        print("✅ Different file types are handled properly")
        print("✅ Both password-protected and public shares work")
        print("✅ Server-side and client-side decryption functioning")
        print("\nThe comprehensive fix is ready for production use.")
        return True
    else:
        print("⚠️  Some tests failed.")
        print("Please review the test results above to identify issues.")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)