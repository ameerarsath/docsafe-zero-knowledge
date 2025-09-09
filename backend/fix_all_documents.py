#!/usr/bin/env python3
"""
Fix All Document Ownership Issues

Transfer all documents from rahumana to admin to resolve 
preview issues for admin user.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db
from app.models.document import Document
from app.models.user import User

def main():
    print("Fixing all document ownership issues...")
    
    db = next(get_db())
    
    # Get admin user
    admin_user = db.query(User).filter(User.username == "admin").first()
    if not admin_user:
        print("ERROR: Admin user not found")
        return
    
    # Get all documents owned by rahumana
    rahumana_docs = db.query(Document).filter(Document.owner_id == 2).all()
    
    print(f"Found {len(rahumana_docs)} documents owned by rahumana:")
    for doc in rahumana_docs:
        print(f"  - Doc {doc.id}: {doc.name}")
    
    # Transfer ownership to admin
    for doc in rahumana_docs:
        print(f"Transferring document {doc.id} ({doc.name}) to admin...")
        doc.owner_id = admin_user.id
    
    db.commit()
    
    print(f"SUCCESS: Transferred {len(rahumana_docs)} documents to admin")
    print("Admin can now preview all documents!")

if __name__ == "__main__":
    main()