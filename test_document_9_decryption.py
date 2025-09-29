#!/usr/bin/env python3
"""
Test script to verify document 9 decryption and preview functionality
"""

import sys
import os
import asyncio
import json

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app.core.database import get_db
from backend.app.models.document import Document
from backend.app.services.document_service import DocumentService
from backend.app.services.preview_service import PreviewService

async def test_document_9_decryption():
    """Test decryption and preview of document 9"""
    
    # Get database session
    db = next(get_db())
    
    try:
        # Get document 9
        document = db.query(Document).filter(Document.id == 9).first()
        
        if not document:
            print("❌ Document 9 not found")
            return
        
        print(f"📄 Document 9 found: {document.name}")
        print(f"   - MIME type: {document.mime_type}")
        print(f"   - File size: {document.file_size} bytes")
        print(f"   - Is encrypted: {document.is_encrypted}")
        print(f"   - Has encrypted_dek: {bool(document.encrypted_dek)}")
        print(f"   - Storage path: {document.storage_path}")
        
        # Initialize services
        document_service = DocumentService(db)
        preview_service = PreviewService()
        
        # Test password (from your previous tests)
        test_password = "JHNpAZ39g!&Y"
        
        print(f"\n🔓 Attempting decryption with password...")
        
        try:
            # Try to decrypt the document
            decrypted_content = await document_service.decrypt_document_content(
                document.id, document.owner_id, test_password
            )
            
            print(f"✅ Decryption successful!")
            print(f"   - Decrypted content length: {len(decrypted_content)} bytes")
            
            # Show first 200 characters of decrypted content
            if len(decrypted_content) > 0:
                try:
                    # Try to decode as text
                    text_content = decrypted_content.decode('utf-8')
                    print(f"   - Content preview (first 200 chars):")
                    print(f"     {repr(text_content[:200])}")
                except UnicodeDecodeError:
                    print(f"   - Content appears to be binary data")
                    print(f"   - First 50 bytes: {decrypted_content[:50].hex()}")
            
            # Test preview generation
            print(f"\n🖼️ Generating text preview...")
            
            try:
                text_preview = await preview_service.extract_text_preview(
                    decrypted_content, document.mime_type, document.name
                )
                
                print(f"✅ Text preview generated successfully!")
                print(f"   - Preview type: {text_preview.get('type')}")
                print(f"   - Format: {text_preview.get('format')}")
                
                if 'preview' in text_preview:
                    print(f"   - Preview content (first 300 chars):")
                    print(f"     {repr(text_preview['preview'][:300])}")
                elif 'message' in text_preview:
                    print(f"   - Preview message: {text_preview['message']}")
                
            except Exception as preview_error:
                print(f"❌ Preview generation failed: {str(preview_error)}")
            
        except Exception as decrypt_error:
            print(f"❌ Decryption failed: {str(decrypt_error)}")
            
            # Try to get the raw encrypted content to see what we're working with
            try:
                print(f"\n🔍 Examining raw encrypted content...")
                raw_content = await document_service.get_document_content(document.id, document.owner_id)
                print(f"   - Raw content length: {len(raw_content)} bytes")
                
                # Try to see if it's JSON
                try:
                    if raw_content.startswith(b'{'):
                        json_data = json.loads(raw_content.decode('utf-8'))
                        print(f"   - Content is JSON with keys: {list(json_data.keys())}")
                    else:
                        print(f"   - Content is binary, first 50 bytes: {raw_content[:50].hex()}")
                except:
                    print(f"   - Content format unknown")
                    
            except Exception as raw_error:
                print(f"❌ Could not get raw content: {str(raw_error)}")
        
        # Also check the encrypted_dek structure
        if document.encrypted_dek:
            try:
                print(f"\n🔑 Examining encrypted DEK structure...")
                if isinstance(document.encrypted_dek, str):
                    dek_data = json.loads(document.encrypted_dek)
                else:
                    dek_data = document.encrypted_dek
                
                print(f"   - DEK structure keys: {list(dek_data.keys())}")
                for key, value in dek_data.items():
                    if isinstance(value, str) and len(value) > 50:
                        print(f"   - {key}: {value[:50]}... (truncated)")
                    else:
                        print(f"   - {key}: {value}")
                        
            except Exception as dek_error:
                print(f"❌ Could not parse encrypted DEK: {str(dek_error)}")
        
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(test_document_9_decryption())