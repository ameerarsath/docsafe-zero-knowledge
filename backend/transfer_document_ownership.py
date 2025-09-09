#!/usr/bin/env python3
"""Transfer document ownership to test user"""

from app.core.database import get_db, engine
from app.models.document import Document
from app.models.user import User
from sqlalchemy.orm import sessionmaker

try:
    # Create session
    Session = sessionmaker(bind=engine)
    db = Session()
    
    # Get test user
    test_user = db.query(User).filter(User.username == 'rahumana').first()
    if not test_user:
        print('Test user not found')
        exit(1)
    
    # Transfer ownership of document 5 to test user
    document_5 = db.query(Document).filter(Document.id == 5).first()
    if document_5:
        old_owner = document_5.owner_id
        document_5.owner_id = test_user.id
        document_5.created_by = test_user.id
        
        db.commit()
        print(f'Transferred document 5 ({document_5.name}) from user {old_owner} to user {test_user.id} ({test_user.username})')
    else:
        print('Document 5 not found')
    
    # Also transfer documents 2, 3, 4 for good measure
    for doc_id in [2, 3, 4]:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            old_owner = doc.owner_id
            doc.owner_id = test_user.id
            doc.created_by = test_user.id
            print(f'Transferred document {doc_id} ({doc.name}) from user {old_owner} to user {test_user.id} ({test_user.username})')
    
    db.commit()
    
    # Show final ownership
    user_docs = db.query(Document).filter(Document.owner_id == test_user.id).all()
    print(f'\nUser {test_user.username} now owns {len(user_docs)} documents:')
    for doc in user_docs:
        print(f'  - Document {doc.id}: {doc.name}')
    
    db.close()
    
except Exception as e:
    print(f'Error transferring ownership: {e}')
    import traceback
    traceback.print_exc()