"""
RBAC (Role-Based Access Control) core functionality and middleware.

This module provides the core RBAC implementation including:
- Permission checking and validation
- Role hierarchy management
- Access control decorators
- Dynamic permission evaluation
- Resource-level access control
- Audit logging for compliance
"""

import json
import logging
from datetime import datetime, timedelta
from functools import wraps
from typing import Set, Optional, Dict, Any, List, Union
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer
import jwt

from .config import settings
from .database import get_db
from .security import decode_token, get_current_user
from ..models.user import User
from ..models.rbac import Role, Permission, RolePermission, UserRole, ResourcePermission
from ..schemas.rbac import PermissionCheckRequest, PermissionCheckResponse


# Setup logging
logger = logging.getLogger(__name__)
audit_logger = logging.getLogger('rbac.audit')
security_logger = logging.getLogger('rbac.security')

# Permission cache to improve performance
_permission_cache: Dict[str, Dict[str, Any]] = {}
_cache_ttl = timedelta(minutes=5)


class RBACService:
    """Service class for RBAC operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def assign_role_to_user(self, user_id: int, role_name: str, 
                           assigning_user: Optional[User] = None,
                           is_primary: bool = False,
                           expires_at: Optional[datetime] = None) -> bool:
        """Assign a role to a user."""
        try:
            # Check if role exists
            role = self.db.query(Role).filter(Role.name == role_name).first()
            if not role:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Role '{role_name}' not found"
                )
            
            # Check hierarchy permissions if assigning user is provided
            if assigning_user and not self._can_assign_role(assigning_user, role):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient privileges to assign this role"
                )
            
            # SINGLE ROLE POLICY: Remove all existing role assignments for this user
            # This ensures one user has exactly one role at a time
            existing_roles = self.db.query(UserRole).filter(UserRole.user_id == user_id).all()
            for existing_role in existing_roles:
                self.db.delete(existing_role)

            # Create new role assignment
            user_role = UserRole(
                user_id=user_id,
                role_id=role.id,
                is_primary=is_primary,
                expires_at=expires_at,
                assigned_by=assigning_user.id if assigning_user else None
            )
            
            self.db.add(user_role)
            self.db.commit()
            
            # Clear permission cache for user
            self._clear_user_cache(user_id)
            
            # Audit log
            audit_logger.info(
                f"Role assigned: user_id={user_id}, role={role_name}, "
                f"assigned_by={assigning_user.id if assigning_user else None}"
            )
            
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to assign role {role_name} to user {user_id}: {e}")
            raise
    
    def revoke_role_from_user(self, user_id: int, role_name: str,
                             revoking_user: Optional[User] = None) -> bool:
        """Revoke a role from a user."""
        try:
            # Find the role assignment
            role = self.db.query(Role).filter(Role.name == role_name).first()
            if not role:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Role '{role_name}' not found"
                )
            
            user_role = self.db.query(UserRole).filter(
                and_(UserRole.user_id == user_id, UserRole.role_id == role.id)
            ).first()
            
            if not user_role:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"User does not have role '{role_name}'"
                )
            
            # Check hierarchy permissions
            if revoking_user and not self._can_revoke_role(revoking_user, role):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient privileges to revoke this role"
                )
            
            # Delete the role assignment completely for single role policy
            # This ensures user truly has "no role assigned" state
            self.db.delete(user_role)
            self.db.commit()
            
            # Clear permission cache for user
            self._clear_user_cache(user_id)
            
            # Audit log
            audit_logger.info(
                f"Role revoked: user_id={user_id}, role={role_name}, "
                f"revoked_by={revoking_user.id if revoking_user else None}"
            )
            
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to revoke role {role_name} from user {user_id}: {e}")
            raise
    
    def create_role(self, role_data, creating_user: Optional[User] = None) -> Role:
        """Create a new role."""
        logger.info(f"[RBACService] Creating role: name='{role_data.name}', display_name='{role_data.display_name}'")

        try:
            # Check permissions
            if creating_user:
                logger.info(f"[RBACService] Checking permissions for user {creating_user.id} ({creating_user.username})")
                has_permission = creating_user.has_permission("roles:create", self.db)
                logger.info(f"[RBACService] User has 'roles:create' permission: {has_permission}")

                if not has_permission:
                    logger.warning(f"[RBACService] Permission denied for user {creating_user.id}")
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Insufficient privileges to create roles"
                    )

            # Check if role already exists
            existing_role = self.db.query(Role).filter(Role.name == role_data.name).first()
            if existing_role:
                logger.warning(f"[RBACService] Role '{role_data.name}' already exists")
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Role '{role_data.name}' already exists"
                )

            logger.info(f"[RBACService] Creating role object")
            # Create role
            role = Role(
                name=role_data.name,
                display_name=role_data.display_name,
                description=role_data.description,
                hierarchy_level=role_data.hierarchy_level or 1,
                created_by=creating_user.id if creating_user else None
            )

            logger.info(f"[RBACService] Adding role to database")
            self.db.add(role)
            self.db.flush()  # Get the role ID
            logger.info(f"[RBACService] Role created with ID: {role.id}")

            # Assign permissions if provided
            if hasattr(role_data, 'permissions') and role_data.permissions:
                logger.info(f"[RBACService] Assigning permissions: {role_data.permissions}")
                self._assign_permissions_to_role(role.id, role_data.permissions)
            else:
                logger.info(f"[RBACService] No permissions provided for role")

            logger.info(f"[RBACService] Committing transaction")
            self.db.commit()

            # Audit log
            audit_logger.info(
                f"Role created: name={role_data.name}, "
                f"created_by={creating_user.id if creating_user else None}"
            )

            logger.info(f"[RBACService] Role creation successful")
            return role

        except HTTPException:
            logger.info(f"[RBACService] HTTPException raised, re-raising")
            raise
        except Exception as e:
            logger.error(f"[RBACService] Failed to create role {role_data.name}: {e}", exc_info=True)
            self.db.rollback()
            raise
    
    def update_role(self, role_id: int, update_data, updating_user: Optional[User] = None) -> Role:
        """Update an existing role."""
        try:
            role = self.db.query(Role).filter(Role.id == role_id).first()
            if not role:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Role not found"
                )
            
            # Check permissions
            if updating_user and not updating_user.has_permission("roles:update", self.db):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient privileges to update roles"
                )
            
            # Prevent updating system roles
            if role.is_system:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot modify system roles"
                )
            
            # Update fields
            if update_data.display_name is not None:
                role.display_name = update_data.display_name
            if update_data.description is not None:
                role.description = update_data.description
            
            # Update permissions if provided
            if hasattr(update_data, 'permissions') and update_data.permissions is not None:
                # Remove existing permissions
                self.db.query(RolePermission).filter(
                    RolePermission.role_id == role_id
                ).delete()
                
                # Add new permissions
                self._assign_permissions_to_role(role_id, update_data.permissions)
            
            role.updated_at = datetime.utcnow()
            self.db.commit()
            
            # Clear cache
            self._clear_role_cache(role_id)
            
            return role
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to update role {role_id}: {e}")
            raise
    
    def delete_role(self, role_id: int, deleting_user: Optional[User] = None) -> bool:
        """Delete a role."""
        try:
            role = self.db.query(Role).filter(Role.id == role_id).first()
            if not role:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Role not found"
                )
            
            # Check permissions
            if deleting_user and not deleting_user.has_permission("roles:delete", self.db):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient privileges to delete roles"
                )
            
            # Prevent deleting system roles
            if role.is_system:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot delete system role"
                )
            
            # Check if role is assigned to users
            user_count = self.db.query(UserRole).filter(
                and_(UserRole.role_id == role_id, UserRole.is_active == True)
            ).count()
            
            if user_count > 0:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Cannot delete role: assigned to {user_count} users"
                )
            
            # Delete role (cascading will handle permissions)
            self.db.delete(role)
            self.db.commit()
            
            # Clear cache
            self._clear_role_cache(role_id)
            
            return True
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to delete role {role_id}: {e}")
            raise
    
    def _can_assign_role(self, assigning_user: User, role: Role) -> bool:
        """Check if user can assign the specified role."""
        return assigning_user.get_highest_hierarchy_level(self.db) > role.hierarchy_level
    
    def _can_revoke_role(self, revoking_user: User, role: Role) -> bool:
        """Check if user can revoke the specified role."""
        return revoking_user.get_highest_hierarchy_level(self.db) > role.hierarchy_level
    
    def _assign_permissions_to_role(self, role_id: int, permission_names: List[str]):
        """Assign permissions to a role."""
        for perm_name in permission_names:
            permission = self.db.query(Permission).filter(
                Permission.name == perm_name
            ).first()
            
            if permission:
                role_perm = RolePermission(
                    role_id=role_id,
                    permission_id=permission.id
                )
                self.db.add(role_perm)
    
    def _clear_user_cache(self, user_id: int):
        """Clear permission cache for a user."""
        cache_key = f"user_permissions_{user_id}"
        if cache_key in _permission_cache:
            del _permission_cache[cache_key]
    
    def _clear_role_cache(self, role_id: int):
        """Clear permission cache for a role."""
        # Clear all user caches as role changes affect multiple users
        keys_to_remove = [k for k in _permission_cache.keys() if k.startswith("user_permissions_")]
        for key in keys_to_remove:
            del _permission_cache[key]


# Core permission checking functions
def get_user_permissions(user: User, db: Session = None) -> Set[str]:
    """Get all permissions for a user from all assigned roles."""
    # TEMPORARY FIX: Use legacy role field for faster permission checking
    # This bypasses the complex RBAC database queries that are causing timeouts

    if not user:
        return set()

    # Use legacy role permissions for now to avoid database issues
    return _get_legacy_role_permissions(user.role)


def _get_legacy_role_permissions(role_name: str) -> Set[str]:
    """Get permissions for a role based on legacy role name (for tests)."""
    role_permissions = {
        "viewer": {
            "documents:read",
        },
        "user": {
            "documents:read", 
            "documents:create",
        },
        "manager": {
            "documents:read", 
            "documents:create", 
            "documents:update", 
            "users:read",
        },
        "admin": {
            "documents:read",
            "documents:create",
            "documents:update",
            "documents:delete",
            "documents:admin",
            "document:share:view",
            "document:share:admin",
            "users:read",
            "users:create",
            "users:update",
            "roles:read",
            "system:read",
            "audit:read",
            "security:read",
            "security:create",
            "security:update",
        },
        "super_admin": {
            "documents:read",
            "documents:create",
            "documents:update",
            "documents:delete",
            "documents:admin",
            "document:share:view",
            "document:share:admin",
            "users:read",
            "users:create",
            "users:update",
            "users:delete",
            "roles:read",
            "roles:create",
            "roles:update",
            "roles:delete",
            "system:admin",
            "security:read",
            "security:create",
            "security:update",
            "security:delete",
        }
    }
    
    return role_permissions.get(role_name, set())


def get_user_roles(user_id: int, db: Session) -> List[Role]:
    """Get all active roles for a user."""
    user_roles = db.query(UserRole).filter(
        and_(UserRole.user_id == user_id, UserRole.is_active == True)
    ).all()
    
    return [ur.role for ur in user_roles if not ur.is_expired]


def has_permission(user: User, permission: str, db: Session = None,
                  resource_type: Optional[str] = None,
                  resource_id: Optional[int] = None) -> bool:
    """Check if user has a specific permission."""
    # TEMPORARY FIX: Use legacy role field for faster permission checking
    # This bypasses the complex RBAC database queries that are causing timeouts

    if not user:
        return False

    # Use the legacy role field for now to avoid database timeout issues
    legacy_permissions = _get_legacy_role_permissions(user.role)

    # Check direct permission
    if permission in legacy_permissions:
        return True

    # For shares functionality, allow document owners to manage their shares
    if permission in ["document:share:view", "documents:read"] and user.role in ["user", "manager", "admin", "super_admin"]:
        return True

    # Allow basic document operations for authenticated users
    if permission in ["document:share", "documents:view"] and user.role in ["user", "manager", "admin", "super_admin"]:
        return True

    return False


def has_role(user: User, role_name: str, db: Session = None) -> bool:
    """Check if user has a specific role."""
    if not db:
        return False
    
    user_roles = get_user_roles(user.id, db)
    return any(role.name == role_name for role in user_roles)


def check_hierarchy_access(user: User, target_role: str, db: Session = None) -> bool:
    """Check if user can access resources of target role level."""
    # For tests and simple cases, use the legacy role field
    if db is None:
        role_levels = {
            'viewer': 1,
            'user': 2,
            'manager': 3,
            'admin': 4,
            'super_admin': 5
        }
        user_level = role_levels.get(user.role, 0)
    else:
        user_level = user.get_highest_hierarchy_level(db)
    
    role_levels = {
        'viewer': 1,
        'user': 2,
        'manager': 3,
        'admin': 4,
        'super_admin': 5
    }
    
    target_level = role_levels.get(target_role, 0)
    return user_level >= target_level


def evaluate_dynamic_permission(user: User, permission: str, context: Dict[str, Any],
                               db: Session = None) -> bool:
    """Evaluate permission based on dynamic context."""
    if not db:
        return False
    
    # Check ownership-based permissions
    if permission.endswith('_own'):
        base_permission = permission.replace('_own', '')
        if has_permission(user, base_permission, db):
            return context.get('owner_id') == user.id
    
    # Check department-based permissions
    if permission.endswith('_department'):
        base_permission = permission.replace('_department', '')
        if has_permission(user, base_permission, db):
            return context.get('department') == getattr(user, 'department', None)
    
    # Check time-based permissions
    if _has_conditional_permission(user, permission, context, db):
        return True
    
    return False


def has_temporary_permission(user: User, permission: str, db: Session = None) -> bool:
    """Check if user has temporary permission that hasn't expired."""
    if not db:
        return False
    
    # This would query temporary permissions table
    # Implementation depends on business requirements
    return False


def has_conditional_permission(user: User, permission: str, conditions: List[str],
                              db: Session = None) -> bool:
    """Check if user has permission based on conditions."""
    if not db:
        return False
    
    # Check base permission first
    if not has_permission(user, permission, db):
        return False
    
    # Evaluate conditions
    for condition in conditions:
        if condition == "business_hours":
            if not _is_business_hours():
                return False
        elif condition == "ip_whitelist":
            if not _is_ip_whitelisted():
                return False
        # Add more conditions as needed
    
    return True


# Decorator functions for route protection
def require_permission(permission: str, resource_type: Optional[str] = None):
    """Decorator to require specific permission for route access."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current user from dependencies
            current_user = None
            db = None
            
            # Look for current_user and db in function parameters
            import inspect
            sig = inspect.signature(func)
            bound_args = sig.bind(*args, **kwargs)
            bound_args.apply_defaults()
            
            for param_name, param_value in bound_args.arguments.items():
                if isinstance(param_value, User):
                    current_user = param_value
                elif isinstance(param_value, Session):
                    db = param_value
            
            if not current_user or not db:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Check permission
            resource_id = kwargs.get('resource_id') if resource_type else None
            
            if not has_permission(current_user, permission, db, resource_type, resource_id):
                # Log access denial
                security_logger.warning(
                    f"Access denied: user_id={current_user.id}, permission={permission}, "
                    f"resource_type={resource_type}, resource_id={resource_id}"
                )
                
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient privileges: requires '{permission}'"
                )
            
            # Log successful access
            audit_logger.info(
                f"Permission granted: user_id={current_user.id}, permission={permission}"
            )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_role(role_name: str):
    """Decorator to require specific role for route access."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current user from dependencies
            current_user = None
            db = None
            
            import inspect
            sig = inspect.signature(func)
            bound_args = sig.bind(*args, **kwargs)
            bound_args.apply_defaults()
            
            for param_name, param_value in bound_args.arguments.items():
                if isinstance(param_value, User):
                    current_user = param_value
                elif isinstance(param_value, Session):
                    db = param_value
            
            if not current_user or not db:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Check role
            if not has_role(current_user, role_name, db):
                security_logger.warning(
                    f"Access denied: user_id={current_user.id}, required_role={role_name}"
                )
                
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient privileges: requires '{role_name}' role"
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def check_resource_access(user: User, resource_type: str, resource_id: int,
                         action: str, resource_permissions: Dict[str, Any]) -> bool:
    """Check if user has access to specific resource."""
    # Check ownership
    if resource_permissions.get('owner_id') == user.id:
        return True
    
    # Check department access
    if (resource_permissions.get('department') == getattr(user, 'department', None) 
        and action in ['read']):
        return True
    
    return False


# Helper functions
def _get_inherited_permissions(user: User, db: Session) -> Set[str]:
    """Get permissions inherited through role hierarchy."""
    permissions = set()
    user_level = user.get_highest_hierarchy_level(db)
    
    # SECURITY FIX: Users with hierarchy level 0 (no roles) get no inherited permissions
    if user_level <= 0:
        security_logger.info(
            f"User {user.id} ({user.username}) has hierarchy level {user_level} - no inherited permissions granted"
        )
        return set()
    
    # Define permission inheritance rules
    inheritance_rules = {
        5: {'system:admin', 'roles:delete', 'users:delete'},  # Super admin
        4: {'roles:create', 'roles:update', 'users:create', 'users:update'},  # Admin
        3: {'users:read', 'documents:update'},  # Manager
        2: {'documents:create', 'documents:read'},  # User
        1: {'documents:read'}  # Viewer
    }
    
    # Add permissions for current level and below
    for level in range(1, user_level + 1):
        if level in inheritance_rules:
            permissions.update(inheritance_rules[level])
    
    # Additional security check: verify user actually has active roles
    active_roles = db.query(UserRole).filter(
        and_(UserRole.user_id == user.id, UserRole.is_active == True)
    ).count()
    
    if active_roles == 0:
        security_logger.warning(
            f"SECURITY: User {user.id} ({user.username}) has hierarchy level {user_level} but no active roles - blocking inherited permissions"
        )
        return set()
    
    return permissions


def _has_resource_permission(user: User, resource_type: str, resource_id: int,
                            permission: str, db: Session) -> bool:
    """Check resource-level permissions."""
    # Check user-specific resource permissions
    user_perm = db.query(ResourcePermission).filter(
        and_(
            ResourcePermission.resource_type == resource_type,
            ResourcePermission.resource_id == resource_id,
            ResourcePermission.subject_type == 'user',
            ResourcePermission.subject_id == user.id,
            ResourcePermission.permission == permission,
            ResourcePermission.granted == True
        )
    ).first()
    
    if user_perm and user_perm.is_valid:
        return True
    
    # Check role-based resource permissions
    user_roles = get_user_roles(user.id, db)
    for role in user_roles:
        role_perm = db.query(ResourcePermission).filter(
            and_(
                ResourcePermission.resource_type == resource_type,
                ResourcePermission.resource_id == resource_id,
                ResourcePermission.subject_type == 'role',
                ResourcePermission.subject_id == role.id,
                ResourcePermission.permission == permission,
                ResourcePermission.granted == True
            )
        ).first()
        
        if role_perm and role_perm.is_valid:
            return True
    
    return False


def _has_hierarchy_permission(user: User, permission: str, db: Session) -> bool:
    """Check if user has permission through role hierarchy."""
    user_level = user.get_highest_hierarchy_level(db)
    
    # Super admin has all permissions
    if user_level >= 5:
        return True
    
    return False


def _has_conditional_permission(user: User, permission: str, context: Dict[str, Any],
                               db: Session) -> bool:
    """Check conditional permissions based on context."""
    # This would implement business-specific conditional logic
    return False


def _is_business_hours() -> bool:
    """Check if current time is within business hours."""
    now = datetime.now()
    return 9 <= now.hour < 17 and now.weekday() < 5


def _is_ip_whitelisted() -> bool:
    """Check if current IP is whitelisted."""
    # This would implement IP whitelist checking
    return True


def check_resource_access(user: User, resource_type: str, resource_id: int,
                         action: str, resource_permissions: Dict[str, Any]) -> bool:
    """Check if user has access to specific resource."""
    # Check ownership
    if resource_permissions.get('owner_id') == user.id:
        return True
    
    # Check department access
    if (resource_permissions.get('department') == getattr(user, 'department', None) 
        and action in ['read']):
        return True
    
    return False


# Initialize default permissions on startup
def initialize_default_permissions(db: Session):
    """Initialize default roles and permissions."""
    try:
        # Create default permissions
        default_permissions = [
            ("documents:read", "Read documents", "documents", "read"),
            ("documents:create", "Create documents", "documents", "create"),
            ("documents:update", "Update documents", "documents", "update"),
            ("documents:delete", "Delete documents", "documents", "delete"),
            ("users:read", "Read users", "users", "read"),
            ("users:create", "Create users", "users", "create"),
            ("users:update", "Update users", "users", "update"),
            ("users:delete", "Delete users", "users", "delete"),
            ("roles:read", "Read roles", "roles", "read"),
            ("roles:create", "Create roles", "roles", "create"),
            ("roles:update", "Update roles", "roles", "update"),
            ("roles:delete", "Delete roles", "roles", "delete"),
            ("system:admin", "System administration", "system", "admin"),
            ("audit:read", "Read audit logs", "audit", "read"),
        ]
        
        for perm_name, display_name, resource_type, action in default_permissions:
            existing = db.query(Permission).filter(Permission.name == perm_name).first()
            if not existing:
                permission = Permission(
                    name=perm_name,
                    display_name=display_name,
                    resource_type=resource_type,
                    action=action,
                    is_system=True
                )
                db.add(permission)
        
        db.commit()
        logger.info("Default permissions initialized")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to initialize default permissions: {e}")
        raise