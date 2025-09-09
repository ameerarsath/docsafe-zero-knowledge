#!/usr/bin/env python3
"""
Initialize RBAC System for DocSafe
Creates roles, permissions, and assigns them to users.
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.core.database import SessionLocal, engine
from app.models.user import User
from app.models.rbac import Role, Permission, RolePermission, UserRole


def create_permissions(db: Session):
    """Create all necessary permissions."""
    permissions_data = [
        # Document permissions
        {"name": "documents:create", "description": "Create and upload documents"},
        {"name": "documents:read", "description": "View and download documents"},
        {"name": "documents:update", "description": "Edit document metadata"},
        {"name": "documents:delete", "description": "Delete documents"},
        {"name": "documents:share", "description": "Share documents with others"},
        
        # Folder permissions
        {"name": "folders:create", "description": "Create folders"},
        {"name": "folders:read", "description": "View folders"},
        {"name": "folders:update", "description": "Edit folders"},
        {"name": "folders:delete", "description": "Delete folders"},
        
        # User management permissions
        {"name": "users:create", "description": "Create new users"},
        {"name": "users:read", "description": "View users"},
        {"name": "users:update", "description": "Edit users"},
        {"name": "users:delete", "description": "Delete users"},
        
        # Role management permissions
        {"name": "roles:create", "description": "Create roles"},
        {"name": "roles:read", "description": "View roles"},
        {"name": "roles:update", "description": "Edit roles"},
        {"name": "roles:delete", "description": "Delete roles"},
        {"name": "roles:assign", "description": "Assign roles to users"},
        
        # System permissions
        {"name": "system:admin", "description": "System administration access"},
        {"name": "system:audit", "description": "View audit logs"},
        {"name": "system:security", "description": "Manage security settings"},
        
        # MFA permissions
        {"name": "mfa:manage", "description": "Manage MFA settings"},
        {"name": "mfa:bypass", "description": "Bypass MFA requirements"},
        
        # Encryption permissions
        {"name": "encryption:manage", "description": "Manage encryption settings"},
        {"name": "encryption:keys", "description": "Manage encryption keys"},
    ]
    
    created_permissions = []
    
    for perm_data in permissions_data:
        # Check if permission already exists
        existing_perm = db.query(Permission).filter(Permission.name == perm_data["name"]).first()
        if not existing_perm:
            permission = Permission(**perm_data)
            db.add(permission)
            created_permissions.append(perm_data["name"])
    
    db.commit()
    print(f"[INFO] Created {len(created_permissions)} permissions")
    return created_permissions


def create_roles(db: Session):
    """Create all necessary roles."""
    roles_data = [
        {
            "name": "super_admin",
            "display_name": "Super Administrator",
            "description": "Full system access with all permissions"
        },
        {
            "name": "admin", 
            "display_name": "Administrator",
            "description": "Administrative access with most permissions"
        },
        {
            "name": "manager",
            "display_name": "Manager", 
            "description": "Team management with document and user permissions"
        },
        {
            "name": "user",
            "display_name": "User",
            "description": "Standard user with document access"
        },
        {
            "name": "viewer",
            "display_name": "Viewer",
            "description": "Read-only access to documents"
        }
    ]
    
    created_roles = []
    
    for role_data in roles_data:
        # Check if role already exists
        existing_role = db.query(Role).filter(Role.name == role_data["name"]).first()
        if not existing_role:
            role = Role(**role_data)
            db.add(role)
            created_roles.append(role_data["name"])
    
    db.commit()
    print(f"[INFO] Created {len(created_roles)} roles")
    return created_roles


def assign_permissions_to_roles(db: Session):
    """Assign permissions to roles based on hierarchy."""
    
    # Define role permission mappings
    role_permissions = {
        "super_admin": [
            # All permissions
            "documents:create", "documents:read", "documents:update", "documents:delete", "documents:share",
            "folders:create", "folders:read", "folders:update", "folders:delete",
            "users:create", "users:read", "users:update", "users:delete",
            "roles:create", "roles:read", "roles:update", "roles:delete", "roles:assign",
            "system:admin", "system:audit", "system:security",
            "mfa:manage", "mfa:bypass",
            "encryption:manage", "encryption:keys"
        ],
        "admin": [
            # Most permissions except super admin specific ones
            "documents:create", "documents:read", "documents:update", "documents:delete", "documents:share",
            "folders:create", "folders:read", "folders:update", "folders:delete",
            "users:create", "users:read", "users:update", "users:delete",
            "roles:read", "roles:assign",
            "system:audit", "system:security",
            "mfa:manage",
            "encryption:manage"
        ],
        "manager": [
            # Document and basic user management
            "documents:create", "documents:read", "documents:update", "documents:delete", "documents:share",
            "folders:create", "folders:read", "folders:update", "folders:delete",
            "users:read", "users:update",
            "roles:read",
            "mfa:manage"
        ],
        "user": [
            # Basic document operations
            "documents:create", "documents:read", "documents:update", "documents:delete", "documents:share",
            "folders:create", "folders:read", "folders:update", "folders:delete"
        ],
        "viewer": [
            # Read-only access
            "documents:read",
            "folders:read"
        ]
    }
    
    assignments_made = 0
    
    for role_name, permission_names in role_permissions.items():
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            print(f"[WARNING] Role '{role_name}' not found, skipping permission assignment")
            continue
            
        for perm_name in permission_names:
            permission = db.query(Permission).filter(Permission.name == perm_name).first()
            if not permission:
                print(f"[WARNING] Permission '{perm_name}' not found, skipping")
                continue
                
            # Check if role already has this permission
            existing_assignment = db.query(RolePermission).filter(
                and_(RolePermission.role_id == role.id, RolePermission.permission_id == permission.id)
            ).first()
            
            if not existing_assignment:
                role_permission = RolePermission(role_id=role.id, permission_id=permission.id)
                db.add(role_permission)
                assignments_made += 1
    
    db.commit()
    print(f"[INFO] Made {assignments_made} role-permission assignments")


def assign_roles_to_users(db: Session):
    """Assign roles to existing users."""
    
    # Find admin user and assign admin role
    admin_user = db.query(User).filter(User.username == "admin").first()
    if admin_user:
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if admin_role:
            # Check if user already has this role
            existing_assignment = db.query(UserRole).filter(
                and_(UserRole.user_id == admin_user.id, UserRole.role_id == admin_role.id)
            ).first()
            
            if not existing_assignment:
                user_role = UserRole(
                    user_id=admin_user.id,
                    role_id=admin_role.id,
                    is_primary=True,
                    is_active=True
                )
                db.add(user_role)
                print(f"[INFO] Assigned 'admin' role to user 'admin'")
            else:
                print(f"[INFO] User 'admin' already has 'admin' role")
    
    # Find rahumana user and assign admin role if exists
    rahumana_user = db.query(User).filter(User.username == "rahumana").first()
    if rahumana_user:
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if admin_role:
            existing_assignment = db.query(UserRole).filter(
                and_(UserRole.user_id == rahumana_user.id, UserRole.role_id == admin_role.id)
            ).first()
            
            if not existing_assignment:
                user_role = UserRole(
                    user_id=rahumana_user.id,
                    role_id=admin_role.id,
                    is_primary=True,
                    is_active=True
                )
                db.add(user_role)
                print(f"[INFO] Assigned 'admin' role to user 'rahumana'")
            else:
                print(f"[INFO] User 'rahumana' already has 'admin' role")
    
    db.commit()


def main():
    """Initialize RBAC system."""
    print("[INFO] Starting RBAC initialization...")
    print("=" * 50)
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Create permissions
        print("[INFO] Creating permissions...")
        created_permissions = create_permissions(db)
        
        # Create roles
        print("[INFO] Creating roles...")
        created_roles = create_roles(db)
        
        # Assign permissions to roles
        print("[INFO] Assigning permissions to roles...")
        assign_permissions_to_roles(db)
        
        # Assign roles to users
        print("[INFO] Assigning roles to users...")
        assign_roles_to_users(db)
        
        print("=" * 50)
        print("[SUCCESS] RBAC initialization completed successfully!")
        print()
        print("Roles created:")
        roles = db.query(Role).all()
        for role in roles:
            perm_count = db.query(RolePermission).filter(RolePermission.role_id == role.id).count()
            print(f"  - {role.name} (level {role.hierarchy_level}) - {perm_count} permissions")
        
        print()
        print("Admin users with roles:")
        admin_users = db.query(User).filter(User.username.in_(["admin", "rahumana"])).all()
        for user in admin_users:
            user_roles = db.query(Role).join(UserRole).filter(
                and_(UserRole.user_id == user.id, UserRole.is_active == True)
            ).all()
            role_names = [role.name for role in user_roles]
            print(f"  - {user.username}: {', '.join(role_names) if role_names else 'No roles'}")
        
    except Exception as e:
        print(f"[ERROR] Error during RBAC initialization: {e}")
        db.rollback()
        return False
    finally:
        db.close()
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)