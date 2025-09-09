#!/usr/bin/env python3
"""
Test rahumana's admin permissions via API
"""

import os
import sys
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

import requests
import json

# API base URL
API_BASE = "http://localhost:8002/api"

def test_user_login():
    """Test user login and get token."""
    
    print("1. Testing user login...")
    
    login_data = {
        "username": "rahumana",  # Should be the actual username
        "password": "TestPass123@"  # Should be the actual password
    }
    
    try:
        response = requests.post(f"{API_BASE}/auth/login", json=login_data)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   [OK] Login successful")
            print(f"   - User ID: {data.get('user', {}).get('id')}")
            print(f"   - Username: {data.get('user', {}).get('username')}")
            print(f"   - Role: {data.get('user', {}).get('role')}")
            return data.get('access_token')
        else:
            print(f"   [FAIL] Login failed: {response.status_code}")
            print(f"   - Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"   [ERROR] Login error: {str(e)}")
        return None


def test_user_permissions(token):
    """Test user permissions via RBAC API."""
    
    print("2. Testing user permissions...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        # Get current user permissions
        response = requests.get(f"{API_BASE}/v1/rbac/users/me/permissions", headers=headers)
        
        if response.status_code == 200:
            permissions = response.json()
            print(f"   [OK] Got user permissions ({len(permissions)} total)")
            print("   - Permissions:")
            for perm in sorted(permissions):
                print(f"     * {perm}")
            
            # Check for admin permissions
            admin_perms = [p for p in permissions if any(x in p for x in ['admin', 'users:', 'roles:', 'system:'])]
            print(f"\n   - Admin-level permissions ({len(admin_perms)}):")
            for perm in admin_perms:
                print(f"     * {perm}")
                
            return permissions
        else:
            print(f"   [FAIL] Failed to get permissions: {response.status_code}")
            print(f"   - Response: {response.text}")
            return []
            
    except Exception as e:
        print(f"   [ERROR] Permissions error: {str(e)}")
        return []


def test_rbac_access(token):
    """Test access to RBAC endpoints."""
    
    print("3. Testing RBAC endpoint access...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    test_endpoints = [
        ("GET", "/v1/rbac/roles", "List roles"),
        ("GET", "/v1/rbac/permissions", "List permissions"),
        ("GET", "/v1/rbac/system/permission-matrix", "Permission matrix")
    ]
    
    for method, endpoint, description in test_endpoints:
        try:
            if method == "GET":
                response = requests.get(f"{API_BASE}{endpoint}", headers=headers)
            
            if response.status_code == 200:
                print(f"   [OK] {description}: Success")
            elif response.status_code == 403:
                print(f"   [FAIL] {description}: Access Denied (403)")
            else:
                print(f"   ? {description}: Status {response.status_code}")
                
        except Exception as e:
            print(f"   [ERROR] {description}: Error - {str(e)}")


def test_user_roles(token):
    """Test user's role assignments."""
    
    print("4. Testing user role assignments...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        # First get current user info
        response = requests.get(f"{API_BASE}/auth/me", headers=headers)
        if response.status_code == 200:
            user_data = response.json()
            user_id = user_data.get('id')
            print(f"   [OK] Current user ID: {user_id}")
            
            # Get user roles
            response = requests.get(f"{API_BASE}/v1/rbac/users/{user_id}/roles", headers=headers)
            if response.status_code == 200:
                roles_data = response.json()
                user_roles = roles_data.get('user_roles', [])
                print(f"   [OK] Found {len(user_roles)} role assignments:")
                
                for role_assignment in user_roles:
                    role = role_assignment.get('role', {})
                    print(f"     * Role: {role.get('name')} ({role.get('display_name')})")
                    print(f"       - Hierarchy Level: {role.get('hierarchy_level')}")
                    print(f"       - Is Primary: {role_assignment.get('is_primary')}")
                    print(f"       - Is Active: {role_assignment.get('is_active')}")
                    
                return user_roles
            else:
                print(f"   [FAIL] Failed to get user roles: {response.status_code}")
        else:
            print(f"   [FAIL] Failed to get user info: {response.status_code}")
            
    except Exception as e:
        print(f"   [ERROR] User roles error: {str(e)}")
        
    return []


def main():
    """Run all tests."""
    
    print("Testing rahumana's admin permissions")
    print("=" * 50)
    
    # Test login
    token = test_user_login()
    if not token:
        print("\n[FAIL] Cannot proceed without valid token")
        return
    
    print()
    
    # Test permissions
    permissions = test_user_permissions(token)
    print()
    
    # Test role assignments
    user_roles = test_user_roles(token)
    print()
    
    # Test RBAC access
    test_rbac_access(token)
    print()
    
    # Summary
    print("Summary:")
    print("=" * 20)
    
    has_admin_role = any(role.get('role', {}).get('name') == 'admin' for role in user_roles)
    has_admin_permissions = any('admin' in p or 'users:' in p or 'roles:' in p for p in permissions)
    
    if has_admin_role:
        print("[OK] User has admin role assigned")
    else:
        print("[FAIL] User does NOT have admin role")
        
    if has_admin_permissions:
        print("[OK] User has admin-level permissions")
    else:
        print("[FAIL] User does NOT have admin permissions")
        
    if has_admin_role and has_admin_permissions:
        print("\n[SUCCESS] rahumana has proper admin access!")
        print("   The issue may be in the frontend permission checking.")
    else:
        print("\n[ISSUE] rahumana does not have proper admin setup.")


if __name__ == "__main__":
    main()