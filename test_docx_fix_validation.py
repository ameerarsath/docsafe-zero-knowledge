#!/usr/bin/env python3
"""
Test script to validate the DOCX preview fix
"""

import requests
import sys

def test_docx_preview(share_token, password=None):
    """Test DOCX share preview and analyze response"""

    base_url = "http://localhost:8000"
    preview_url = f"{base_url}/api/v1/shares/{share_token}/preview"

    print(f"🧪 Testing DOCX Share Preview")
    print("=" * 50)
    print(f"Share Token: {share_token}")
    print(f"Password: {'Yes' if password else 'No'}")
    print()

    # Make request
    headers = {}
    if password:
        headers["X-Share-Password"] = password

    try:
        response = requests.get(preview_url, headers=headers)

        print(f"📡 Response Status: {response.status_code}")

        if response.status_code == 200:
            content = response.content
            content_type = response.headers.get('Content-Type', '')
            x_decrypted = response.headers.get('X-Decrypted', 'false')
            x_requires = response.headers.get('X-Requires-Decryption', 'false')

            print(f"📄 Content-Type: {content_type}")
            print(f"🔐 X-Decrypted: {x_decrypted}")
            print(f"🔐 X-Requires-Decryption: {x_requires}")
            print(f"📏 Content Length: {len(content)} bytes")

            # Check content
            if len(content) >= 4:
                signature = content[:4]
                if signature == b'PK\x03\x04':
                    print("✅ VALID DOCX SIGNATURE DETECTED!")
                    print("✅ Content is a proper DOCX file")
                    print("✅ JSZip should be able to extract this")

                    # Look for document.xml
                    if b'word/document.xml' in content[:10000]:
                        print("✅ Contains word/document.xml - valid DOCX structure")
                    else:
                        print("⚠️  word/document.xml not found in first 10KB")

                    return True
                else:
                    print(f"❌ INVALID SIGNATURE: {signature.hex()}")
                    print("❌ Content is not a valid DOCX file")

                    if x_requires == 'true':
                        print("🔐 Content is encrypted - needs client-side decryption")
                    elif x_decrypted == 'true':
                        print("🔓 Content was decrypted but is not valid DOCX")
                    else:
                        print("❓ Content format is unknown")
            else:
                print("❌ Content too short to analyze")
        else:
            print(f"❌ Request failed: {response.text}")

    except Exception as e:
        print(f"❌ Error: {e}")

    return False

def main():
    """Main test function"""
    print("DOCX Preview Fix Validation")
    print("=" * 60)

    # Get share details
    share_token = input("Enter share token: ").strip()
    password = input("Enter password (press Enter if none): ").strip() or None

    # Run test
    success = test_docx_preview(share_token, password)

    print("\n" + "=" * 60)
    if success:
        print("🎉 DOCX PREVIEW FIX SUCCESSFUL!")
        print("✅ DOCX file is properly served")
        print("✅ Valid DOCX signature detected")
        print("✅ Ready for JSZip extraction")
    else:
        print("❌ DOCX preview still has issues")
        print("❌ Check backend logs for details")

if __name__ == "__main__":
    main()