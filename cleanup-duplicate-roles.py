#!/usr/bin/env python3
"""
Script to clean up duplicate role assignments and enforce single role policy.
This script will keep only the most recent role assignment for each user.
"""

import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.core.config import settings
from app.models.rbac import UserRole

def main():
    """Clean up duplicate role assignments."""
    print("Starting duplicate role cleanup...")

    # Create database connection
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Find users with multiple role assignments
        query = text("""
            SELECT user_id, COUNT(*) as role_count
            FROM user_roles
            GROUP BY user_id
            HAVING COUNT(*) > 1
            ORDER BY user_id
        """)

        result = db.execute(query)
        duplicate_users = result.fetchall()

        print(f"Found {len(duplicate_users)} users with multiple role assignments:")

        total_cleaned = 0

        for user_id, role_count in duplicate_users:
            print(f"\nUser ID {user_id} has {role_count} role assignments")

            # Get all role assignments for this user, ordered by assigned_at DESC
            user_roles = db.query(UserRole).filter(
                UserRole.user_id == user_id
            ).order_by(UserRole.assigned_at.desc()).all()

            if len(user_roles) > 1:
                # Keep the most recent assignment (first in desc order)
                keep_role = user_roles[0]
                remove_roles = user_roles[1:]

                print(f"  Keeping: Role ID {keep_role.role_id} (assigned at {keep_role.assigned_at})")
                print(f"  Removing {len(remove_roles)} older assignments:")

                for role in remove_roles:
                    print(f"    - Role ID {role.role_id} (assigned at {role.assigned_at})")
                    db.delete(role)
                    total_cleaned += 1

        # Commit all changes
        db.commit()
        print(f"\nCleanup completed successfully!")
        print(f"Total duplicate assignments removed: {total_cleaned}")

        # Verify cleanup
        result = db.execute(text("""
            SELECT user_id, COUNT(*) as role_count
            FROM user_roles
            GROUP BY user_id
            HAVING COUNT(*) > 1
        """))

        remaining_duplicates = result.fetchall()
        if remaining_duplicates:
            print(f"WARNING: {len(remaining_duplicates)} users still have multiple roles!")
        else:
            print("✓ All users now have exactly one role assignment.")

    except Exception as e:
        print(f"Error during cleanup: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()