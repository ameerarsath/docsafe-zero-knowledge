#!/usr/bin/env python3
"""
Test direct SQLAlchemy query to documents table
"""

import os
import sys

# Add the app directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db
from app.models.document import Document
from sqlalchemy.orm import Session
from sqlalchemy import text

def test_documents_query():
    """Test direct query to documents table."""

    print("=== TESTING DIRECT DOCUMENTS QUERY ===\n")

    # Get database session
    db = next(get_db())

    try:
        print("1. Testing simple COUNT query...")
        result = db.execute(text("SELECT COUNT(*) FROM documents"))
        count = result.scalar()
        print(f"   Document count: {count}")

        print("\n2. Testing simple SELECT * query...")
        result = db.execute(text("SELECT id, name, status FROM documents LIMIT 5"))
        rows = result.fetchall()
        print(f"   Found {len(rows)} documents:")
        for row in rows:
            print(f"   - ID: {row[0]}, Name: {row[1]}, Status: {row[2]}")

        print("\n3. Testing SQLAlchemy model query...")
        documents = db.query(Document).limit(5).all()
        print(f"   SQLAlchemy found {len(documents)} documents:")
        for doc in documents:
            print(f"   - ID: {doc.id}, Name: {doc.name}, Status: {doc.status}")

        print("\n4. Testing columns in table...")
        result = db.execute(text("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'documents'
            AND column_name IN ('encryption_key', 'encryption_salt', 'ciphertext', 'salt')
            ORDER BY column_name
        """))
        columns = result.fetchall()
        print("   Encryption-related columns:")
        for col in columns:
            print(f"   - {col[0]}: {col[1]}")

        print("\n5. Testing if old columns are being queried...")
        try:
            # This should fail if columns don't exist
            result = db.execute(text("SELECT encryption_key, encryption_salt FROM documents LIMIT 1"))
            print("   ✅ New columns queried successfully")
        except Exception as e:
            print(f"   ❌ Error querying new columns: {e}")

        try:
            # This should fail if old columns don't exist
            result = db.execute(text("SELECT ciphertext, salt FROM documents LIMIT 1"))
            print("   ❌ Old columns found (this shouldn't happen!)")
        except Exception as e:
            print(f"   ✅ Old columns correctly don't exist: {e}")

    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

    finally:
        db.close()

if __name__ == "__main__":
    test_documents_query()