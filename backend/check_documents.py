#!/usr/bin/env python3
"""Check documents in database"""

from app.core.database import get_db, engine
from app.models.document import Document
from app.models.user import User
from sqlalchemy.orm import sessionmaker

try:
    # Create session
    Session = sessionmaker(bind=engine)
    db = Session()
    
    # Query all documents
    documents = db.query(Document).all()
    print(f'Found {len(documents)} documents')
    
    for doc in documents:
        print(f'Document {doc.id}: {doc.name} (Owner: {doc.owner_id}, Encrypted: {bool(doc.encrypted_dek)})')
        
    # Query all users
    users = db.query(User).all()
    print(f'\nFound {len(users)} users')
    
    for user in users:
        print(f'User {user.id}: {user.username} (Role: {user.role})')
        
    # Check if test user has any documents
    test_user = db.query(User).filter(User.username == 'rahumana').first()
    if test_user:
        user_docs = db.query(Document).filter(Document.owner_id == test_user.id).all()
        print(f'\nUser {test_user.username} owns {len(user_docs)} documents')
    
    db.close()
    
except Exception as e:
    print(f'Database error: {e}')
    import traceback
    traceback.print_exc()