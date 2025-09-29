#!/usr/bin/env python3
"""
Minimal fix for external share encryption detection bug
"""

def fix_detect_actual_encryption():
    """
    Fix the detect_actual_encryption function in shares.py
    The bug is in the byte string literals - they use escaped backslashes instead of actual bytes
    """
    
    # CURRENT BUGGY CODE:
    # header.startswith(b'PK\\x03\\x04')  # This is WRONG - literal backslashes
    # header.startswith(b'\\xff\\xd8')   # This is WRONG - literal backslashes
    
    # CORRECT CODE:
    correct_function = '''
def detect_actual_encryption(document, file_data: bytes) -> bool:
    """Detect if file is actually encrypted by checking content and metadata."""
    if not file_data or len(file_data) < 8:
        return False
        
    # Check file signature first
    header = file_data[:16]  # Increased header size for better detection
    
    # Known unencrypted file signatures (FIXED BYTE STRINGS)
    if (header.startswith(b'%PDF') or                    # PDF
        header.startswith(b'PK\\x03\\x04') or             # ZIP/DOCX/XLSX/PPTX
        header.startswith(b'\\xff\\xd8\\xff') or           # JPEG
        header.startswith(b'\\x89PNG\\r\\n\\x1a\\n') or      # PNG
        header.startswith(b'GIF87a') or                 # GIF87a
        header.startswith(b'GIF89a') or                 # GIF89a
        header.startswith(b'BM') or                     # BMP
        header.startswith(b'RIFF')):                    # WEBP/WAV
        return False
    
    # Try to decode as text (for plain text files)
    try:
        header.decode('utf-8')
        return False  # Likely plain text file
    except UnicodeDecodeError:
        pass
    
    # Check if document has encryption metadata
    return bool(document.is_encrypted and (document.encrypted_dek or document.ciphertext))
    '''
    
    return correct_function

def test_byte_detection():
    """Test the byte detection logic"""
    
    # Test data
    pdf_header = b'%PDF-1.4\\n%\\xe2\\xe3\\xcf\\xd3'
    docx_header = b'PK\\x03\\x04\\x14\\x00\\x06\\x00'
    jpeg_header = b'\\xff\\xd8\\xff\\xe0\\x00\\x10JFIF'
    png_header = b'\\x89PNG\\r\\n\\x1a\\n\\x00\\x00\\x00\\rIHDR'
    
    print("Testing byte detection:")
    print(f"PDF detected: {pdf_header.startswith(b'%PDF')}")
    print(f"DOCX detected: {docx_header.startswith(b'PK\\x03\\x04')}")
    print(f"JPEG detected: {jpeg_header.startswith(b'\\xff\\xd8\\xff')}")
    print(f"PNG detected: {png_header.startswith(b'\\x89PNG\\r\\n\\x1a\\n')}")
    
    # Test with wrong escaping (current bug)
    print("\\nTesting with WRONG escaping (current bug):")
    print(f"DOCX wrong: {docx_header.startswith(b'PK\\\\x03\\\\x04')}")  # This will be False
    print(f"JPEG wrong: {jpeg_header.startswith(b'\\\\xff\\\\xd8')}")    # This will be False

if __name__ == "__main__":
    print("External Share Encryption Bug Fix")
    print("=" * 40)
    
    print("\\n1. Root Cause:")
    print("   - Byte string literals use escaped backslashes (\\\\x) instead of actual bytes (\\x)")
    print("   - This causes file signature detection to fail")
    print("   - All files are incorrectly detected as encrypted")
    
    print("\\n2. Impact:")
    print("   - External shares serve encrypted binary data instead of original files")
    print("   - Users see garbled content instead of documents")
    print("   - Preview functionality broken for shared documents")
    
    print("\\n3. Fix:")
    print("   - Replace escaped backslashes with proper byte sequences")
    print("   - Improve file signature detection")
    print("   - Add text file detection")
    
    test_byte_detection()
    
    print("\\n4. Implementation:")
    print("   - Update detect_actual_encryption() function in shares.py")
    print("   - Test with various file types")
    print("   - Verify external shares work correctly")