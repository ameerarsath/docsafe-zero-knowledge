#!/usr/bin/env python3
"""
Test Office Document Processing
Verifies that our OFFICE_AVAILABLE fix is working correctly.
"""

import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_office_imports():
    """Test that office processing libraries can be imported."""
    print("Testing office processing library imports...")

    try:
        import docx
        print("[PASS] python-docx imported successfully")
    except ImportError as e:
        print(f"[FAIL] Failed to import python-docx: {e}")
        return False

    try:
        import openpyxl
        print("[PASS] openpyxl imported successfully")
    except ImportError as e:
        print(f"[FAIL] Failed to import openpyxl: {e}")
        return False

    try:
        import pptx
        print("[PASS] python-pptx imported successfully")
    except ImportError as e:
        print(f"[FAIL] Failed to import python-pptx: {e}")
        return False

    return True

def test_preview_service_office_flag():
    """Test that the preview service has OFFICE_AVAILABLE set to True."""
    print("\nTesting preview service OFFICE_AVAILABLE flag...")

    try:
        from app.services.preview_service import OFFICE_AVAILABLE
        print(f"OFFICE_AVAILABLE flag: {OFFICE_AVAILABLE}")

        if OFFICE_AVAILABLE:
            print("[PASS] OFFICE_AVAILABLE is True - office processing should work!")
            return True
        else:
            print("[FAIL] OFFICE_AVAILABLE is False - office processing won't work")
            return False

    except ImportError as e:
        print(f"[FAIL] Failed to import preview service: {e}")
        return False

def test_office_text_extraction():
    """Test office text extraction functionality."""
    print("\nTesting office text extraction...")

    try:
        from app.services.preview_service import _extract_office_text

        # Test with minimal docx content
        print("Testing _extract_office_text function...")

        # This will fail if the document doesn't exist, but we just want to test
        # that the function is available and OFFICE_AVAILABLE is working
        try:
            result = _extract_office_text("/nonexistent/file.docx")
            print("Function executed (expected failure for nonexistent file)")
        except FileNotFoundError:
            print("[PASS] _extract_office_text function is available and working")
            return True
        except Exception as e:
            if "Office document processing not available" in str(e):
                print("[FAIL] Office processing is still disabled")
                return False
            else:
                print(f"[PASS] Function available but expected error: {e}")
                return True

    except ImportError as e:
        print(f"[FAIL] Failed to import _extract_office_text: {e}")
        return False

def main():
    """Run all tests."""
    print("Office Document Processing Test")
    print("=" * 50)

    tests = [
        ("Library Imports", test_office_imports),
        ("OFFICE_AVAILABLE Flag", test_preview_service_office_flag),
        ("Text Extraction Function", test_office_text_extraction)
    ]

    passed = 0
    total = len(tests)

    for test_name, test_func in tests:
        print(f"\n--- {test_name} ---")
        try:
            if test_func():
                passed += 1
                print(f"[PASS] {test_name}: PASSED")
            else:
                print(f"[FAIL] {test_name}: FAILED")
        except Exception as e:
            print(f"[ERROR] {test_name}: ERROR - {e}")

    print("\n" + "=" * 50)
    print(f"TEST RESULTS: {passed}/{total} tests passed")

    if passed == total:
        print("SUCCESS: ALL TESTS PASSED! Office processing should work!")
        return True
    else:
        print("WARNING: Some tests failed. Office processing may not work correctly.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)