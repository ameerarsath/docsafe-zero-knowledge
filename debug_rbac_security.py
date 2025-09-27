#!/usr/bin/env python3
"""
Debug script to verify RBAC security permissions in the database.
"""

import os
import sys
import requests
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine, text
from app.core.config import settings
from app.models.rbac import Role, Permission, RolePermission, UserRole
from app.models.user import User

def verify_rbac_security_permissions():
    """Verify that security permissions are properly set up in RBAC system."""

    # Database connection
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        print("RBAC Security Permissions Debug Report")
        print("=" * 50)

        # 1. Check if security permissions exist
        print("\n1. Security Permissions in Database:")
        security_permissions = db.query(Permission).filter(
            Permission.resource_type == "security"
        ).all()

        if security_permissions:
            for perm in security_permissions:
                print(f"   [OK] {perm.name} - {perm.display_name}")
        else:
            print("   [ERROR] NO security permissions found!")

        # 2. Check roles
        print("\n2. Available Roles:")
        roles = db.query(Role).all()
        for role in roles:
            print(f"   {role.name} (level {role.hierarchy_level}) - {role.display_name}")

        # 3. Check role-permission assignments for security
        print("\n3. Security Permission Assignments:")
        for role in roles:
            security_role_perms = db.query(RolePermission).join(Permission).filter(
                RolePermission.role_id == role.id,
                Permission.resource_type == "security"
            ).all()

            if security_role_perms:
                print(f"   [SECURITY] {role.name}:")
                for rp in security_role_perms:
                    perm = db.query(Permission).filter(Permission.id == rp.permission_id).first()
                    print(f"      - {perm.name}")
            else:
                print(f"   [NO PERMS] {role.name}: NO security permissions")

        # 4. Check test user role assignments
        print("\n4. Test User Role Assignments:")
        test_user = db.query(User).filter(User.username == "rahumana").first()
        if test_user:
            user_roles = db.query(UserRole).filter(UserRole.user_id == test_user.id).all()
            if user_roles:
                for ur in user_roles:
                    role = db.query(Role).filter(Role.id == ur.role_id).first()
                    print(f"   [USER] {test_user.username} -> {role.name} (primary: {ur.is_primary})")
            else:
                print(f"   [ERROR] {test_user.username}: NO roles assigned!")
        else:
            print("   [ERROR] Test user 'rahumana' not found!")

        # 5. Check specific security permissions for super_admin role
        print("\n5. Super Admin Security Permissions Check:")
        super_admin_role = db.query(Role).filter(Role.name == "super_admin").first()
        if super_admin_role:
            super_admin_security_perms = db.query(RolePermission).join(Permission).filter(
                RolePermission.role_id == super_admin_role.id,
                Permission.resource_type == "security"
            ).all()

            if super_admin_security_perms:
                print("   [OK] Super admin has security permissions:")
                for rp in super_admin_security_perms:
                    perm = db.query(Permission).filter(Permission.id == rp.permission_id).first()
                    print(f"      - {perm.name}")
            else:
                print("   [ERROR] Super admin has NO security permissions!")
        else:
            print("   [ERROR] Super admin role not found!")

        print("\n" + "=" * 50)

    except Exception as e:
        print(f"[ERROR] Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


def test_security_endpoints():
    """Test security endpoints directly with API calls."""

    print("\nTesting Security Endpoints")
    print("=" * 40)

    base_url = "http://localhost:8002"

    try:
        # 1. Test login first to get a token
        login_data = {
            "username": "rahumana",
            "password": "TestPass123@"
        }

        print("1. Attempting login...")
        login_response = requests.post(f"{base_url}/api/auth/login", json=login_data)

        if login_response.status_code == 200:
            token_data = login_response.json()
            access_token = token_data.get("access_token")
            print(f"   [OK] Login successful, token: {access_token[:20]}...")

            # 2. Test security dashboard endpoint
            headers = {"Authorization": f"Bearer {access_token}"}

            print("\n2. Testing security dashboard endpoint...")
            dashboard_response = requests.get(
                f"{base_url}/api/v1/security/dashboard?hours=24",
                headers=headers
            )
            print(f"   [STATUS] Dashboard response: {dashboard_response.status_code}")
            if dashboard_response.status_code != 200:
                print(f"   [ERROR] Error: {dashboard_response.text}")
            else:
                print("   [OK] Dashboard endpoint working!")

            # 3. Test security metrics endpoint
            print("\n3. Testing security metrics endpoint...")
            metrics_response = requests.get(
                f"{base_url}/api/v1/security/metrics?days=7",
                headers=headers
            )
            print(f"   [STATUS] Metrics response: {metrics_response.status_code}")
            if metrics_response.status_code != 200:
                print(f"   [ERROR] Error: {metrics_response.text}")
            else:
                print("   [OK] Metrics endpoint working!")

        else:
            print(f"   [ERROR] Login failed: {login_response.status_code} - {login_response.text}")

    except Exception as e:
        print(f"[ERROR] Network error: {e}")


if __name__ == "__main__":
    verify_rbac_security_permissions()
    test_security_endpoints()