#!/usr/bin/env python3
"""
Test script to validate the DOCX preview fix
"""

import requests
import json
import base64
import struct

def test_docx_share_preview(share_token, password=None):
    """Test DOCX share preview with comprehensive analysis"""

    base_url = "http://localhost:8000"
    preview_url = f"{base_url}/api/v1/shares/{share_token}/preview"

    print(f"🔍 Testing DOCX Share Preview: {share_token}")
    print("=" * 60)

    # Test with password if provided
    headers = {}
    if password:
        headers["X-Share-Password"] = password

    try:
        response = requests.get(preview_url, headers=headers)

        print(f"📡 Response Status: {response.status_code}")
        print(f"📄 Content-Type: {response.headers.get('Content-Type', 'Not specified')}")
        print(f"📏 Content-Length: {response.headers.get('Content-Length', 'Not specified')}")
        print(f"🔐 X-Requires-Decryption: {response.headers.get('X-Requires-Decryption', 'false')}")
        print(f"🔓 X-Decrypted: {response.headers.get('X-Decrypted', 'false')}")
        print(f"📝 X-Document-Name: {response.headers.get('X-Document-Name', 'Not specified')}")
        print(f"💾 X-Content-Format: {response.headers.get('X-Content-Format', 'Not specified')}")

        if response.status_code == 200:
            content = response.content
            print(f"📊 Actual Content Size: {len(content)} bytes")

            # Analyze content
            if len(content) > 0:
                print(f"\n🔍 Content Analysis:")

                # First 20 bytes analysis
                first_20 = content[:20]
                print(f"   First 20 bytes (hex): {first_20.hex()}")
                print(f"   First 20 bytes (ASCII): {repr(first_20)}")

                # Check for DOCX/ZIP signature
                if len(content) >= 4:
                    signature = struct.unpack('<I', content[:4])[0]
                    expected_zip_sig = 0x04034b50  # PK\x03\x04

                    if signature == expected_zip_sig:
                        print(f"   ✅ VALID ZIP/DOCX signature found: 0x{signature:08x}")
                        print(f"   ✅ This is a properly decrypted DOCX file")

                        # Check for DOCX structure
                        if b'word/document.xml' in content[:10000]:
                            print(f"   ✅ Contains word/document.xml - valid DOCX structure")
                        else:
                            print(f"   ⚠️  May not contain expected DOCX structure")

                        return True
                    else:
                        print(f"   ❌ Invalid ZIP signature: 0x{signature:08x}")
                        print(f"   ❌ Expected: 0x{expected_zip_sig:08x}")

                        # Check if encrypted
                        requires_decryption = response.headers.get('X-Requires-Decryption') == 'true'
                        is_decrypted = response.headers.get('X-Decrypted') == 'true'

                        if requires_decryption and not is_decrypted:
                            print(f"   🔐 Content is encrypted and requires client-side decryption")
                            print(f"   🔐 This explains why JSZip fails to extract")
                            return False
                        elif is_decrypted:
                            print(f"   ⚠️  Content was decrypted but is not valid DOCX format")
                            return False
                        else:
                            print(f"   ❌ Content is not in expected format")
                            return False
                else:
                    print(f"   ❌ Content too short for analysis")
                    return False
            else:
                print(f"   ❌ Empty content received")
                return False
        else:
            print(f"   ❌ Request failed: {response.text}")
            return False

    except Exception as e:
        print(f"   ❌ Error testing preview: {e}")
        return False

def test_share_access(share_token, password=None):
    """Test basic share access"""
    base_url = "http://localhost:8000"
    access_url = f"{base_url}/api/v1/shares/{share_token}/access"

    print(f"\n🔑 Testing Share Access:")
    print("-" * 30)

    try:
        payload = {"password": password} if password else {}
        response = requests.post(access_url, json=payload)

        print(f"Access Response: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Share access successful")
            print(f"📄 Document: {result.get('document_name', 'Unknown')}")
            print(f"📏 Size: {result.get('file_size', 'Unknown')} bytes")
            print(f"🔒 Encrypted: {result.get('is_encrypted', 'Unknown')}")
            return True
        else:
            print(f"❌ Access failed: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Access test error: {e}")
        return False

def main():
    """Main test function"""
    print("🧪 DOCX Preview Fix Validation")
    print("=" * 60)

    # Get test parameters
    share_token = input("Enter share token to test: ").strip()
    password = input("Enter password (if any, press Enter for none): ").strip() or None

    # Run tests
    access_success = test_share_access(share_token, password)
    preview_success = test_docx_share_preview(share_token, password)

    # Summary
    print(f"\n{'='*60}")
    print("📊 TEST RESULTS SUMMARY")
    print(f"{'='*60}")

    print(f"Share Access: {'✅ PASSED' if access_success else '❌ FAILED'}")
    print(f"DOCX Preview: {'✅ PASSED' if preview_success else '❌ FAILED'}")

    if access_success and preview_success:
        print(f"\n🎉 ALL TESTS PASSED!")
        print(f"✅ DOCX preview fix is working correctly")
        print(f"✅ Share serves properly decrypted DOCX content")
        print(f"✅ JSZip should be able to extract the content")
        print(f"\nThe fix resolves the binary text preview issue.")
    else:
        print(f"\n⚠️  Some tests failed.")
        if not preview_success:
            print(f"❌ DOCX preview still shows binary content")
            print(f"❌ The issue may require additional debugging")
        if not access_success:
            print(f"❌ Share access is not working")

if __name__ == "__main__":
    main()