#!/usr/bin/env python3
"""
Check document encryption status
"""

import sqlite3
import os

def check_document_encryption():
    db_path = "backend/securevault.db"
    
    if not os.path.exists(db_path):
        print("Database not found")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check document 48
    cursor.execute("""
        SELECT id, name, is_encrypted, encryption_iv, encryption_auth_tag, 
               ciphertext, storage_path, file_size, mime_type
        FROM documents 
        WHERE id = 48
    """)
    
    result = cursor.fetchone()
    if result:
        doc_id, name, is_encrypted, iv, auth_tag, ciphertext, storage_path, file_size, mime_type = result
        
        print(f"Document ID: {doc_id}")
        print(f"Name: {name}")
        print(f"Is Encrypted: {is_encrypted}")
        print(f"Encryption IV: {iv}")
        print(f"Auth Tag: {auth_tag}")
        print(f"Has Ciphertext: {bool(ciphertext)}")
        print(f"Storage Path: {storage_path}")
        print(f"File Size: {file_size}")
        print(f"MIME Type: {mime_type}")
        
        # Check if file exists
        if storage_path and os.path.exists(storage_path):
            actual_size = os.path.getsize(storage_path)
            print(f"Actual File Size: {actual_size}")
            
            # Read first few bytes to check if it's encrypted
            with open(storage_path, 'rb') as f:
                first_bytes = f.read(20)
                print(f"First 20 bytes: {first_bytes}")
                
                # Check if it looks like a PDF
                if first_bytes.startswith(b'%PDF'):
                    print("✅ File appears to be a plain PDF (not encrypted)")
                else:
                    print("❓ File does not appear to be a plain PDF (might be encrypted)")
        else:
            print("❌ File does not exist on disk")
    else:
        print("Document 48 not found")
    
    conn.close()

if __name__ == "__main__":
    check_document_encryption()