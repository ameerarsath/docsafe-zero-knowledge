#!/usr/bin/env python3
"""
Test password validation fix
"""

import sys
import os
import asyncio
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db
from app.services.document_service import DocumentService

async def test_password_validation():
    print("Testing password validation fix...")
    
    db = next(get_db())
    service = DocumentService(db)
    
    # Test with document 2 (encryption_key_id model)
    document_id = 2
    user_id = 1
    
    print(f"Testing document {document_id} with different password scenarios:")
    
    # Test 1: Empty password
    try:
        result = await service.decrypt_document_content(document_id, user_id, "")
        print("❌ Empty password should have failed")
    except PermissionError as e:
        print(f"✅ Empty password correctly rejected: {str(e)}")
    
    # Test 2: Whitespace only password
    try:
        result = await service.decrypt_document_content(document_id, user_id, "   ")
        print("❌ Whitespace password should have failed")
    except PermissionError as e:
        print(f"✅ Whitespace password correctly rejected: {str(e)}")
    
    # Test 3: Valid password
    try:
        result = await service.decrypt_document_content(document_id, user_id, "mypassword123")
        print(f"✅ Valid password accepted - Content length: {len(result)}")
        print(f"   Content preview: {result[:80].decode()}...")
    except Exception as e:
        print(f"❌ Valid password failed: {str(e)}")
    
    # Test 4: Another valid password
    try:
        result = await service.decrypt_document_content(document_id, user_id, "test")
        print(f"✅ Another valid password accepted - Content length: {len(result)}")
    except Exception as e:
        print(f"❌ Valid password failed: {str(e)}")
    
    # Test 5: Short password
    try:
        result = await service.decrypt_document_content(document_id, user_id, "a")
        print(f"✅ Short password accepted - Content length: {len(result)}")
    except Exception as e:
        print(f"❌ Short password failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_password_validation())