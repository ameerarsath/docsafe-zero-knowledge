#!/usr/bin/env python3
"""
Debug script to test document download functionality
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from sqlalchemy.orm import Session
from backend.app.models.user import User
from backend.app.models.document import Document
from backend.app.core.database import get_db

def test_document_download():
    """Test document download functionality"""
    try:
        # Get database session
        db = next(get_db())
        
        # Check if document 14 exists
        document = db.query(Document).filter(Document.id == 14).first()
        if not document:
            print("❌ Document 14 not found in database")
            return
        
        print(f"✅ Document 14 found: {document.name}")
        print(f"   Document type: {document.document_type}")
        print(f"   Storage path: {document.storage_path}")
        print(f"   File size: {document.file_size}")
        print(f"   MIME type: {document.mime_type}")
        print(f"   Owner ID: {document.owner_id}")
        print(f"   Is encrypted: {document.is_encrypted}")
        
        # Check if file exists on disk
        if document.storage_path:
            if os.path.exists(document.storage_path):
                actual_size = os.path.getsize(document.storage_path)
                print(f"✅ File exists on disk, actual size: {actual_size}")
                if document.file_size != actual_size:
                    print(f"⚠️  Size mismatch: DB={document.file_size}, Disk={actual_size}")
            else:
                print(f"❌ File not found on disk: {document.storage_path}")
        else:
            print("❌ No storage path set for document")
        
        # Check owner exists
        if document.owner_id:
            owner = db.query(User).filter(User.id == document.owner_id).first()
            if owner:
                print(f"✅ Owner found: {owner.username}")
            else:
                print(f"❌ Owner not found: ID {document.owner_id}")
        
        # Test access permissions (simulate with first admin user)
        admin_user = db.query(User).filter(User.is_admin == True).first()
        if admin_user:
            print(f"🔐 Testing access with admin user: {admin_user.username}")
            can_access = document.can_user_access(admin_user, "read")
            print(f"   Can access: {can_access}")
        else:
            print("❌ No admin user found for testing")
            
    except Exception as e:
        print(f"❌ Error during document download test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_document_download()