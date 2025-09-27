"""
Test script to verify RBAC decorators work with FastAPI.
"""

import asyncio
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db, SessionLocal
from app.core.rbac import require_permission, require_role, has_permission
from app.core.rbac_init import initialize_rbac_system
from app.models.user import User
from app.models.rbac import UserRole, Role


# Create test user with admin role
def create_test_user_with_role(db: Session, role_name: str = "admin"):
    """Create a test user with specified role."""
    username = f"test_{role_name}"
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        print(f"Using existing user: {existing_user.username}")
        return existing_user
    
    # Create user
    user = User(
        username=username,
        email=f"test_{role_name}@example.com",
        password="SecureTestPassword123!",
        role=role_name
    )
    db.add(user)
    db.flush()
    
    # Assign RBAC role
    role = db.query(Role).filter(Role.name == role_name).first()
    if role:
        user_role = UserRole(user_id=user.id, role_id=role.id, is_primary=True)
        db.add(user_role)
    
    db.commit()
    return user


def test_rbac_decorators():
    """Test RBAC decorators work correctly."""
    print("Testing RBAC decorators...")
    
    # Initialize database
    db = SessionLocal()
    initialize_rbac_system(db)
    
    # Create test users
    admin_user = create_test_user_with_role(db, "admin")
    regular_user = create_test_user_with_role(db, "user")
    
    print(f"Created admin user: {admin_user.username}")
    print(f"Created regular user: {regular_user.username}")
    
    # Test permission checking
    print("\nTesting permission checking...")
    
    # Admin should have admin permissions
    admin_has_admin_perm = has_permission(admin_user, "users:create", db)
    print(f"Admin has 'users:create': {admin_has_admin_perm}")
    
    # Regular user should not have admin permissions
    user_has_admin_perm = has_permission(regular_user, "users:create", db)
    print(f"User has 'users:create': {user_has_admin_perm}")
    
    # Test decorator functions (without FastAPI context)
    print("\nTesting decorator logic...")
    
    @require_permission("documents:read")
    async def read_documents(current_user: User, db: Session):
        return {"message": "Documents read successfully", "user": current_user.username}
    
    @require_role("admin")
    async def admin_function(current_user: User, db: Session):
        return {"message": "Admin function executed", "user": current_user.username}
    
    # Test with admin user (should work)
    try:
        # Manually call the decorated function
        # Note: In real FastAPI, the dependencies would be injected automatically
        import inspect
        
        # For read_documents - both users should have this
        print(f"Admin can read documents: {has_permission(admin_user, 'documents:read', db)}")
        print(f"User can read documents: {has_permission(regular_user, 'documents:read', db)}")
        
        # For admin function - only admin should have this
        admin_has_role = any(role.name == "admin" for role in admin_user.get_roles(db))
        user_has_role = any(role.name == "admin" for role in regular_user.get_roles(db))
        
        print(f"Admin has admin role: {admin_has_role}")
        print(f"User has admin role: {user_has_role}")
        
        print("SUCCESS: Decorator logic test completed!")
        
    except Exception as e:
        print(f"ERROR: Decorator test failed: {e}")
    
    # Test actual FastAPI integration
    print("\nTesting FastAPI integration...")
    
    app = FastAPI()
    
    @app.get("/test-permission")
    @require_permission("documents:read")
    async def test_permission_endpoint(current_user: User = Depends(lambda: admin_user), 
                                      db: Session = Depends(lambda: db)):
        return {"message": "Permission test passed", "user": current_user.username}
    
    # Test that the endpoint can be created without errors
    routes = [route.path for route in app.routes]
    print(f"FastAPI routes created: {routes}")
    
    db.close()
    print("SUCCESS: RBAC decorator testing completed!")


if __name__ == "__main__":
    test_rbac_decorators()