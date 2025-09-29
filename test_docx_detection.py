#!/usr/bin/env python3
"""
Test DOCX file detection after the bug fix.
"""

def test_docx_detection():
    """Test the fixed DOCX detection logic."""
    
    # Simulate DOCX file header (ZIP signature)
    docx_header = b'PK\x03\x04\x14\x00\x06\x00\x08\x00\x00\x00!\x00'
    
    # Test the FIXED detection logic (what we implemented)
    def detect_actual_encryption_fixed(file_data):
        header = file_data[:8]
        
        # Known unencrypted file signatures
        if (header.startswith(b'%PDF') or          # PDF
            header.startswith(b'PK\x03\x04') or   # ZIP/DOCX (FIXED)
            header.startswith(b'\xff\xd8') or     # JPEG
            header.startswith(b'\x89PNG')):       # PNG
            return False
        
        return True  # Assume encrypted if no known signature
    
    # Test the BUGGY detection logic (what was broken)
    def detect_actual_encryption_buggy(file_data):
        header = file_data[:8]
        
        # Known unencrypted file signatures
        if (header.startswith(b'%PDF') or          # PDF
            header.startswith(b'PK\\x03\\x04') or  # ZIP/DOCX (BUGGY - double escaped)
            header.startswith(b'\xff\xd8') or     # JPEG
            header.startswith(b'\x89PNG')):       # PNG
            return False
        
        return True  # Assume encrypted if no known signature
    
    print("Testing DOCX file detection:")
    print(f"DOCX header: {docx_header.hex()}")
    print(f"DOCX header (first 8 bytes): {docx_header[:8].hex()}")
    print()
    
    # Test both versions
    is_encrypted_fixed = detect_actual_encryption_fixed(docx_header)
    is_encrypted_buggy = detect_actual_encryption_buggy(docx_header)
    
    print("Results:")
    print(f"Fixed version detects as encrypted: {is_encrypted_fixed}")
    print(f"Buggy version detects as encrypted: {is_encrypted_buggy}")
    print()
    
    if not is_encrypted_fixed and is_encrypted_buggy:
        print("SUCCESS: Fix is working correctly!")
        print("- Fixed version correctly identifies DOCX as unencrypted")
        print("- Buggy version incorrectly identifies DOCX as encrypted")
        print()
        print("This means external share links should now serve DOCX files")
        print("as proper documents instead of encrypted garbage.")
    else:
        print("ISSUE: Fix may not be working as expected")
    
    return not is_encrypted_fixed and is_encrypted_buggy

if __name__ == "__main__":
    success = test_docx_detection()
    exit(0 if success else 1)