#!/usr/bin/env python3
"""
Check share token and associated document
"""

import sqlite3
import os

def check_share():
    share_token = 'mG4flModqpKW5TBdmSmRA-BxdKLGWatoJm472kIhyH8'
    
    conn = sqlite3.connect('securevault.db')
    cursor = conn.cursor()
    
    try:
        # Check if share exists
        cursor.execute('''
            SELECT ds.*, d.name, d.storage_path, d.file_size, d.mime_type, d.is_encrypted, d.encrypted_dek
            FROM document_shares ds
            JOIN documents d ON ds.document_id = d.id
            WHERE ds.share_token = ?
        ''', (share_token,))
        
        result = cursor.fetchone()
        
        if result:
            print("[OK] Share found!")
            print(f"Share ID: {result[0]}")
            print(f"Document ID: {result[1]}")
            print(f"Share Name: {result[3]}")
            print(f"Share Type: {result[4]}")
            print(f"Allow Preview: {result[5]}")
            print(f"Allow Download: {result[6]}")
            print(f"Is Active: {result[11]}")
            print(f"Document Name: {result[15]}")
            print(f"Storage Path: {result[16]}")
            print(f"File Size: {result[17]}")
            print(f"MIME Type: {result[18]}")
            print(f"Is Encrypted: {result[19]}")
            print(f"Encrypted DEK: {result[20]}")
            
            # Check if file exists
            storage_path = result[16]
            if storage_path and os.path.exists(storage_path):
                actual_size = os.path.getsize(storage_path)
                print(f"[OK] File exists: {storage_path}")
                print(f"Actual file size: {actual_size} bytes")
                
                # Read first few bytes to check file type
                with open(storage_path, 'rb') as f:
                    header = f.read(16)
                    hex_header = ' '.join(f'{b:02x}' for b in header)
                    print(f"File header (hex): {hex_header}")
                    
                    # Check for common file signatures
                    if header.startswith(b'%PDF'):
                        print("[PDF] File appears to be a PDF")
                    elif header.startswith(b'PK\x03\x04'):
                        print("[ZIP] File appears to be a ZIP/Office document")
                    elif header.startswith(b'\xff\xd8'):
                        print("[JPG] File appears to be a JPEG image")
                    elif header.startswith(b'\x89PNG'):
                        print("[PNG] File appears to be a PNG image")
                    else:
                        print("[ENC] File appears to be encrypted or unknown format")
            else:
                print(f"[ERR] File does not exist: {storage_path}")
                
        else:
            print("[ERR] Share not found!")
            
            # List all shares
            cursor.execute('SELECT share_token, document_id, share_name FROM document_shares LIMIT 5')
            shares = cursor.fetchall()
            print("\nAvailable shares:")
            for share in shares:
                print(f"  {share[0][:20]}... -> Doc {share[1]} ({share[2]})")
    
    finally:
        conn.close()

if __name__ == '__main__':
    check_share()