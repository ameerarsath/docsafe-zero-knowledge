#!/usr/bin/env python3

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db
from app.services.document_service import DocumentService

async def test_passwords():
    print("Testing password validation...")
    db = next(get_db())
    service = DocumentService(db)
    
    # Test empty password
    try:
        await service.decrypt_document_content(2, 1, "")
        print("ERROR: Empty password accepted")
    except PermissionError:
        print("PASS: Empty password rejected")
    
    # Test valid password
    try:
        result = await service.decrypt_document_content(2, 1, "test123")
        print(f"PASS: Valid password accepted, got {len(result)} bytes")
        print(f"Content: {result[:50].decode()}...")
    except Exception as e:
        print(f"ERROR: Valid password failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_passwords())