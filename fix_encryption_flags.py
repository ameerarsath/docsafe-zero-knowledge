#!/usr/bin/env python3
"""
Database Fix Script: Correct is_encrypted flags based on actual file content
"""

import os
import sqlite3
from pathlib import Path

def detect_file_encryption(file_path):
    """Detect if file is actually encrypted by checking signatures."""
    try:
        with open(file_path, 'rb') as f:
            header = f.read(8)
        
        # Known unencrypted signatures
        if (header.startswith(b'%PDF') or          # PDF
            header.startswith(b'PK\x03\x04') or   # ZIP/DOCX
            header.startswith(b'\xff\xd8') or     # JPEG  
            header.startswith(b'\x89PNG')):       # PNG
            return False
        
        return True  # Assume encrypted if no known signature
    except:
        return None  # File not accessible

def fix_database_flags(db_path, storage_root):
    """Fix is_encrypted flags in database based on actual file content."""
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get all documents with their current flags
    cursor.execute("""
        SELECT id, storage_path, is_encrypted, name 
        FROM documents 
        WHERE storage_path IS NOT NULL
    """)
    
    documents = cursor.fetchall()
    fixed_count = 0
    
    for doc_id, storage_path, current_flag, name in documents:
        full_path = os.path.join(storage_root, storage_path)
        
        if not os.path.exists(full_path):
            print(f"SKIP: File not found - {name}")
            continue
            
        actual_encrypted = detect_file_encryption(full_path)
        
        if actual_encrypted is None:
            print(f"SKIP: Cannot read file - {name}")
            continue
            
        if bool(current_flag) != actual_encrypted:
            # Fix the flag
            cursor.execute("""
                UPDATE documents 
                SET is_encrypted = ? 
                WHERE id = ?
            """, (actual_encrypted, doc_id))
            
            print(f"FIXED: {name} - was {current_flag}, now {actual_encrypted}")
            fixed_count += 1
        else:
            print(f"OK: {name} - flag correct ({current_flag})")
    
    conn.commit()
    conn.close()
    
    print(f"\nFixed {fixed_count} documents")

if __name__ == "__main__":
    # Update these paths for your system
    DB_PATH = "data/securevault.db"
    STORAGE_ROOT = "data/documents"
    
    fix_database_flags(DB_PATH, STORAGE_ROOT)