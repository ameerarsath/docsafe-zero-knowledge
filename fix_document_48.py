#!/usr/bin/env python3
"""
Fix Document 48 issues for testing share validation workflow.

This script will:
1. Check the current state of Document 48
2. Fix ownership to allow rahumana (user ID 2) to access it
3. Set a valid storage_path or create a test file
4. Verify the fixes work
"""

import sqlite3
import os
import sys
from pathlib import Path

def main():
    print("=== Document 48 Diagnostic and Fix ===")

    # Database path
    db_path = Path("backend/securevault.db")
    if not db_path.exists():
        print(f"❌ Database not found at {db_path}")
        print("Please run this script from the docsafe project root")
        return

    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()

    try:
        # 1. Check current document state
        print("\n1. Current Document 48 State:")
        cursor.execute("""
            SELECT id, name, owner_id, storage_path, is_encrypted, encryption_key_id, file_size, mime_type
            FROM documents WHERE id = 48
        """)
        doc = cursor.fetchone()

        if not doc:
            print("[ERROR] Document 48 not found")
            return

        doc_id, name, owner_id, storage_path, is_encrypted, encryption_key_id, file_size, mime_type = doc
        print(f"   ID: {doc_id}")
        print(f"   Name: {name}")
        print(f"   Owner ID: {owner_id}")
        print(f"   Storage Path: {storage_path}")
        print(f"   Is Encrypted: {bool(is_encrypted)}")
        print(f"   Encryption Key ID: {encryption_key_id}")
        print(f"   File Size: {file_size}")
        print(f"   MIME Type: {mime_type}")

        # 2. Check users
        print("\n2. User Information:")
        cursor.execute("SELECT id, username FROM users ORDER BY id")
        users = cursor.fetchall()
        for user_id, username in users:
            print(f"   User {user_id}: {username}")

        # 3. Fix ownership to rahumana (user ID 2)
        print("\n3. Fixing ownership...")
        rahumana_id = None
        for user_id, username in users:
            if username == 'rahumana':
                rahumana_id = user_id
                break

        if not rahumana_id:
            print("[ERROR] User 'rahumana' not found")
            return

        cursor.execute("UPDATE documents SET owner_id = ? WHERE id = 48", (rahumana_id,))
        print(f"[OK] Updated owner_id from {owner_id} to {rahumana_id} (rahumana)")

        # 4. Fix storage_path
        print("\n4. Fixing storage path...")

        # Create uploads directory if it doesn't exist
        uploads_dir = Path("backend/uploads")
        uploads_dir.mkdir(exist_ok=True)

        # Create a test file if storage_path is None
        if storage_path is None:
            test_file_path = uploads_dir / f"document_{doc_id}_test.pdf"

            # Create a simple test PDF content (not a real PDF, but sufficient for testing)
            test_content = b"""
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test Document 48) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000199 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
293
%%EOF
"""

            with open(test_file_path, 'wb') as f:
                f.write(test_content)

            # Update database with new storage path
            cursor.execute("UPDATE documents SET storage_path = ? WHERE id = 48", (str(test_file_path.absolute()),))

            # Update file size
            file_size = len(test_content)
            cursor.execute("UPDATE documents SET file_size = ? WHERE id = 48", (file_size,))

            print(f"[OK] Created test file at: {test_file_path.absolute()}")
            print(f"[OK] Updated storage_path and file_size ({file_size} bytes)")
        else:
            print(f"   Storage path already set: {storage_path}")
            # Check if file exists
            if not os.path.exists(storage_path):
                print(f"[WARN] File doesn't exist at {storage_path}")
            else:
                print(f"[OK] File exists at {storage_path}")

        # 5. Commit changes
        conn.commit()
        print("\n5. Changes committed to database")

        # 6. Verify fixes
        print("\n6. Verification:")
        cursor.execute("""
            SELECT id, name, owner_id, storage_path, is_encrypted, encryption_key_id, file_size
            FROM documents WHERE id = 48
        """)
        updated_doc = cursor.fetchone()

        if updated_doc:
            doc_id, name, owner_id, storage_path, is_encrypted, encryption_key_id, file_size = updated_doc
            print(f"   [OK] Owner ID: {owner_id} (should be {rahumana_id})")
            print(f"   [OK] Storage Path: {storage_path}")
            print(f"   [OK] File Size: {file_size}")

            if storage_path and os.path.exists(storage_path):
                print(f"   [OK] File exists on disk")
            else:
                print(f"   [ERROR] File missing on disk")

        print("\n[OK] Document 48 fixes completed!")
        print("\nNow you should be able to test the share validation workflow.")

    except Exception as e:
        print(f"[ERROR] Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    main()