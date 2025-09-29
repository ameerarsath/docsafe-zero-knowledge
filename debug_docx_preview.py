#!/usr/bin/env python3
"""
Debug script to analyze DOCX preview issues
"""

import requests
import base64
import struct
from pathlib import Path

def analyze_docx_share(share_token, password=None):
    """Analyze a DOCX share to identify preview issues"""

    base_url = "http://localhost:8000"

    print(f"🔍 Analyzing DOCX share: {share_token}")
    print("=" * 60)

    # Test share preview endpoint
    try:
        preview_url = f"{base_url}/api/v1/shares/{share_token}/preview"

        headers = {}
        if password:
            headers["X-Share-Password"] = password

        response = requests.get(preview_url, headers=headers)

        print(f"📡 Preview API Response:")
        print(f"   Status Code: {response.status_code}")
        print(f"   Content-Type: {response.headers.get('Content-Type', 'Not specified')}")
        print(f"   Content-Length: {response.headers.get('Content-Length', 'Not specified')}")
        print(f"   X-Decrypted: {response.headers.get('X-Decrypted', 'false')}")
        print(f"   X-Requires-Decryption: {response.headers.get('X-Requires-Decryption', 'false')}")
        print(f"   X-Document-Name: {response.headers.get('X-Document-Name', 'Not specified')}")

        if response.status_code == 200:
            content = response.content
            print(f"   Actual Content Length: {len(content)} bytes")

            # Analyze first few bytes for magic numbers
            if len(content) > 0:
                print(f"\n🔍 Content Analysis:")
                print(f"   First 20 bytes (hex): {content[:20].hex()}")
                print(f"   First 20 bytes (ASCII): {repr(content[:20])}")

                # Check for ZIP/DOCX signature
                if len(content) >= 4:
                    signature = struct.unpack('<I', content[:4])[0]
                    if signature == 0x04034b50:  # ZIP file signature
                        print(f"   ✅ Content has valid ZIP signature (0x04034b50)")
                        print(f"   ✅ This appears to be a valid DOCX file")
                    else:
                        print(f"   ❌ Content does not have ZIP signature")
                        print(f"   ❌ This is NOT a valid DOCX file")
                        print(f"   ❌ Got signature: 0x{signature:08x}")

                # Check for encryption indicators
                if response.headers.get('X-Requires-Decryption') == 'true':
                    print(f"\n🔐 Encryption Detected:")
                    print(f"   Content is encrypted and requires client-side decryption")
                    print(f"   Salt: {response.headers.get('X-Encryption-Salt', 'Not provided')}")
                    print(f"   IV: {response.headers.get('X-Encryption-IV', 'Not provided')}")
                    print(f"   Algorithm: {response.headers.get('X-Encryption-Algorithm', 'Not provided')}")
                else:
                    print(f"\n🔓 No encryption detected in response headers")

                # Sample content analysis
                printable_ratio = sum(1 for b in content[:1000] if 32 <= b <= 126) / min(len(content), 1000)
                print(f"\n📊 Content Statistics:")
                print(f"   Printable character ratio: {printable_ratio:.2%}")

                if printable_ratio > 0.8:
                    print(f"   ✅ Content appears to be mostly printable text")
                elif printable_ratio < 0.3:
                    print(f"   ❌ Content appears to be binary/encrypted")
                    print(f"   ❌ This explains why JSZip fails to extract DOCX")
                else:
                    print(f"   ⚠️  Content is mixed binary/text")

                # Check for common encryption indicators in content
                if b'PK' not in content[:100]:
                    print(f"   ❌ No ZIP header found in first 100 bytes")
                    print(f"   ❌ This confirms the content is not a valid DOCX")

        else:
            print(f"   ❌ Request failed: {response.text}")

    except Exception as e:
        print(f"   ❌ Error analyzing share: {e}")

    print("\n" + "=" * 60)

def check_jszip_requirements():
    """Check if JSZip can handle the content"""
    print("📦 JSZip Requirements Analysis:")
    print("-" * 40)

    print("JSZip expects a valid ZIP file with:")
    print("1. ZIP file signature: 0x04034b50 (PK\\x03\\x04)")
    print("2. Proper ZIP structure with central directory")
    print("3. At minimum: word/document.xml file")
    print("4. Valid PKZIP format")
    print()

    print("Common reasons JSZip fails:")
    print("❌ Encrypted content (AES-GCM encrypted data)")
    print("❌ Corrupted ZIP file")
    print("❌ Missing ZIP signature")
    print("❌ Invalid file format")
    print("❌ Binary data that's not a ZIP file")

def main():
    """Main debugging function"""
    print("🔧 DOCX Preview Debug Analysis")
    print("=" * 60)

    # Test with your share token
    share_token = input("Enter share token to analyze: ").strip()
    password = input("Enter password (if any, press Enter for none): ").strip() or None

    analyze_docx_share(share_token, password)
    check_jszip_requirements()

    print("\n💡 Recommended Actions:")
    print("1. Check if document is encrypted in database")
    print("2. Verify share endpoint is serving decrypted content")
    print("3. Ensure proper MIME type is set")
    print("4. Add content validation in JSZip plugin")

if __name__ == "__main__":
    main()