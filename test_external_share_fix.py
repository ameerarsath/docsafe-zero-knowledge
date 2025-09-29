#!/usr/bin/env python3
"""
Test script to verify external share functionality works properly
"""

import requests
import json
import time

def test_external_share_access():
    """Test external share access with proper CORS handling"""

    base_url = "http://localhost:8000"
    share_token = "sh_test_token"  # Replace with actual share token

    print("🧪 Testing External Share Access")
    print("=" * 50)

    # Test 1: OPTIONS preflight request
    print("\n1. Testing OPTIONS preflight request...")
    try:
        response = requests.options(f"{base_url}/share/{share_token}")
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
        response = requests.get(f"{base_url}/share/{share_token}", headers=headers)
        print(f"   Status: {response.status_code}")
        print(f"   Content-Type: {response.headers.get('Content-Type', 'Not specified')}")
        print(f"   CORS Headers:")
        for header, value in response.headers.items():
            if header.startswith('Access-Control'):
                print(f"     {header}: {value}")

        if response.status_code == 200:
            print("   ✅ External share accessible")
        elif response.status_code in [301, 302, 307, 308]:
            location = response.headers.get('Location', 'No location header')
            print(f"   🔄 Redirected to: {location}")
        else:
            print(f"   ❌ Request failed: {response.text}")

    except Exception as e:
        print(f"   ❌ GET request failed: {e}")

    # Test 3: Test with download parameter
    print("\n3. Testing with download parameter...")
    try:
        response = requests.get(f"{base_url}/share/{share_token}?download=true", headers=headers)
        print(f"   Status: {response.status_code}")
        content_disposition = response.headers.get('Content-Disposition', 'Not specified')
        print(f"   Content-Disposition: {content_disposition}")

        if 'attachment' in content_disposition:
            print("   ✅ Download header properly set")
        else:
            print("   ⚠️  Download header may not be correct")

    except Exception as e:
        print(f"   ❌ Download test failed: {e}")

def test_cors_origins():
    """Test different CORS origins"""

    base_url = "http://localhost:8000"
    share_token = "sh_test_token"

    print("\n🌐 Testing Different CORS Origins")
    print("=" * 50)

    origins_to_test = [
        "http://localhost:3005",
        "http://localhost:3000",
        "http://127.0.0.1:3005",
        "https://example.com",
        "null"
    ]

    for origin in origins_to_test:
        print(f"\nTesting Origin: {origin}")
        headers = {"Origin": origin}

        try:
            response = requests.options(f"{base_url}/share/{share_token}", headers=headers)
            allow_origin = response.headers.get('Access-Control-Allow-Origin', 'Not set')
            print(f"   Access-Control-Allow-Origin: {allow_origin}")

            if allow_origin == origin or allow_origin == "*":
                print("   ✅ Origin allowed")
            else:
                print("   ❌ Origin not allowed")

        except Exception as e:
            print(f"   ❌ Test failed: {e}")

def test_pdf_headers():
    """Test PDF-specific headers are properly set"""

    base_url = "http://localhost:8000"
    # This would need to be a PDF share token
    share_token = "sh_pdf_test"  # Replace with actual PDF share token

    print("\n📄 Testing PDF-Specific Headers")
    print("=" * 50)

    headers = {
        "Origin": "http://localhost:3005",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (Chrome/91.0.4472.124)"
    }

    try:
        response = requests.get(f"{base_url}/share/{share_token}", headers=headers)

        if response.status_code == 200:
            content_type = response.headers.get('Content-Type', '')
            csp = response.headers.get('Content-Security-Policy', '')
            x_csp = response.headers.get('X-Content-Security-Policy', '')

            print(f"   Content-Type: {content_type}")
            print(f"   CSP: {csp[:100]}..." if len(csp) > 100 else f"   CSP: {csp}")
            print(f"   X-CSP: {x_csp[:100]}..." if len(x_csp) > 100 else f"   X-CSP: {x_csp}")

            if content_type == "application/pdf":
                print("   ✅ Correct PDF Content-Type")
            else:
                print("   ⚠️  Content-Type may not be optimal for PDF")

            if "script-src 'none'" in csp or "script-src 'none'" in x_csp:
                print("   ✅ Script execution disabled in PDF")
            else:
                print("   ⚠️  Script execution may not be disabled")

    except Exception as e:
        print(f"   ❌ PDF test failed: {e}")

if __name__ == "__main__":
    print("External Share Fix Verification")
    print("=" * 60)

    print("This script tests that external shares work properly with CORS")
    print("and that Chrome won't block the shared content.\n")

    # Note: These tests require actual share tokens to work properly
    print("Note: Replace 'sh_test_token' with actual share tokens for real testing\n")

    # Run tests
    test_external_share_access()
    test_cors_origins()
    test_pdf_headers()

    print("\n" + "=" * 60)
    print("✅ External share fix verification complete")
    print("\nIf tests pass:")
    print("- External shares should work in Chrome without being blocked")
    print("- PDFs should display properly in the browser")
    print("- Downloads should work correctly")
    print("- CORS policies are properly configured")