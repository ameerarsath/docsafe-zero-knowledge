#!/usr/bin/env python3

"""
User Role Synchronization Utility

This script synchronizes the role field in the users table with the
active role assignments in the user_roles table. This fixes issues
where the displayed role doesn't match the assigned role.

Usage:
    python scripts/sync-user-roles.py [username]

If no username is provided, it will check all users.
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import argparse

# Database configuration
DATABASE_URL = "postgresql://securevault_user:securevault_password@localhost:5430/securevault"

def sync_user_roles(target_username=None):
    try:
        # Create database connection
        engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        print("🔧 User Role Synchronization Utility")
        print("=" * 50)

        # Build query based on target
        if target_username:
            print(f"Target user: {target_username}\n")
            users_query = """
                SELECT id, username, role, is_active
                FROM users
                WHERE username = :username
            """
            users = db.execute(text(users_query), {'username': target_username}).fetchall()
        else:
            print("Checking all users\n")
            users_query = """
                SELECT id, username, role, is_active
                FROM users
                WHERE is_active = true
                ORDER BY username
            """
            users = db.execute(text(users_query)).fetchall()

        if not users:
            print(f"❌ No users found {f'with username \"{target_username}\"' if target_username else ''}")
            return

        fixed_count = 0
        total_checked = 0

        for user in users:
            total_checked += 1
            user_id = user.id
            username = user.username
            current_role = user.role

            print(f"Checking user: {username}")
            print(f"  Current role: {current_role}")

            # Get active role assignments
            assignments = db.execute(text("""
                SELECT ur.role_id, r.name as role_name, r.display_name, r.hierarchy_level,
                       ur.is_primary, ur.assigned_at
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = :user_id AND ur.is_active = true
                ORDER BY ur.is_primary DESC, r.hierarchy_level DESC, ur.assigned_at DESC
            """), {'user_id': user_id}).fetchall()

            if assignments:
                # Determine the correct role (primary first, then highest hierarchy)
                primary_role = None
                highest_role = None

                for assignment in assignments:
                    if assignment.is_primary:
                        primary_role = assignment
                        break
                    if highest_role is None:
                        highest_role = assignment

                expected_assignment = primary_role or highest_role
                expected_role = expected_assignment.role_name

                print(f"  Expected role: {expected_role} (Level {expected_assignment.hierarchy_level})")

                if current_role != expected_role:
                    print(f"  🔄 FIXING: Updating role from '{current_role}' to '{expected_role}'")

                    db.execute(text("""
                        UPDATE users
                        SET role = :new_role, updated_at = CURRENT_TIMESTAMP
                        WHERE id = :user_id
                    """), {
                        'new_role': expected_role,
                        'user_id': user_id
                    })

                    fixed_count += 1
                    print(f"  ✅ Updated successfully")
                else:
                    print(f"  ✅ Already correct")
            else:
                print(f"  ⚠️  No active role assignments found")

            print()  # Empty line for readability

        # Commit all changes
        if fixed_count > 0:
            db.commit()
            print(f"💾 Committed {fixed_count} role updates")

        print("📊 Summary:")
        print(f"  Users checked: {total_checked}")
        print(f"  Roles fixed: {fixed_count}")
        print(f"  Status: {'✅ All synchronized' if fixed_count == 0 else '🔧 Synchronization complete'}")

        db.close()

    except Exception as e:
        print(f"❌ Error: {e}")
        return False

    return True

def main():
    parser = argparse.ArgumentParser(description='Synchronize user roles between users table and role assignments')
    parser.add_argument('username', nargs='?', help='Username to sync (optional, syncs all if not provided)')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be changed without making changes')

    args = parser.parse_args()

    if args.dry_run:
        print("⚠️  DRY RUN MODE - No changes will be made\n")

    success = sync_user_roles(args.username)
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()