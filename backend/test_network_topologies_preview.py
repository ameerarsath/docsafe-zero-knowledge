#!/usr/bin/env python3
"""
Test preview functionality for Network Topologies.docx with password 'Ameer'
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db
from app.models.document import Document
from app.models.user import User
from app.services.document_service import DocumentService
from app.services.preview_service import PreviewService
from app.api.v1.document_preview import _generate_preview
import asyncio

async def test_network_topologies_preview():
    """Test preview for Network Topologies.docx with password 'Ameer'"""
    
    # Get database session
    db = next(get_db())
    
    try:
        # Find the document
        document = db.query(Document).filter(Document.id == 8).first()
        if not document:
            print("ERROR: Document 8 (Network Topologies.docx) not found")
            return
        
        print(f"=== TESTING PREVIEW FOR DOCUMENT 8 ===")
        print(f"Name: {document.name}")
        print(f"Owner ID: {document.owner_id}")
        print(f"Is Encrypted: {document.is_encrypted}")
        print(f"Has encryption_key_id: {bool(document.encryption_key_id)}")
        print(f"Has encrypted_dek: {bool(document.encrypted_dek)}")
        print(f"MIME Type: {document.mime_type}")
        print()
        
        # Get the owner user
        user = db.query(User).filter(User.id == document.owner_id).first()
        if not user:
            print(f"ERROR: Owner user {document.owner_id} not found")
            return
        
        print(f"Owner user: {user.username}")
        print()
        
        # Initialize services
        document_service = DocumentService(db)
        preview_service = PreviewService()
        
        # Test 1: Initial preview (should detect encryption)
        print("=== TEST 1: Initial Preview (Should Detect Encryption) ===")
        try:
            preview_data = await _generate_preview(
                document=document,
                preview_type="auto",
                max_size=1024,
                document_service=document_service,
                preview_service=preview_service,
                current_user=user
            )
            
            print(f"Preview type: {preview_data.get('type')}")
            print(f"Requires password: {preview_data.get('requires_password')}")
            print(f"Encryption type: {preview_data.get('encryption_type')}")
            print(f"Message: {preview_data.get('message')}")
            print()
            
        except Exception as e:
            print(f"ERROR in initial preview: {e}")
            print()
        
        # Test 2: Try encrypted preview with password
        print("=== TEST 2: Encrypted Preview with Password 'Ameer' ===")
        try:
            # Test the document service decrypt method
            decrypted_content = await document_service.decrypt_document_content(
                document_id=document.id,
                user_id=user.id,
                password="Ameer"
            )
            
            print(f"Decrypted content length: {len(decrypted_content)} bytes")
            print(f"Content preview: {decrypted_content[:200].decode('utf-8', errors='ignore')}...")
            print()
            
        except Exception as e:
            print(f"ERROR in decryption: {e}")
            print()
        
    except Exception as e:
        print(f"GENERAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_network_topologies_preview())