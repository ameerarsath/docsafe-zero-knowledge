#!/usr/bin/env python3
"""
Check database schema for documents table
"""

import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
DB_URL = os.getenv("DATABASE_URL", "postgresql://securevault_user:securevault_password@localhost:5430/securevault")

def check_documents_schema():
    """Check the actual schema of the documents table."""

    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()

        print("=== DOCUMENTS TABLE SCHEMA ===\n")

        # Get column information
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'documents'
            ORDER BY ordinal_position
        """)

        columns = cursor.fetchall()

        print("Columns:")
        for col in columns:
            print(f"  - {col[0]}: {col[1]} ({'NULL' if col[2] == 'YES' else 'NOT NULL'})")

        print("\n=== CHECKING FOR SPECIFIC COLUMNS ===\n")

        # Check for old columns
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'documents'
            AND column_name IN ('ciphertext', 'salt')
        """)

        old_columns = cursor.fetchall()

        if old_columns:
            print("❌ OLD COLUMNS FOUND:")
            for col in old_columns:
                print(f"  - {col[0]}")
        else:
            print("✅ No old 'ciphertext' or 'salt' columns found")

        # Check for new columns
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'documents'
            AND column_name IN ('encryption_key', 'encryption_salt')
        """)

        new_columns = cursor.fetchall()

        if new_columns:
            print("\n✅ NEW COLUMNS FOUND:")
            for col in new_columns:
                print(f"  - {col[0]}")
        else:
            print("\n❌ No 'encryption_key' or 'encryption_salt' columns found")

        print("\n=== ALEMBIC VERSION ===\n")

        # Check alembic version
        cursor.execute("SELECT version_num FROM alembic_version")
        alembic_version = cursor.fetchone()

        if alembic_version:
            print(f"Current Alembic version: {alembic_version[0]}")

        print("\n=== SAMPLE ROW CHECK ===\n")

        # Check a sample row to see what columns exist
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'documents'
        """)

        all_cols = [row[0] for row in cursor.fetchall()]

        if all_cols:
            # Try to query a document to see which columns actually exist
            cursor.execute("SELECT COUNT(*) FROM documents")
            doc_count = cursor.fetchone()[0]

            if doc_count > 0:
                cursor.execute("SELECT * FROM documents LIMIT 1")
                sample = cursor.fetchone()

                print(f"Sample document (1 of {doc_count}):")
                for i, col_name in enumerate(all_cols):
                    print(f"  {col_name}: {type(sample[i]).__name__ if sample[i] is not None else 'NULL'}")
            else:
                print("No documents in table to sample")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Error: {e}")
        return False

    return True

if __name__ == "__main__":
    check_documents_schema()