#!/usr/bin/env python3
"""
Simple test script to verify the DOCX preview fix
"""

import requests
import struct

def test_with_existing_share():
    """Test with an existing share - replace with actual values"""

    # These values need to be replaced with actual share details
    share_token = "sh_65_test"  # Replace with your actual share token
    password = "password123"    # Replace with your actual password

    base_url = "http://localhost:8000"
    preview_url = f"{base_url}/api/v1/shares/{share_token}/preview"

    print(f"Testing DOCX preview for share: {share_token}")
    print("=" * 50)

    headers = {
        "X-Share-Password": password
    }

    try:
        response = requests.get(preview_url, headers=headers)

        print(f"Status: {response.status_code}")

        if response.status_code == 200:
            content = response.content
            print(f"Content size: {len(content)} bytes")

            # Check signature
            if len(content) >= 4:
                signature = struct.unpack('<I', content[:4])[0]
                expected = 0x04034b50  # PK\x03\x04

                print(f"File signature: 0x{signature:08x}")
                print(f"Expected DOCX:   0x{expected:08x}")

                if signature == expected:
                    print("✅ SUCCESS: Valid DOCX signature found!")
                    print("✅ The fix is working correctly")
                    return True
                else:
                    print("❌ FAILED: Not a valid DOCX file")

                    # Check headers
                    decrypted = response.headers.get('X-Decrypted', 'false')
                    requires = response.headers.get('X-Requires-Decryption', 'false')
                    print(f"X-Decrypted: {decrypted}")
                    print(f"X-Requires-Decryption: {requires}")

                    if requires == 'true' and decrypted == 'false':
                        print("🔐 Content is still encrypted")
                    elif decrypted == 'true':
                        print("🔓 Decryption failed - invalid output")

                    return False
            else:
                print("❌ Content too short")
                return False
        else:
            print(f"❌ Request failed: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("DOCX Preview Fix Test")
    print("Make sure the backend is running on localhost:8000")
    print()

    # Try to test with the share
    success = test_with_existing_share()

    if success:
        print("\n🎉 The DOCX preview fix is working!")
    else:
        print("\n❌ The fix needs more work")
        print("Check:")
        print("1. Backend is running on localhost:8000")
        print("2. Share token and password are correct")
        print("3. Backend logs for any errors")