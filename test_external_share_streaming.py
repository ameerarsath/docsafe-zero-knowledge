#!/usr/bin/env python3
"""
Test script to verify external share streaming functionality works properly
for all file types without blob URL security errors.
"""

import requests
import json
import time
import base64

def test_external_share_streaming():
    """Test external share streaming with proper CORS and security headers"""

    base_url = "http://localhost:8000"
    share_token = "sh_test_token"  # Replace with actual share token
    password = "password123"  # Replace with actual password

    print("🧪 Testing External Share Streaming")
    print("=" * 50)

    # Test 1: OPTIONS preflight request
    print("\n1. Testing OPTIONS preflight request...")
    try:
        response = requests.options(f"{base_url}/share/{share_token}/stream")
        print(f"   Status: {response.status_code}")
        print(f"   CORS Headers:")
        for header, value in response.headers.items():
            if header.startswith('Access-Control'):
                print(f"     {header}: {value}")
    except Exception as e:
        print(f"   ❌ OPTIONS request failed: {e}")

    # Test 2: GET request with Origin header
    print("\n2. Testing GET request with Origin header...")
    headers = {
        "Origin": "http://localhost:3005",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    try:
        response = requests.get(
            f"{base_url}/share/{share_token}/stream",
            headers=headers,
            params={"password": password} if password else None
        )
        print(f"   Status: {response.status_code}")
        print(f"   Content-Type: {response.headers.get('Content-Type', 'Not specified')}")
        print(f"   Content-Disposition: {response.headers.get('Content-Disposition', 'Not specified')}")
        print(f"   Content-Length: {response.headers.get('Content-Length', 'Not specified')}")
        print(f"   CORS Headers:")
        for header, value in response.headers.items():
            if header.startswith('Access-Control'):
                print(f"     {header}: {value}")

        if response.status_code == 200:
            print("   ✅ External share streaming accessible")
            print(f"   📄 Response size: {len(response.content)} bytes")
        elif response.status_code in [301, 302, 307, 308]:
            location = response.headers.get('Location', 'No location header')
            print(f"   🔄 Redirected to: {location}")
        else:
            print(f"   ❌ Request failed: {response.text}")

    except Exception as e:
        print(f"   ❌ GET request failed: {e}")

    # Test 3: Test download parameter
    print("\n3. Testing with download parameter...")
    try:
        response = requests.get(
            f"{base_url}/share/{share_token}/stream",
            headers=headers,
            params={"download": "true", "password": password}
        )
        print(f"   Status: {response.status_code}")
        content_disposition = response.headers.get('Content-Disposition', 'Not specified')
        print(f"   Content-Disposition: {content_disposition}")

        if 'attachment' in content_disposition:
            print("   ✅ Download header properly set")
        else:
            print("   ⚠️  Download header may not be correct")

    except Exception as e:
        print(f"   ❌ Download test failed: {e}")

def test_different_file_types():
    """Test streaming with different file types"""

    base_url = "http://localhost:8000"
    test_files = [
        ("sh_pdf_test", "application/pdf", "PDF Document"),
        ("sh_docx_test", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "Word Document"),
        ("sh_image_test", "image/jpeg", "JPEG Image"),
        ("sh_text_test", "text/plain", "Text File"),
        ("sh_csv_test", "text/csv", "CSV File"),
        ("sh_pptx_test", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "PowerPoint"),
    ]

    print("\n📄 Testing Different File Types")
    print("=" * 50)

    for token, mime_type, description in test_files:
        print(f"\nTesting {description} (MIME: {mime_type})")
        headers = {
            "Origin": "http://localhost:3005",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

        try:
            response = requests.get(f"{base_url}/share/{token}/stream", headers=headers)
            print(f"   Status: {response.status_code}")
            print(f"   Content-Type: {response.headers.get('Content-Type', 'Not specified')}")

            if response.status_code == 200:
                # Check if returned Content-Type matches expected
                returned_type = response.headers.get('Content-Type', '').split(';')[0]
                if returned_type == mime_type:
                    print("   ✅ Correct MIME type returned")
                else:
                    print(f"   ⚠️  MIME type mismatch: expected {mime_type}, got {returned_type}")

                # Check security headers
                csp = response.headers.get('Content-Security-Policy', '')
                if 'script-src' in csp and "'none'" in csp:
                    print("   ✅ Security headers present")
                else:
                    print("   ⚠️  Security headers may be missing")

            else:
                print(f"   ❌ Request failed: {response.text[:100]}...")

        except Exception as e:
            print(f"   ❌ Test failed: {e}")

def test_encrypted_content():
    """Test server-side decryption for encrypted content"""

    base_url = "http://localhost:8000"
    share_token = "sh_encrypted_test"  # Replace with encrypted share token
    password = "password123"  # Replace with actual password

    print("\n🔐 Testing Encrypted Content Streaming")
    print("=" * 50)

    headers = {
        "Origin": "http://localhost:3005",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    # Test without password
    print("\n1. Testing without password...")
    try:
        response = requests.get(f"{base_url}/share/{share_token}/stream", headers=headers)
        print(f"   Status: {response.status_code}")
        if response.status_code == 401:
            print("   ✅ Correctly requires password")
        else:
            print(f"   ⚠️  Expected 401, got {response.status_code}")
    except Exception as e:
        print(f"   ❌ Test failed: {e}")

    # Test with password
    print("\n2. Testing with password...")
    try:
        response = requests.get(
            f"{base_url}/share/{share_token}/stream",
            headers=headers,
            params={"password": password}
        )
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ Decryption successful")
            print(f"   Content-Type: {response.headers.get('Content-Type', 'Not specified')}")

            # Check if content is actually decrypted
            content = response.content
            if len(content) > 4:
                # Check for common file signatures
                if content.startswith(b'%PDF'):
                    print("   ✅ Decrypted to valid PDF")
                elif content.startswith(b'PK\x03\x04'):
                    print("   ✅ Decrypted to valid ZIP/DOCX")
                else:
                    print("   ⚠️  Unknown file format after decryption")
        else:
            print(f"   ❌ Decryption failed: {response.text}")

    except Exception as e:
        print(f"   ❌ Test failed: {e}")

if __name__ == "__main__":
    print("External Share Streaming Fix Verification")
    print("=" * 60)

    print("This script tests that external shares work properly with streaming")
    print("and that Chrome won't block the shared content.\n")

    print("Note: Replace 'sh_test_token' and other tokens with actual share tokens for real testing\n")

    # Run tests
    test_external_share_streaming()
    test_different_file_types()
    test_encrypted_content()

    print("\n" + "=" * 60)
    print("✅ External share streaming fix verification complete")
    print("\nIf tests pass:")
    print("- External shares should work in Chrome without blob URL errors")
    print("- All file types should be properly handled")
    print("- PDFs should display directly in the browser")
    print("- Downloads should work correctly")
    print("- CORS policies are properly configured")
    print("- Encrypted content can be decrypted server-side")