#!/usr/bin/env python3
"""Test security permissions for the rahumana user"""

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
    
    # Check security permissions
    security_permissions = [
        'security:read',
        'security:create', 
        'security:update',
        'security:delete'
    ]
    
    print('\nSecurity Permissions:')
    for perm in security_permissions:
        has_perm = has_permission(test_user, perm, db)
        status = 'YES' if has_perm else 'NO'
        print(f'{status} {perm}: {has_perm}')
    
    # Check other permissions for comparison
    print('\nOther Permissions:')
    other_permissions = [
        'documents:read',
        'users:read',
        'system:admin'
    ]
    
    for perm in other_permissions:
        has_perm = has_permission(test_user, perm, db)
        status = 'YES' if has_perm else 'NO'
        print(f'{status} {perm}: {has_perm}')
    
    db.close()
    
except Exception as e:
    print(f'Error checking permissions: {e}')
    import traceback
    traceback.print_exc()