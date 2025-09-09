#!/usr/bin/env python3
"""
Test document 2 specifically
"""

import sys
import os
import asyncio
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db
from app.models.document import Document
from app.models.user import User
from app.services.document_service import DocumentService

async def test_document_2():
    print("Testing document 2 decryption service...")
    
    db = next(get_db())
    
    # Test document 2 specifically
    document_id = 2
    user_id = 1  # admin
    password = "test"
    
    print(f"Testing document {document_id} with user {user_id}")
    
    # Get document details
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        print("ERROR: Document not found")
        return
    
    print(f"Document: {document.name}")
    print(f"Owner: {document.owner_id}")
    print(f"Is encrypted: {document.is_encrypted}")
    print(f"Has encrypted_dek: {bool(document.encrypted_dek)}")
    print(f"Has encryption_key_id: {bool(document.encryption_key_id)}")
    if document.encryption_key_id:
        print(f"encryption_key_id value: {document.encryption_key_id}")
    
    # Test the document service directly
    service = DocumentService(db)
    
    try:
        print("\nCalling decrypt_document_content...")
        decrypted_data = await service.decrypt_document_content(
            document_id, user_id, password
        )
        print(f"SUCCESS: Decrypted {len(decrypted_data)} bytes")
        print(f"Content preview: {decrypted_data[:50]}...")
        return True
    except Exception as e:
        print(f"ERROR: Decryption failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_document_2())
    print(f"\nTest result: {'PASSED' if result else 'FAILED'}")