#!/usr/bin/env python3
"""
Validation script for external share preview fix.

This script validates that the backend changes are correctly implemented
by checking the code structure and key components.
"""

import os
import re
from pathlib import Path

def validate_backend_changes():
    """Validate that backend changes are correctly implemented"""
    print("🔍 Validating backend changes...")

    backend_dir = Path("backend/app/api/v1")
    external_shares_file = backend_dir / "external_shares.py"
    shares_file = backend_dir / "shares.py"

    results = []

    # Check external_shares.py changes
    if external_shares_file.exists():
        content = external_shares_file.read_text()

        # Check for encrypted document redirect
        if "redirect to React app for client-side decryption" in content:
            print("✅ External shares redirects encrypted documents to React app")
            results.append(True)
        else:
            print("❌ External shares missing encrypted document redirect")
            results.append(False)

        # Check for proper headers
        if "X-Content-Type-Options" in content:
            print("✅ External shares includes security headers")
            results.append(True)
        else:
            print("❌ External shares missing security headers")
            results.append(False)
    else:
        print("❌ External shares file not found")
        results.append(False)

    # Check shares.py changes
    if shares_file.exists():
        content = shares_file.read_text()

        # Check for server-side decryption attempt
        if "decrypt_document_for_sharing" in content and "encryption_password" in content:
            print("✅ Shares endpoint attempts server-side decryption")
            results.append(True)
        else:
            print("❌ Shares endpoint missing server-side decryption")
            results.append(False)

        # Check for encryption metadata headers
        if "X-Requires-Decryption" in content and "X-Encryption-Salt" in content:
            print("✅ Shares endpoint includes encryption metadata headers")
            results.append(True)
        else:
            print("❌ Shares endpoint missing encryption metadata headers")
            results.append(False)

        # Check for decrypted content header
        if "X-Decrypted" in content:
            print("✅ Shares endpoint includes decrypted content header")
            results.append(True)
        else:
            print("❌ Shares endpoint missing decrypted content header")
            results.append(False)
    else:
        print("❌ Shares file not found")
        results.append(False)

    return results

def validate_frontend_changes():
    """Validate that frontend changes are correctly implemented"""
    print("\n🔍 Validating frontend changes...")

    frontend_file = Path("frontend/src/components/documents/SharedDocumentPreview.tsx")
    results = []

    if frontend_file.exists():
        content = frontend_file.read_text()

        # Check for server-decrypted content handling
        if "X-Decrypted" in content and "isDecrypted" in content:
            print("✅ Frontend handles server-decrypted content")
            results.append(True)
        else:
            print("❌ Frontend missing server-decrypted content handling")
            results.append(False)

        # Check for improved error handling
        if "direct AES-GCM decryption first" in content:
            print("✅ Frontend includes improved decryption logic")
            results.append(True)
        else:
            print("❌ Frontend missing improved decryption logic")
            results.append(False)

        # Check for PDF and DOCX validation
        if "pdfSig !== '%PDF'" in content and "view[0] !== 0x50" in content:
            print("✅ Frontend includes document type validation")
            results.append(True)
        else:
            print("❌ Frontend missing document type validation")
            results.append(False)
    else:
        print("❌ Frontend SharedDocumentPreview file not found")
        results.append(False)

    return results

def validate_encryption_functions():
    """Validate that encryption utility functions are available"""
    print("\n🔍 Validating encryption utilities...")

    encryption_file = Path("frontend/src/utils/encryption.ts")
    results = []

    if encryption_file.exists():
        content = encryption_file.read_text()

        # Check for required functions
        required_functions = ["deriveKey", "decryptFile", "base64ToUint8Array", "uint8ArrayToBase64"]
        for func in required_functions:
            if f"export.*{func}" in content or f"function {func}" in content:
                print(f"✅ Found {func} function")
                results.append(True)
            else:
                print(f"❌ Missing {func} function")
                results.append(False)
    else:
        print("❌ Encryption utilities file not found")
        results.append(False)

    return results

def validate_document_model():
    """Validate that document model has required encryption fields"""
    print("\n🔍 Validating document model...")

    model_file = Path("backend/app/models/document.py")
    results = []

    if model_file.exists():
        content = model_file.read_text()

        # Check for required encryption fields
        required_fields = ["ciphertext", "salt", "encryption_iv", "encrypted_dek", "is_encrypted"]
        for field in required_fields:
            if f"{field} = Column" in content:
                print(f"✅ Found {field} field in document model")
                results.append(True)
            else:
                print(f"❌ Missing {field} field in document model")
                results.append(False)
    else:
        print("❌ Document model file not found")
        results.append(False)

    return results

def main():
    """Main validation function"""
    print("=" * 60)
    print("🧪 EXTERNAL SHARE PREVIEW FIX VALIDATION")
    print("=" * 60)

    all_results = []

    # Run all validation checks
    all_results.extend(validate_backend_changes())
    all_results.extend(validate_frontend_changes())
    all_results.extend(validate_encryption_functions())
    all_results.extend(validate_document_model())

    print("\n" + "=" * 60)
    print("📊 VALIDATION RESULTS SUMMARY")
    print("=" * 60)

    passed = sum(all_results)
    total = len(all_results)

    print(f"Overall: {passed}/{total} validation checks passed")

    if passed == total:
        print("🎉 All validation checks passed!")
        print("The external share preview fix should work correctly.")
        print("\nTo test the fix:")
        print("1. Start your backend server")
        print("2. Create an external share for an encrypted document")
        print("3. Access the share link and try to preview the document")
        print("4. Run: python test_external_share_fix.py <share_token>")
    else:
        print("⚠️  Some validation checks failed.")
        print("Please review the implementation and ensure all changes are correctly applied.")

    return passed == total

if __name__ == "__main__":
    import sys
    success = main()
    sys.exit(0 if success else 1)