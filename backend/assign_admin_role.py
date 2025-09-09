#!/usr/bin/env python3
"""
Assign admin role to rahumana user
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.core.database import SessionLocal
from app.models.user import User
from app.models.rbac import Role, UserRole


def assign_admin_role():
    """Assign admin role to rahumana user."""
    
    db = SessionLocal()
    
    try:
        # Find the user
        user = db.query(User).filter(User.username == "rahumana").first()
        if not user:
            print("[ERROR] User 'rahumana' not found")
            return False
        
        print(f"[OK] Found user: {user.username} (ID: {user.id})")
        
        # Find the admin role
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if not admin_role:
            print("[INFO] Admin role not found. Creating admin role...")
            # Create admin role if it doesn't exist
            admin_role = Role(
                name="admin",
                display_name="Administrator", 
                description="Administrative access with most permissions",
                hierarchy_level=4,
                is_system=True
            )
            db.add(admin_role)
            db.commit()
            db.refresh(admin_role)
            print(f"[OK] Created admin role (ID: {admin_role.id})")
        else:
            print(f"[OK] Found admin role (ID: {admin_role.id})")
        
        # Check if user already has admin role
        existing_assignment = db.query(UserRole).filter(
            and_(
                UserRole.user_id == user.id,
                UserRole.role_id == admin_role.id,
                UserRole.is_active == True
            )
        ).first()
        
        if existing_assignment:
            print("[OK] User already has admin role assigned")
            return True
        
        # Check if user has any existing active roles
        existing_roles = db.query(UserRole).filter(
            and_(
                UserRole.user_id == user.id,
                UserRole.is_active == True
            )
        ).all()
        
        if existing_roles:
            print(f"[INFO] User has {len(existing_roles)} existing role(s). Deactivating them...")
            for role_assignment in existing_roles:
                role_assignment.is_active = False
                print(f"   - Deactivated role ID: {role_assignment.role_id}")
        
        # Assign admin role
        user_role = UserRole(
            user_id=user.id,
            role_id=admin_role.id,
            is_primary=True,
            is_active=True,
            assigned_at=datetime.utcnow(),
            assigned_by=1  # System assignment
        )
        
        db.add(user_role)
        db.commit()
        
        print(f"[SUCCESS] Successfully assigned admin role to {user.username}")
        print(f"   - User ID: {user.id}")
        print(f"   - Role ID: {admin_role.id}")
        print(f"   - Role Name: {admin_role.name}")
        print(f"   - Hierarchy Level: {admin_role.hierarchy_level}")
        
        return True
        
    except Exception as e:
        print(f"[ERROR] Error assigning admin role: {str(e)}")
        db.rollback()
        return False
        
    finally:
        db.close()


def verify_assignment():
    """Verify the role assignment was successful."""
    
    db = SessionLocal()
    
    try:
        # Find the user
        user = db.query(User).filter(User.username == "rahumana").first()
        if not user:
            print("[ERROR] User not found during verification")
            return False
        
        # Get user's active roles
        active_roles = db.query(UserRole).join(Role).filter(
            and_(
                UserRole.user_id == user.id,
                UserRole.is_active == True
            )
        ).all()
        
        print(f"\n[VERIFICATION] Results for {user.username}:")
        print(f"   - User ID: {user.id}")
        print(f"   - Active Roles: {len(active_roles)}")
        
        for user_role in active_roles:
            role = db.query(Role).filter(Role.id == user_role.role_id).first()
            if role:
                print(f"   - Role: {role.name} ({role.display_name})")
                print(f"     * Hierarchy Level: {role.hierarchy_level}")
                print(f"     * Is Primary: {user_role.is_primary}")
                print(f"     * Assigned At: {user_role.assigned_at}")
        
        # Check if admin role is assigned
        has_admin = any(
            db.query(Role).filter(Role.id == ur.role_id).first().name == "admin"
            for ur in active_roles
        )
        
        if has_admin:
            print("[SUCCESS] Admin role is properly assigned!")
            return True
        else:
            print("[FAILED] Admin role is not assigned!")
            return False
            
    except Exception as e:
        print(f"[ERROR] Error during verification: {str(e)}")
        return False
        
    finally:
        db.close()


if __name__ == "__main__":
    print("Assigning admin role to rahumana...")
    print("=" * 50)
    
    success = assign_admin_role()
    
    if success:
        print("\nVerifying assignment...")
        print("=" * 50)
        verify_assignment()
    
    print("\nRole assignment process completed!")