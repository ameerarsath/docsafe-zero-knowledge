#!/usr/bin/env python3
"""Assign proper roles and permissions to test user"""

from app.core.database import get_db, engine
from app.models.user import User
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

try:
    # Create session
    Session = sessionmaker(bind=engine)
    db = Session()
    
    # Get test user
    test_user = db.query(User).filter(User.username == 'rahumana').first()
    if not test_user:
        print('Test user not found')
        exit(1)
    
    print(f'Found user: {test_user.username} (ID: {test_user.id})')
    
    # Check what roles exist
    roles_result = db.execute(text("SELECT id, name, description FROM roles"))
    roles = roles_result.fetchall()
    
    print(f'Available roles:')
    for role in roles:
        print(f'  - {role.id}: {role.name} - {role.description}')
    
    # Find the user role
    user_role = next((r for r in roles if r.name == 'user'), None)
    if not user_role:
        print('User role not found!')
        exit(1)
    
    # Check if user already has role assignment
    existing_assignment = db.execute(text("""
        SELECT * FROM user_roles 
        WHERE user_id = :user_id AND role_id = :role_id
    """), {"user_id": test_user.id, "role_id": user_role.id}).fetchone()
    
    if existing_assignment:
        print(f'User already has role assignment: {existing_assignment}')
    else:
        # Assign user role
        db.execute(text("""
            INSERT INTO user_roles (user_id, role_id, assigned_at, is_primary, is_active)
            VALUES (:user_id, :role_id, NOW(), true, true)
        """), {"user_id": test_user.id, "role_id": user_role.id})
        
        db.commit()
        print(f'Assigned role "{user_role.name}" to user "{test_user.username}"')
    
    # Check what permissions the user role has
    permissions_result = db.execute(text("""
        SELECT p.name, p.description 
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = :role_id
    """), {"role_id": user_role.id})
    
    permissions = permissions_result.fetchall()
    print(f'Role "{user_role.name}" has {len(permissions)} permissions:')
    for perm in permissions:
        print(f'  - {perm.name}: {perm.description}')
    
    db.close()
    
except Exception as e:
    print(f'Error assigning roles: {e}')
    import traceback
    traceback.print_exc()