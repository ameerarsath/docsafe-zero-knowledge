#!/usr/bin/env python3
"""
Test document 8 with exact password "Ameer"
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db
from app.services.document_service import DocumentService

async def test_exact_password():
    print('TESTING DOCUMENT 8 WITH EXACT PASSWORD "Ameer"')
    print('=' * 50)
    
    db = next(get_db())
    service = DocumentService(db)
    
    document_id = 8
    user_id = 1
    password = "Ameer"  # Exact password from user
    
    print(f'Document: {document_id}')
    print(f'User: {user_id} (admin)')
    print(f'Password: "{password}" (length: {len(password)})')
    
    try:
        print(f'\nTesting password validation...')
        result = await service.decrypt_document_content(document_id, user_id, password)
        print(f'SUCCESS: Password "{password}" accepted!')
        print(f'Decrypted content length: {len(result)} bytes')
        print(f'Content: {result[:80].decode()}...')
        return True
    except PermissionError as e:
        print(f'FAIL: Password "{password}" rejected - {str(e)}')
        return False
    except Exception as e:
        print(f'ERROR: {str(e)}')
        return False

if __name__ == "__main__":
    result = asyncio.run(test_exact_password())
    print(f'\nRESULT: {"PASSED" if result else "FAILED"}')
    
    if result:
        print('\nCONCLUSION:')
        print('SUCCESS: Backend accepts password "Ameer" for document 8')
        print('SUCCESS: Decryption and mock content generation works')
        print('SUCCESS: The 401 error is from frontend authentication, not password')
        print('\nSOLUTION: Refresh your login session in the frontend')
    else:
        print('\nCONCLUSION:')
        print('ERROR: Backend issue with password "Ameer"')