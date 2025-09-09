#!/usr/bin/env python3
"""Create test user rahumana"""

from app.core.database import get_db, engine
from app.models.user import User
from sqlalchemy.orm import sessionmaker

try:
    # Create session
    Session = sessionmaker(bind=engine)
    db = Session()
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.username == 'rahumana').first()
    if existing_user:
        print('User rahumana already exists')
        db.close()
        exit()
    
    # Create test user
    test_user = User(
        username='rahumana',
        email='rahumana@test.com',
        password='TestPass123@',  # This gets hashed by User.__init__
        full_name='Test User',
        role='user',
        is_active=True,
        is_verified=True,
        must_change_password=False
    )
    
    db.add(test_user)
    db.commit()
    db.refresh(test_user)
    
    print(f'Created test user: {test_user.username}, ID: {test_user.id}')
    db.close()
    
except Exception as e:
    print(f'Error creating user: {e}')
    import traceback
    traceback.print_exc()