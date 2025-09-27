#!/usr/bin/env python3
"""
Manual Demo: Create External Share for Word Document via UI

This script demonstrates the complete external share creation workflow:
1. Create a test Word document
2. Upload it via API (simulating UI upload)
3. Create an external share
4. Test the share accessibility
"""

import requests
import json
from pathlib import Path
import tempfile
import os

BASE_URL = "http://localhost:8002"
FRONTEND_URL = "http://localhost:3005"

def create_test_word_document():
    """Create a simple Word document for testing"""

    # Create a simple text file that represents a Word document
    content = """Sample Word Document for External Sharing

This is a test document to demonstrate external sharing functionality in SecureVault.

Document Features:
- Document Type: Word Document (.docx simulation)
- Content: Rich text with formatting
- Purpose: Testing external share creation and preview

Key Test Scenarios:
1. Document upload via UI
2. External share creation with proper permissions
3. Share link generation and accessibility
4. Document preview functionality
5. Download capability for external users

Expected Results:
- Document should upload successfully
- External share should be created via UI
- Share link should work without authentication
- Preview should display document content
- Download should work for external users

Security Features:
- Zero-knowledge encryption during upload
- Client-side encryption/decryption
- Secure share token generation
- Access logging and audit trails

This document serves as a comprehensive test case for the external sharing workflow in SecureVault's zero-knowledge document management system.

Test completed successfully if:
1. Upload process works via UI
2. Share creation dialog functions properly
3. External share link is accessible
4. Preview displays content correctly
5. Download works without issues
"""

    # Create temporary file with UTF-8 encoding
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8')
    temp_file.write(content)
    temp_file.close()

    return temp_file.name

def get_auth_token():
    """Get authentication token for API calls"""

    # Try different user credentials
    test_credentials = [
        {"username": "admin", "password": "admin123"},
        {"username": "testuser", "password": "password123"},
        {"username": "testuser", "password": "testpass123"},
        {"username": "user", "password": "password"},
    ]

    for creds in test_credentials:
        try:
            print(f"Trying login with: {creds['username']}")
            response = requests.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=10)

            if response.status_code == 200:
                token_data = response.json()
                token = token_data.get("access_token")
                if token:
                    print(f"SUCCESS: Logged in as: {creds['username']}")
                    return token
            else:
                print(f"ERROR: Login failed: {response.status_code}")

        except Exception as e:
            print(f"ERROR: Login error with {creds['username']}: {e}")

    return None

def upload_document_via_api(token, file_path):
    """Upload document via API (simulating UI upload)"""

    if not token:
        print("ERROR: No authentication token available")
        return None

    try:
        # Upload file
        with open(file_path, 'rb') as f:
            files = {
                'file': ('test_document.txt', f, 'text/plain')
            }
            headers = {
                'Authorization': f'Bearer {token}'
            }

            print("Uploading document...")
            response = requests.post(f"{BASE_URL}/api/v1/documents/upload", files=files, headers=headers, timeout=30)

            if response.status_code == 201:
                doc_data = response.json()
                print(f"SUCCESS: Document uploaded: {doc_data.get('name', 'Unknown')}")
                return doc_data.get('id')
            else:
                print(f"ERROR: Upload failed: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"ERROR: Upload error: {e}")

    return None

def create_external_share_via_api(token, document_id):
    """Create external share via API (simulating UI share creation)"""

    if not token or not document_id:
        print("ERROR: Missing token or document ID")
        return None

    try:
        share_data = {
            "document_id": document_id,
            "share_name": "External Word Document Share",
            "share_type": "external",  # KEY: External share (no auth required)
            "allow_download": True,
            "allow_preview": True,
            "allow_comment": False,
            "require_password": False,
            "password": None,
            "expires_at": None,
            "max_access_count": None,
            "access_restrictions": {},
            "encryption_password": "testpass123"  # For decryption
        }

        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }

        print("Creating external share...")
        response = requests.post(
            f"{BASE_URL}/api/v1/shares/?document_id={document_id}",
            json=share_data,
            headers=headers,
            timeout=30
        )

        if response.status_code == 201:
            share_result = response.json()
            share_token = share_result["share"]["shareToken"]
            share_url = f"{FRONTEND_URL}/share/{share_token}"

            print("SUCCESS: External share created!")
            print(f"Share Token: {share_token}")
            print(f"Share URL: {share_url}")

            return share_token, share_url
        else:
            print(f"ERROR: Share creation failed: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"ERROR: Share creation error: {e}")

    return None, None

def test_external_share_access(share_token):
    """Test external share accessibility (no auth required)"""

    if not share_token:
        print("ERROR: No share token to test")
        return False

    try:
        print("Testing external share access...")

        # Test share access (should work without auth)
        response = requests.post(
            f"{BASE_URL}/api/v1/shares/{share_token}/access",
            json={},
            timeout=10
        )

        if response.status_code == 200:
            share_data = response.json()
            print("SUCCESS: External share is accessible without authentication!")
            print(f"Document: {share_data['document']['name']}")
            print(f"Permissions: {', '.join(share_data['permissions'])}")
            print(f"Share Type: {share_data['shareInfo']['shareType']}")
            return True
        else:
            print(f"ERROR: Share access failed: {response.status_code} - {response.text}")

    except Exception as e:
        print(f"ERROR: Share access test error: {e}")

    return False

def main():
    """Main demo function"""

    print("=" * 60)
    print("SECUREVAULT EXTERNAL SHARE CREATION DEMO")
    print("=" * 60)
    print("Goal: Create external share for Word document via UI workflow")
    print()

    # Step 1: Create test document
    print("Step 1: Creating test document...")
    test_file = create_test_word_document()
    print(f"SUCCESS: Test document created: {test_file}")
    print()

    try:
        # Step 2: Get authentication
        print("Step 2: Getting authentication token...")
        token = get_auth_token()
        if not token:
            print("ERROR: DEMO FAILED - Could not authenticate")
            return
        print()

        # Step 3: Upload document
        print("Step 3: Uploading document (simulating UI upload)...")
        document_id = upload_document_via_api(token, test_file)
        if not document_id:
            print("ERROR: DEMO FAILED - Could not upload document")
            return
        print()

        # Step 4: Create external share
        print("Step 4: Creating external share (simulating UI workflow)...")
        share_token, share_url = create_external_share_via_api(token, document_id)
        if not share_token:
            print("ERROR: DEMO FAILED - Could not create external share")
            return
        print()

        # Step 5: Test external access
        print("Step 5: Testing external share accessibility...")
        access_success = test_external_share_access(share_token)
        if not access_success:
            print("ERROR: DEMO FAILED - External share not accessible")
            return
        print()

        # Demo summary
        print("=" * 60)
        print("DEMO COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("SUCCESS: Document Upload")
        print("SUCCESS: External Share Creation")
        print("SUCCESS: External Access (no authentication required)")
        print()
        print("Share URL (ready to test in browser):")
        print(f"   {share_url}")
        print()
        print("Next Steps:")
        print("1. Open the share URL in a browser")
        print("2. Verify no login is required")
        print("3. Test document preview functionality")
        print("4. Test download functionality")
        print("=" * 60)

    finally:
        # Cleanup
        try:
            os.unlink(test_file)
            print(f"Cleaned up temporary file: {test_file}")
        except:
            pass

if __name__ == "__main__":
    main()