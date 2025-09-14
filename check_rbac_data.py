#!/usr/bin/env python3
"""
Check RBAC data in the database and initialize if needed
"""

import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app.core.database import SessionLocal
from backend.app.models.rbac import Role, Permission, RolePermission, UserRole
from backend.app.core.rbac import initialize_default_permissions

def check_and_initialize_rbac():
    """Check RBAC data and initialize if needed."""
    db = SessionLocal()
    
    try:
        print("Checking RBAC database state...")
        
        # Check roles
        roles = db.query(Role).all()
        print(f"Found {len(roles)} roles:")
        for role in roles:
            print(f"  - {role.name} (level {role.hierarchy_level}): {role.display_name}")
        
        # Check permissions  
        permissions = db.query(Permission).all()
        print(f"Found {len(permissions)} permissions:")
        for perm in permissions[:10]:  # Show first 10
            print(f"  - {perm.name}: {perm.description}")
        if len(permissions) > 10:
            print(f"  ... and {len(permissions) - 10} more")
        
        # Check role-permission mappings
        role_permissions = db.query(RolePermission).all()
        print(f"Found {len(role_permissions)} role-permission mappings")
        
        # Check user-role assignments
        user_roles = db.query(UserRole).all()
        print(f"Found {len(user_roles)} user-role assignments")
        
        # Initialize default permissions if none exist
        if len(permissions) == 0:
            print("\nNo permissions found, initializing default permissions...")
            initialize_default_permissions(db)
            
            # Check again
            permissions = db.query(Permission).all()
            print(f"Initialized {len(permissions)} default permissions")
        
        # Create default roles if none exist
        if len(roles) == 0:
            print("\nNo roles found, creating default roles...")
            
            default_roles = [
                ('viewer', 'Viewer', 'Can view documents', 1),
                ('user', 'User', 'Can create and manage own documents', 2),
                ('manager', 'Manager', 'Can manage team documents and users', 3),
                ('admin', 'Administrator', 'Can manage all resources except super admin functions', 4),
                ('super_admin', 'Super Administrator', 'Full system access', 5)
            ]
            
            for name, display_name, description, level in default_roles:
                role = Role(
                    name=name,
                    display_name=display_name,
                    description=description,
                    hierarchy_level=level,
                    is_system=True
                )
                db.add(role)
            
            db.commit()
            
            # Check again
            roles = db.query(Role).all()
            print(f"Created {len(roles)} default roles")
        
        # Assign default permissions to roles if no mappings exist
        if len(role_permissions) == 0:
            print("\nNo role-permission mappings found, creating default assignments...")
            
            # Get roles and permissions
            roles_dict = {role.name: role for role in db.query(Role).all()}
            permissions_dict = {perm.name: perm for perm in db.query(Permission).all()}
            
            # Default role-permission matrix
            role_permission_matrix = {
                'viewer': ['documents:read'],
                'user': ['documents:read', 'documents:create', 'documents:update', 'documents:delete'],
                'manager': ['documents:read', 'documents:create', 'documents:update', 'documents:delete', 'users:read'],
                'admin': ['documents:read', 'documents:create', 'documents:update', 'documents:delete', 
                         'users:read', 'users:create', 'users:update', 'roles:read'],
                'super_admin': ['documents:read', 'documents:create', 'documents:update', 'documents:delete',
                              'users:read', 'users:create', 'users:update', 'users:delete',
                              'roles:read', 'roles:create', 'roles:update', 'roles:delete', 'system:admin']
            }
            
            for role_name, permission_names in role_permission_matrix.items():
                if role_name in roles_dict:
                    role = roles_dict[role_name]
                    for perm_name in permission_names:
                        if perm_name in permissions_dict:
                            permission = permissions_dict[perm_name]
                            role_perm = RolePermission(
                                role_id=role.id,
                                permission_id=permission.id
                            )
                            db.add(role_perm)
            
            db.commit()
            
            # Check again
            role_permissions = db.query(RolePermission).all()
            print(f"Created {len(role_permissions)} role-permission mappings")
        
        print("\nRBAC system initialized successfully!")
        return True
        
    except Exception as e:
        print(f"Error checking RBAC data: {e}")
        db.rollback()
        return False
        
    finally:
        db.close()

if __name__ == "__main__":
    success = check_and_initialize_rbac()
    sys.exit(0 if success else 1)