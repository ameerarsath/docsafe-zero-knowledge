#!/usr/bin/env python3
"""
Fix document encryption status for document 48
"""

import sqlite3
import os

def fix_document_encryption():
    db_path = "backend/securevault.db"
    
    if not os.path.exists(db_path):
        print("Database not found")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Update document 48 to be non-encrypted since the file is plain PDF
    cursor.execute("""
        UPDATE documents 
        SET is_encrypted = 0,
            encryption_iv = NULL,
            encryption_auth_tag = NULL,
            encryption_key_id = NULL,
            encrypted_dek = NULL,
            ciphertext = NULL
        WHERE id = 48
    """)
    
    conn.commit()
    
    # Verify the update
    cursor.execute("""
        SELECT id, name, is_encrypted, encryption_iv, encryption_auth_tag, 
               storage_path, file_size, mime_type
        FROM documents 
        WHERE id = 48
    """)
    
    result = cursor.fetchone()
    if result:
        doc_id, name, is_encrypted, iv, auth_tag, storage_path, file_size, mime_type = result
        
        print(f"Document ID: {doc_id}")
        print(f"Name: {name}")
        print(f"Is Encrypted: {is_encrypted}")
        print(f"Encryption IV: {iv}")
        print(f"Auth Tag: {auth_tag}")
        print(f"Storage Path: {storage_path}")
        print(f"File Size: {file_size}")
        print(f"MIME Type: {mime_type}")
        
        if is_encrypted == 0:
            print("Document updated to non-encrypted status")
        else:
            print("Failed to update document")
    
    conn.close()

if __name__ == "__main__":
    fix_document_encryption()