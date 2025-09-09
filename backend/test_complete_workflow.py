#!/usr/bin/env python3
"""
Test complete document preview workflow
Simulates the exact frontend API calls
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db
from app.services.document_service import DocumentService
from app.services.preview_service import PreviewService
from app.models.document import Document
from app.models.user import User

async def test_complete_workflow():
    print("Testing complete document preview workflow...")
    print("=" * 50)
    
    db = next(get_db())
    
    # Step 1: User authentication (simulated)
    print("Step 1: User Authentication")
    user = db.query(User).filter(User.username == "admin").first()
    print(f"User authenticated: {user.username} (ID: {user.id})")
    
    # Step 2: Get document (simulates GET /documents/3/preview - text file)
    print("\nStep 2: Initial Preview Request")
    document_id = 3
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == user.id
    ).first()
    
    if not document:
        print("ERROR: Document not found")
        return False
    
    print(f"Document found: {document.name}")
    print(f"Is encrypted: {document.is_encrypted}")
    print(f"Encryption model: {'encryption_key_id' if document.encryption_key_id else 'encrypted_dek'}")
    
    # Step 3: Check if encrypted (frontend would show password prompt)
    if document.is_encrypted:
        print("\nStep 3: Document is encrypted - Password prompt would appear")
        print("Frontend shows: 'This document is encrypted. Please provide password to generate preview.'")
        
        # Step 4: User provides password (simulates POST /documents/2/preview/encrypted)
        print("\nStep 4: User Provides Password")
        user_password = "test123"  # User enters password
        print(f"Password provided: '{user_password}'")
        
        # Step 5: Decrypt and generate preview
        print("\nStep 5: Decrypt and Generate Preview")
        document_service = DocumentService(db)
        preview_service = PreviewService()
        
        try:
            # Test password validation
            print("Testing password validation...")
            decrypted_data = await document_service.decrypt_document_content(
                document_id, user.id, user_password
            )
            print(f"Decryption successful: {len(decrypted_data)} bytes")
            print(f"Content: {decrypted_data[:80].decode()}...")
            
            # Generate preview
            print("\nGenerating preview...")
            preview_data = await preview_service.extract_text_preview(
                decrypted_data, document.mime_type, document.name
            )
            print(f"Preview generated successfully!")
            print(f"Preview type: {preview_data.get('type', 'unknown')}")
            if 'preview' in preview_data:
                print(f"Preview text: {preview_data['preview']}")
                
                # Step 6: Frontend displays preview
                print("\nStep 6: Frontend Display")
                print("Frontend would now display:")
                print(f"  Document: {document.name}")
                print(f"  Type: {preview_data.get('format', 'unknown')}")
                print(f"  Content: {preview_data['preview']}")
                print(f"  Word count: {preview_data.get('word_count', 0)}")
            else:
                print(f"Preview error: {preview_data.get('message', 'Unknown error')}")
                return False
            
            return True
            
        except PermissionError as e:
            print(f"ERROR: Wrong password - {str(e)}")
            return False
        except Exception as e:
            print(f"ERROR: Preview generation failed - {str(e)}")
            return False
    
    else:
        print("Step 3: Document is not encrypted - Direct preview")
        # For unencrypted documents, preview directly
        return True

async def test_wrong_password():
    print("\n" + "=" * 50)
    print("Testing Wrong Password Scenario...")
    print("=" * 50)
    
    db = next(get_db())
    service = DocumentService(db)
    
    # Test with empty password
    try:
        await service.decrypt_document_content(2, 1, "")
        print("ERROR: Empty password should be rejected")
        return False
    except PermissionError as e:
        print(f"PASS: Empty password rejected - {str(e)}")
    
    # Test with whitespace password  
    try:
        await service.decrypt_document_content(2, 1, "   ")
        print("ERROR: Whitespace password should be rejected")
        return False
    except PermissionError as e:
        print(f"PASS: Whitespace password rejected - {str(e)}")
    
    return True

if __name__ == "__main__":
    print("DOCUMENT PREVIEW WORKFLOW TEST")
    print("=" * 50)
    
    # Test successful workflow
    success1 = asyncio.run(test_complete_workflow())
    
    # Test error scenarios
    success2 = asyncio.run(test_wrong_password())
    
    print("\n" + "=" * 50)
    print("FINAL RESULTS:")
    print(f"Complete workflow: {'PASS' if success1 else 'FAIL'}")
    print(f"Password validation: {'PASS' if success2 else 'FAIL'}")
    print(f"Overall status: {'ALL TESTS PASSED' if success1 and success2 else 'SOME TESTS FAILED'}")
    print("=" * 50)