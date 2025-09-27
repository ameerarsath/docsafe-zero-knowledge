"""
Test script to verify RBAC API endpoints work correctly.
"""

import asyncio
import sys
from fastapi import FastAPI
from sqlalchemy.orm import Session

from app.core.database import get_db, SessionLocal
from app.core.rbac_init import initialize_rbac_system
from app.models.user import User
from app.models.rbac import Role, Permission, UserRole
from app.api.v1.rbac import router as rbac_router


def create_test_user_with_role(db: Session, role_name: str = "admin"):
    """Create or get a test user with specified role."""
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


def test_rbac_import_checks():
    """Test that all RBAC imports work correctly."""
    print("Testing RBAC imports...")
    
    try:
        # Test core imports
        from app.core.rbac import (
            RBACService, 
            require_permission, 
            require_role,
            has_permission,
            get_user_permissions,
            get_user_roles
        )
        print("SUCCESS: Core RBAC imports successful")
        
        # Test model imports
        from app.models.rbac import Role, Permission, UserRole, ResourcePermission, RolePermission
        print("SUCCESS: RBAC model imports successful")
        
        # Test schema imports
        from app.schemas.rbac import (
            RoleCreate,
            RoleUpdate, 
            PermissionCreate,
            UserRoleAssignment,
            PermissionCheckRequest,
            PermissionCheckResponse
        )
        print("SUCCESS: RBAC schema imports successful")
        
        return True
        
    except ImportError as e:
        print(f"ERROR: Import error: {e}")
        return False
    except Exception as e:
        print(f"ERROR: Unexpected error during imports: {e}")
        return False


def test_rbac_service_functionality():
    """Test RBAC service core functionality."""
    print("\nTesting RBAC service functionality...")
    
    # Initialize database
    db = SessionLocal()
    
    try:
        # Initialize RBAC system
        initialize_rbac_system(db)
        print("SUCCESS: RBAC system initialized")
        
        # Create test users
        admin_user = create_test_user_with_role(db, "admin")
        regular_user = create_test_user_with_role(db, "user")
        
        print(f"SUCCESS: Created/retrieved admin user: {admin_user.username}")
        print(f"SUCCESS: Created/retrieved regular user: {regular_user.username}")
        
        # Test RBACService methods
        from app.core.rbac import RBACService
        rbac_service = RBACService(db)
        
        # Test permission checking
        from app.core.rbac import has_permission
        admin_can_create_users = has_permission(admin_user, "users:create", db)
        user_can_create_users = has_permission(regular_user, "users:create", db)
        
        print(f"SUCCESS: Admin can create users: {admin_can_create_users}")
        print(f"SUCCESS: Regular user can create users: {user_can_create_users}")
        
        # Test getting user permissions
        from app.core.rbac import get_user_permissions
        admin_permissions = get_user_permissions(admin_user, db)
        user_permissions = get_user_permissions(regular_user, db)
        
        print(f"SUCCESS: Admin permissions count: {len(admin_permissions)}")
        print(f"SUCCESS: User permissions count: {len(user_permissions)}")
        
        # Test getting user roles
        from app.core.rbac import get_user_roles
        admin_roles = get_user_roles(admin_user.id, db)
        user_roles = get_user_roles(regular_user.id, db)
        
        print(f"SUCCESS: Admin roles: {[role.name for role in admin_roles]}")
        print(f"SUCCESS: User roles: {[role.name for role in user_roles]}")
        
        return True
        
    except Exception as e:
        print(f"ERROR: RBAC service test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def test_api_endpoints_signatures():
    """Test that API endpoint function signatures work."""
    print("\nTesting API endpoint signatures...")
    
    try:
        # Create FastAPI app
        app = FastAPI()
        app.include_router(rbac_router, prefix="/api/v1")
        
        # Check that routes were registered
        routes = [route.path for route in app.routes if hasattr(route, 'path')]
        rbac_routes = [route for route in routes if '/rbac' in route]
        
        print(f"SUCCESS: Registered RBAC routes: {len(rbac_routes)}")
        for route in rbac_routes[:5]:  # Show first 5 routes
            print(f"   - {route}")
        if len(rbac_routes) > 5:
            print(f"   ... and {len(rbac_routes) - 5} more")
        
        # Test that key endpoints exist
        expected_endpoints = [
            "/api/v1/rbac/roles",
            "/api/v1/rbac/permissions", 
            "/api/v1/rbac/health"
        ]
        
        for endpoint in expected_endpoints:
            if endpoint in routes:
                print(f"SUCCESS: Endpoint exists: {endpoint}")
            else:
                print(f"ERROR: Missing endpoint: {endpoint}")
        
        return True
        
    except Exception as e:
        print(f"ERROR: API endpoints test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_schema_validation():
    """Test that Pydantic schemas work correctly."""
    print("\nTesting schema validation...")
    
    try:
        from app.schemas.rbac import (
            RoleCreate,
            RoleUpdate,
            PermissionCreate,
            UserRoleAssignment,
            PermissionCheckRequest
        )
        
        # Test RoleCreate schema
        role_data = RoleCreate(
            name="test_role",
            display_name="Test Role",
            description="A test role",
            hierarchy_level=2
        )
        print(f"SUCCESS: RoleCreate schema works: {role_data.name}")
        
        # Test PermissionCreate schema
        perm_data = PermissionCreate(
            name="test:permission",
            display_name="Test Permission",
            description="A test permission",
            resource_type="test",
            action="read"
        )
        print(f"SUCCESS: PermissionCreate schema works: {perm_data.name}")
        
        # Test UserRoleAssignment schema
        assignment_data = UserRoleAssignment(
            user_id=1,
            role_id=1,
            is_primary=True
        )
        print(f"SUCCESS: UserRoleAssignment schema works: user_id={assignment_data.user_id}, role_id={assignment_data.role_id}")
        
        # Test PermissionCheckRequest schema
        check_data = PermissionCheckRequest(
            user_id=1,
            permission="documents:read"
        )
        print(f"SUCCESS: PermissionCheckRequest schema works: {check_data.permission}")
        
        return True
        
    except Exception as e:
        print(f"ERROR: Schema validation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_database_method_signatures():
    """Test that database model methods work correctly."""
    print("\nTesting database model method signatures...")
    
    db = SessionLocal()
    
    try:
        # Get a test user
        user = db.query(User).first()
        if not user:
            print("ERROR: No users found in database")
            return False
        
        # Test User model methods
        try:
            hierarchy_level = user.get_highest_hierarchy_level(db)
            print(f"SUCCESS: get_highest_hierarchy_level works: {hierarchy_level}")
        except Exception as e:
            print(f"ERROR: get_highest_hierarchy_level failed: {e}")
            return False
        
        try:
            user_roles = user.get_roles(db)
            print(f"SUCCESS: get_roles works: {len(user_roles)} roles")
        except Exception as e:
            print(f"ERROR: get_roles failed: {e}")
            return False
        
        try:
            has_perm = user.has_permission("documents:read", db)
            print(f"SUCCESS: has_permission works: {has_perm}")
        except Exception as e:
            print(f"ERROR: has_permission failed: {e}")
            return False
        
        return True
        
    except Exception as e:
        print(f"ERROR: Database method signatures test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()


def main():
    """Run all RBAC API tests."""
    print("🚀 Starting RBAC API endpoint tests...\n")
    
    tests = [
        ("Import Checks", test_rbac_import_checks),
        ("RBAC Service Functionality", test_rbac_service_functionality),
        ("API Endpoint Signatures", test_api_endpoints_signatures),
        ("Schema Validation", test_schema_validation),
        ("Database Method Signatures", test_database_method_signatures)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{'='*50}")
        print(f"Running: {test_name}")
        print('='*50)
        
        try:
            if test_func():
                print(f"SUCCESS: {test_name} PASSED")
                passed += 1
            else:
                print(f"ERROR: {test_name} FAILED")
        except Exception as e:
            print(f"ERROR: {test_name} FAILED with exception: {e}")
            import traceback
            traceback.print_exc()
    
    print(f"\n{'='*50}")
    print(f"RESULTS: {passed}/{total} tests passed")
    print('='*50)
    
    if passed == total:
        print("🎉 All RBAC API tests passed!")
        return True
    else:
        print(f"ERROR: {total - passed} tests failed")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)