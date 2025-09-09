#!/usr/bin/env python3
"""Check user permissions and roles"""

from app.core.database import get_db, engine
from app.models.user import User
from app.core.rbac import has_permission
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
    
    print(f'User: {test_user.username}, Role: {test_user.role}')
    
    # Check specific permissions
    permissions_to_check = [
        'documents:read',
        'documents:write', 
        'documents:create',
        'documents:delete'
    ]
    
    for perm in permissions_to_check:
        has_perm = has_permission(test_user, perm, db)
        print(f'Permission {perm}: {has_perm}')
    
    db.close()
    
except Exception as e:
    print(f'Error checking permissions: {e}')
    import traceback
    traceback.print_exc()