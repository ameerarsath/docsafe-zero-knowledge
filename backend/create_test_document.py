#!/usr/bin/env python3
"""Create a test document for the test user"""

from app.core.database import get_db, engine
from app.models.document import Document, DocumentType
from app.models.user import User
from sqlalchemy.orm import sessionmaker
import uuid
from datetime import datetime

try:
    # Create session
    Session = sessionmaker(bind=engine)
    db = Session()
    
    # Get test user
    test_user = db.query(User).filter(User.username == 'rahumana').first()
    if not test_user:
        print('Test user rahumana not found')
        exit(1)
    
    # Create a test document for the user
    test_doc = Document(
        uuid=str(uuid.uuid4()),
        name="test_document.txt",
        description="Test document for rahumana",
        document_type=DocumentType.DOCUMENT,
        mime_type="text/plain",
        original_filename="test_document.txt",
        file_extension=".txt",
        file_size=100,
        file_hash_sha256="test_hash_" + str(uuid.uuid4())[:8],
        storage_path="/test/path/test_document.txt",
        storage_backend="local",
        owner_id=test_user.id,
        created_by=test_user.id,
        status="active",
        is_latest_version=True,
        version_number=1,
        allow_preview=True,
        allow_download=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(test_doc)
    db.commit()
    db.refresh(test_doc)
    
    print(f'Created test document {test_doc.id}: {test_doc.name} for user {test_user.username}')
    
    # Also create an encrypted test document
    encrypted_doc = Document(
        uuid=str(uuid.uuid4()),
        name="encrypted_test.txt",
        description="Encrypted test document for rahumana",
        document_type=DocumentType.DOCUMENT,
        mime_type="text/plain",
        original_filename="encrypted_test.txt",
        file_extension=".txt",
        file_size=150,
        file_hash_sha256="encrypted_hash_" + str(uuid.uuid4())[:8],
        storage_path="/test/path/encrypted_test.txt",
        storage_backend="local",
        owner_id=test_user.id,
        created_by=test_user.id,
        status="active",
        is_latest_version=True,
        version_number=1,
        allow_preview=True,
        allow_download=True,
        is_encrypted=True,
        encrypted_dek="test_encrypted_dek_data",  # Mock encrypted data
        encryption_algorithm="AES-256-GCM",
        encryption_iv="test_iv_data",
        encryption_auth_tag="test_auth_tag",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(encrypted_doc)
    db.commit()
    db.refresh(encrypted_doc)
    
    print(f'Created encrypted test document {encrypted_doc.id}: {encrypted_doc.name} for user {test_user.username}')
    
    db.close()
    
except Exception as e:
    print(f'Error creating test document: {e}')
    import traceback
    traceback.print_exc()