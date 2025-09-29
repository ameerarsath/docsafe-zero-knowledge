#!/usr/bin/env python3
"""
Test script to verify the DOCX preview fix is working
"""

import requests
import json
import base64
import struct

def test_docx_preview():
    """Test the DOCX preview with document 65"""

    # Share details for document 65
    share_token = "sh_65_test"  # Replace with actual share token
    password = "password123"    # Replace with actual password

    base_url = "http://localhost:8000"
    preview_url = f"{base_url}/api/v1/shares/{share_token}/preview"

    print(f"🧪 Testing DOCX Share Preview Fix")
    print("=" * 50)

    # Test with password
    headers = {
        "X-Share-Password": password
    }

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

            # Analyze first few bytes
            if len(content) > 0:
                print(f"\n🔍 Content Analysis:")
                first_20 = content[:20]
                print(f"   First 20 bytes (hex): {first_20.hex()}")
                print(f"   First 20 bytes (ASCII): {repr(first_20)}")

                # Check for DOCX signature
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

                        print(f"\n🎉 SUCCESS! The DOCX preview fix is working!")
                        print(f"✅ The file is properly decrypted and has valid DOCX signature")
                        print(f"✅ JSZip should be able to extract and display this content")
                        return True
                    else:
                        print(f"   ❌ Invalid ZIP signature: 0x{signature:08x}")
                        print(f"   ❌ Expected: 0x{expected_zip_sig:08x}")

                        # Check if still encrypted
                        requires_decryption = response.headers.get('X-Requires-Decryption') == 'true'
                        is_decrypted = response.headers.get('X-Decrypted') == 'true'

                        if requires_decryption and not is_decrypted:
                            print(f"   🔐 Content is still encrypted")
                            print(f"   ❌ The fix may not be working correctly")
                        elif is_decrypted:
                            print(f"   ⚠️  Content was decrypted but is not valid DOCX")
                            print(f"   ❌ The decryption may be producing incorrect output")
                        else:
                            print(f"   ❌ Content format is unknown")

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

def main():
    """Main test function"""
    print("DOCX Preview Fix Verification")
    print("=" * 60)

    # You can modify these values based on your actual share
    share_token = input("Enter share token (or press Enter for default): ").strip()
    if not share_token:
        share_token = "sh_65_test"  # Replace with your actual share token

    password = input("Enter password (or press Enter for default): ").strip()
    if not password:
        password = "password123"  # Replace with your actual password

    # Run test
    success = test_docx_preview()

    print(f"\n{'='*60}")
    if success:
        print("🎉 DOCX PREVIEW FIX VERIFICATION SUCCESSFUL!")
        print("✅ The fix is working correctly")
        print("✅ DOCX files will now show actual content instead of binary text")
    else:
        print("❌ DOCX PREVIEW FIX VERIFICATION FAILED")
        print("❌ The fix may need additional debugging")
        print("❌ Check the backend logs for more details")

if __name__ == "__main__":
    main()