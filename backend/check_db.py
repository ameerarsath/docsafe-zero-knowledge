#!/usr/bin/env python3
"""Check database connection and users"""

from app.core.database import get_db, engine
from app.models.user import User
from sqlalchemy.orm import sessionmaker

try:
    # Create session
    Session = sessionmaker(bind=engine)
    db = Session()
    
    # Query users
    users = db.query(User).all()
    print(f'Found {len(users)} users')
    
    for user in users:
        print(f'User: {user.username}, Active: {user.is_active}, Role: {user.role}')
        
    # Test specific user
    test_user = db.query(User).filter(User.username == 'rahumana').first()
    if test_user:
        print(f'Test user found: {test_user.username}, can_login: {test_user.can_login()}')
        print(f'Password hash exists: {bool(test_user.password_hash)}')
    else:
        print('Test user not found')
        
    db.close()
    
except Exception as e:
    print(f'Database error: {e}')
    import traceback
    traceback.print_exc()