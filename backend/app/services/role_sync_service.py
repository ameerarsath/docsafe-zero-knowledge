"""
Role Synchronization Service

Ensures consistency between users.role and user_roles table assignments.
Prevents role display mismatches by providing centralized role management.
"""

from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import text
from ..models.user import User
from ..models.rbac import Role, UserRole
from ..core.database import get_db
import logging

logger = logging.getLogger(__name__)

class RoleSyncService:
    """Service for managing role synchronization and consistency"""

    @staticmethod
    def sync_user_role(db: Session, user_id: int) -> Optional[str]:
        """
        Synchronize a user's role field with their active role assignments.

        Args:
            db: Database session
            user_id: ID of the user to sync

        Returns:
            The synchronized role name, or None if no active roles found
        """
        try:
            # Get the user's primary or highest role assignment
            role_assignment = db.execute(text("""
                SELECT r.name as role_name
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = :user_id
                  AND ur.is_active = true
                ORDER BY ur.is_primary DESC, r.hierarchy_level DESC, ur.assigned_at DESC
                LIMIT 1
            """), {'user_id': user_id}).fetchone()

            if role_assignment:
                new_role = role_assignment.role_name

                # Update the users table
                db.execute(text("""
                    UPDATE users
                    SET role = :new_role, updated_at = CURRENT_TIMESTAMP
                    WHERE id = :user_id
                """), {'new_role': new_role, 'user_id': user_id})

                logger.info(f"Synchronized user {user_id} role to {new_role}")
                return new_role
            else:
                # No active roles, set to default viewer
                db.execute(text("""
                    UPDATE users
                    SET role = 'viewer', updated_at = CURRENT_TIMESTAMP
                    WHERE id = :user_id
                """), {'user_id': user_id})

                logger.warning(f"User {user_id} has no active roles, set to viewer")
                return 'viewer'

        except Exception as e:
            logger.error(f"Failed to sync role for user {user_id}: {e}")
            return None

    @staticmethod
    def sync_all_users(db: Session) -> int:
        """
        Synchronize roles for all active users.

        Args:
            db: Database session

        Returns:
            Number of users synchronized
        """
        try:
            # Get all active users
            users = db.execute(text("""
                SELECT id, username FROM users WHERE is_active = true
            """)).fetchall()

            sync_count = 0
            for user in users:
                if RoleSyncService.sync_user_role(db, user.id):
                    sync_count += 1

            logger.info(f"Synchronized roles for {sync_count} users")
            return sync_count

        except Exception as e:
            logger.error(f"Failed to sync all user roles: {e}")
            return 0

    @staticmethod
    def assign_role_with_sync(db: Session, user_id: int, role_name: str,
                             assigned_by: int, is_primary: bool = False) -> bool:
        """
        Assign a role to a user and automatically sync the users.role field.

        Args:
            db: Database session
            user_id: ID of the user
            role_name: Name of the role to assign
            assigned_by: ID of the user making the assignment
            is_primary: Whether this should be the primary role

        Returns:
            True if successful, False otherwise
        """
        try:
            # Get role ID
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                logger.error(f"Role {role_name} not found")
                return False

            # If this is primary, unset other primary roles first
            if is_primary:
                db.execute(text("""
                    UPDATE user_roles
                    SET is_primary = false
                    WHERE user_id = :user_id AND is_active = true
                """), {'user_id': user_id})

            # Create or update role assignment
            existing = db.query(UserRole).filter(
                UserRole.user_id == user_id,
                UserRole.role_id == role.id
            ).first()

            if existing:
                existing.is_active = True
                existing.is_primary = is_primary
                db.add(existing)
            else:
                new_assignment = UserRole(
                    user_id=user_id,
                    role_id=role.id,
                    assigned_by=assigned_by,
                    is_primary=is_primary,
                    is_active=True
                )
                db.add(new_assignment)

            # Commit the assignment
            db.commit()

            # Sync the user's role field (trigger will also do this, but ensure it's done)
            RoleSyncService.sync_user_role(db, user_id)
            db.commit()

            logger.info(f"Assigned role {role_name} to user {user_id} with sync")
            return True

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to assign role {role_name} to user {user_id}: {e}")
            return False

    @staticmethod
    def remove_role_with_sync(db: Session, user_id: int, role_name: str) -> bool:
        """
        Remove a role assignment and sync the user's role field.

        Args:
            db: Database session
            user_id: ID of the user
            role_name: Name of the role to remove

        Returns:
            True if successful, False otherwise
        """
        try:
            # Get role ID
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                logger.error(f"Role {role_name} not found")
                return False

            # Deactivate the role assignment
            db.execute(text("""
                UPDATE user_roles
                SET is_active = false
                WHERE user_id = :user_id AND role_id = :role_id
            """), {'user_id': user_id, 'role_id': role.id})

            db.commit()

            # Sync the user's role field
            RoleSyncService.sync_user_role(db, user_id)
            db.commit()

            logger.info(f"Removed role {role_name} from user {user_id} with sync")
            return True

        except Exception as e:
            db.rollback()
            logger.error(f"Failed to remove role {role_name} from user {user_id}: {e}")
            return False

    @staticmethod
    def validate_user_role_consistency(db: Session, user_id: int) -> dict:
        """
        Validate that a user's role field matches their role assignments.

        Args:
            db: Database session
            user_id: ID of the user to validate

        Returns:
            Dictionary with validation results
        """
        try:
            # Get user's current role
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                return {'valid': False, 'error': 'User not found'}

            current_role = user.role

            # Get expected role from assignments
            expected_role_result = db.execute(text("""
                SELECT r.name as role_name
                FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                WHERE ur.user_id = :user_id
                  AND ur.is_active = true
                ORDER BY ur.is_primary DESC, r.hierarchy_level DESC, ur.assigned_at DESC
                LIMIT 1
            """), {'user_id': user_id}).fetchone()

            expected_role = expected_role_result.role_name if expected_role_result else 'viewer'

            is_consistent = current_role == expected_role

            return {
                'valid': is_consistent,
                'user_id': user_id,
                'username': user.username,
                'current_role': current_role,
                'expected_role': expected_role,
                'consistent': is_consistent
            }

        except Exception as e:
            logger.error(f"Failed to validate role consistency for user {user_id}: {e}")
            return {'valid': False, 'error': str(e)}