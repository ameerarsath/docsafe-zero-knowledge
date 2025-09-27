#!/usr/bin/env python3
"""
Test document 8 authentication and preview
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db
from app.services.document_service import DocumentService
from app.models.document import Document
from app.models.user import User

async def test_document_8():
    print("Testing document 8 authentication and preview...")
    print("=" * 50)
    
    db = next(get_db())
    
    # Test document 8 specifically
    document_id = 8
    user_id = 1  # admin
    password = "Ameer"  # User's actual password
    
    print(f"Document ID: {document_id}")
    print(f"User ID: {user_id}")
    print(f"Password: '{password}'")
    
    # Check document details
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        print("ERROR: Document 8 not found")
        return False
    
    print(f"\nDocument Details:")
    print(f"  Name: {document.name}")
    print(f"  Owner ID: {document.owner_id}")
    print(f"  Is encrypted: {document.is_encrypted}")
    print(f"  Encryption model: {'encryption_key_id' if document.encryption_key_id else 'encrypted_dek'}")
    
    # Check user details
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        print("ERROR: User not found")
        return False
        
    print(f"\nUser Details:")
    print(f"  Username: {user.username}")
    print(f"  ID: {user.id}")
    print(f"  Is active: {user.is_active}")
    
    # Check ownership match
    if document.owner_id != user.id:
        print(f"ERROR: Ownership mismatch!")
        print(f"  Document owner: {document.owner_id}")
        print(f"  Current user: {user.id}")
        return False
    else:
        print("SUCCESS: Ownership check passed")
    
    # Test document service directly (bypassing authentication)
    print(f"\nTesting document service...")
    service = DocumentService(db)
    
    try:
        print(f"Attempting decryption with password '{password}'...")
        decrypted_data = await service.decrypt_document_content(
            document_id, user_id, password
        )
        print(f"SUCCESS: Decryption successful: {len(decrypted_data)} bytes")
        print(f"Content preview: {decrypted_data[:80].decode()}...")
        return True
    except Exception as e:
        print(f"ERROR: Decryption failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_document_8())
    print(f"\nTest result: {'PASSED' if result else 'FAILED'}")
    
    if result:
        print("\n" + "=" * 50)
        print("ANALYSIS: Document 8 backend functionality works correctly.")
        print("The 401 error is likely caused by:")
        print("  1. Expired/invalid JWT token in frontend")
        print("  2. Missing Authorization header")
        print("  3. Token not being sent with the request")
        print("\nSUGGESTED FIXES:")
        print("  1. Check if user is still logged in")
        print("  2. Refresh the page or re-login")
        print("  3. Check browser dev tools for Authorization header")
        print("=" * 50)
    else:
        print("\n" + "=" * 50)
        print("ANALYSIS: Backend issue found with document 8")
        print("=" * 50)