#!/usr/bin/env python3
"""
Create a test encrypted document for zero-knowledge preview testing
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.document import Document
from app.core.config import settings
from datetime import datetime
import uuid

def create_test_encrypted_document():
    """Create a test encrypted document with proper zero-knowledge encryption fields"""
    
    # Create database connection
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Create test encrypted document
        test_doc = Document(
            uuid=uuid.uuid4(),
            name="encrypted_test_preview.txt",
            description="Test encrypted document for zero-knowledge preview",
            document_type="document",
            mime_type="text/plain",
            original_filename="encrypted_test_preview.txt",
            file_extension=".txt",
            file_size=250,
            file_hash_sha256="test_encrypted_hash_123",
            storage_path="/test/encrypted/encrypted_test_preview.txt",
            storage_backend="local",
            
            # Zero-knowledge encryption fields
            is_encrypted=True,
            encryption_algorithm="AES-256-GCM",
            encrypted_dek="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJkZWsiOiJ0ZXN0X2Vfa2V5X2RhdGEifQ.test_signature",  # Mock DEK
            encryption_iv="dGVzdF9pdl9kYXRhXzEyMw==",  # Mock IV (base64)
            
            # Document metadata
            parent_id=None,
            path=None,
            depth_level=0,
            owner_id=2,  # rahumana user
            created_by=2,
            status="active",
            share_type="private",
            is_shared=False,
            allow_download=True,
            allow_preview=True,
            version_number=1,
            is_latest_version=True,
            doc_metadata="{}",
            tags="[]",
            is_sensitive=True,
            child_count=0,
            total_size=0
        )
        
        db.add(test_doc)
        db.commit()
        
        print(f"SUCCESS: Created encrypted test document: {test_doc.id} - {test_doc.name}")
        print(f"   - Encrypted: {test_doc.is_encrypted}")
        print(f"   - Has DEK: {bool(test_doc.encrypted_dek)}")
        print(f"   - Owner: {test_doc.owner_id}")
        
        return test_doc.id
        
    except Exception as e:
        print(f"ERROR: Error creating test document: {e}")
        db.rollback()
        return None
        
    finally:
        db.close()

if __name__ == "__main__":
    doc_id = create_test_encrypted_document()
    if doc_id:
        print(f"\n🔐 Test encrypted document created with ID: {doc_id}")
        print("   You can now test zero-knowledge preview with this document!")
    else:
        print("\nERROR: Failed to create test document")