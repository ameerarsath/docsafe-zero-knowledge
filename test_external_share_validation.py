#!/usr/bin/env python3
"""
Simple test script for external share fix validation.
"""

import requests
import json
import sys

def test_external_share_endpoint():
    """Test the external share endpoint directly"""

    base_url = "http://localhost:8000"

    # Test external shares endpoint
    test_tokens = [
        "541Nwe0wK4ytEJYez_Tn",
        "9yM4X8SVIRlWYZSpZn4d",
        "SWWc42ha8z9Bp1ClqfHX",
        "_A5bjhCKQ7nO71wYKgGA",
        "0IqASgnC1mk6pQJ_Kk88"
    ]

    print("Testing external share endpoints...")

    for token in test_tokens:
        try:
            # Test external share endpoint
            url = f"{base_url}/api/v1/external_shares/{token}"
            response = requests.get(url, timeout=5)

            print(f"\nToken: {token}")
            print(f"Status Code: {response.status_code}")
            print(f"Headers: {dict(response.headers)}")

            if response.status_code == 302:
                location = response.headers.get('Location', '')
                print(f"Redirect Location: {location}")

                # Check if it's redirecting to React app (good for encrypted docs)
                if '/share/' in location:
                    print("[OK] Correctly redirecting to React app for encrypted document")
                else:
                    print("[ERROR] Unexpected redirect location")

            elif response.status_code == 200:
                print("[OK] Serving unencrypted document directly")

            elif response.status_code == 404:
                print("[INFO] Share not found (might be expired or invalid)")

            else:
                print(f"[ERROR] Unexpected status: {response.status_code}")

        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Request failed: {e}")

    print("\nTesting shares preview endpoint...")

    for token in test_tokens:
        try:
            # Test shares preview endpoint
            url = f"{base_url}/api/v1/shares/{token}/preview"
            response = requests.get(url, timeout=5)

            print(f"\nPreview Token: {token}")
            print(f"Status Code: {response.status_code}")

            if response.status_code == 200:
                headers = response.headers
                requires_decryption = headers.get('X-Requires-Decryption') == 'true'
                is_decrypted = headers.get('X-Decrypted') == 'true'

                print(f"Requires Decryption: {requires_decryption}")
                print(f"Is Decrypted: {is_decrypted}")

                if requires_decryption:
                    salt = headers.get('X-Encryption-Salt', '')[:20] + '...' if len(headers.get('X-Encryption-Salt', '')) > 20 else headers.get('X-Encryption-Salt', '')
                    print(f"Encryption Salt: {salt}")
                    print("[OK] Serving encrypted content with metadata")
                elif is_decrypted:
                    print("[OK] Serving decrypted content")
                else:
                    print("[INFO] Serving unencrypted content")

            elif response.status_code == 404:
                print("[INFO] Share not found")

            else:
                print(f"[ERROR] Unexpected status: {response.status_code}")

        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Request failed: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("EXTERNAL SHARE FIX VALIDATION")
    print("=" * 60)

    try:
        test_external_share_endpoint()
        print("\n[SUCCESS] Test completed")
    except Exception as e:
        print(f"\n[FAILED] Test failed: {e}")
        sys.exit(1)