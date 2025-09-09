#!/usr/bin/env python3
"""
Fix Document Ownership Issue

Transfer document 3 ownership from rahumana to admin
to resolve the 404 preview error.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db
from app.models.document import Document
from app.models.user import User

def main():
    print("Fixing document ownership issue...")
    
    db = next(get_db())
    
    # Check current ownership
    doc = db.query(Document).filter(Document.id == 3).first()
    if not doc:
        print("ERROR: Document 3 not found")
        return
    
    # Get user info
    current_owner = db.query(User).filter(User.id == doc.owner_id).first()
    admin_user = db.query(User).filter(User.username == "admin").first()
    
    print(f"Document: {doc.name}")
    print(f"Current owner: {current_owner.username if current_owner else 'Unknown'} (ID: {doc.owner_id})")
    print(f"Admin user ID: {admin_user.id if admin_user else 'Not found'}")
    
    if not admin_user:
        print("ERROR: Admin user not found")
        return
    
    # Transfer ownership
    doc.owner_id = admin_user.id
    db.commit()
    
    print(f"SUCCESS: Document 3 ownership transferred to admin (ID: {admin_user.id})")
    print("Issue resolved! Admin can now preview the document.")

if __name__ == "__main__":
    main()