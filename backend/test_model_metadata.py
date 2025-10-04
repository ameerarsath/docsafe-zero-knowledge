#!/usr/bin/env python3
"""
Test script to check SQLAlchemy Document model metadata
"""

import os
import sys

# Add the app directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import Base
from app.models.document import Document
from sqlalchemy import inspect

def check_document_model():
    """Check what columns SQLAlchemy thinks the Document model has."""

    print("=== SQLALCHEMY DOCUMENT MODEL COLUMNS ===\n")

    # Get the mapper for the Document model
    mapper = inspect(Document)

    print("Columns in SQLAlchemy Document model:")
    for col in mapper.columns:
        print(f"  - {col.name}: {col.type} (nullable: {col.nullable})")

    print("\n=== TABLE NAME ===")
    print(f"Table name: {Document.__tablename__}")

    print("\n=== CHECK FOR PROBLEMATIC COLUMNS ===")

    column_names = [col.name for col in mapper.columns]

    if 'ciphertext' in column_names:
        print("❌ 'ciphertext' column found in model!")
    else:
        print("✅ No 'ciphertext' column in model")

    if 'salt' in column_names:
        print("❌ 'salt' column found in model!")
    else:
        print("✅ No 'salt' column in model")

    if 'encryption_key' in column_names:
        print("✅ 'encryption_key' column found in model")
    else:
        print("❌ No 'encryption_key' column in model")

    if 'encryption_salt' in column_names:
        print("✅ 'encryption_salt' column found in model")
    else:
        print("❌ No 'encryption_salt' column in model")

    print("\n=== RAW SQL FROM TABLE CREATION ===")

    # Show what CREATE TABLE would look like
    from sqlalchemy.schema import CreateTable
    create_sql = str(CreateTable(Document.__table__).compile(compile_kwargs={"literal_binds": True}))
    print(create_sql[:1000] + "..." if len(create_sql) > 1000 else create_sql)

if __name__ == "__main__":
    check_document_model()