"""
RBAC system initialization.

This module provides functions to initialize the RBAC system with
default roles, permissions, and role-permission mappings.
"""

import logging
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from ..models.rbac import Role, Permission, RolePermission
from ..models.user import User


logger = logging.getLogger(__name__)


def initialize_rbac_system(db: Session):
    """Initialize the RBAC system with default roles and permissions."""
    try:
        logger.info("Initializing RBAC system...")
        
        # Initialize permissions first
        _create_default_permissions(db)
        
        # Initialize roles
        _create_default_roles(db)
        
        # Assign permissions to roles
        _assign_default_role_permissions(db)
        
        # Update existing users with default roles
        _update_existing_users(db)
        
        db.commit()
        logger.info("RBAC system initialized successfully")
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to initialize RBAC system: {e}")
        raise


def _create_default_permissions(db: Session):
    """Create default system permissions."""
    logger.info("Creating default permissions...")
    
    default_permissions = [
        # Document permissions
        ("documents:read", "Read documents", "documents", "read", True),
        ("documents:create", "Create documents", "documents", "create", True),
        ("documents:update", "Update documents", "documents", "update", True),
        ("documents:delete", "Delete documents", "documents", "delete", True),
        ("documents:admin", "Administer documents", "documents", "admin", True),
        
        # User permissions
        ("users:read", "Read users", "users", "read", True),
        ("users:create", "Create users", "users", "create", True),
        ("users:update", "Update users", "users", "update", True),
        ("users:delete", "Delete users", "users", "delete", True),
        ("users:admin", "Administer users", "users", "admin", True),
        
        # Role permissions
        ("roles:read", "Read roles", "roles", "read", True),
        ("roles:create", "Create roles", "roles", "create", True),
        ("roles:update", "Update roles", "roles", "update", True),
        ("roles:delete", "Delete roles", "roles", "delete", True),
        ("roles:admin", "Administer roles", "roles", "admin", True),
        
        # Folder permissions
        ("folders:read", "Read folders", "folders", "read", False),
        ("folders:create", "Create folders", "folders", "create", False),
        ("folders:update", "Update folders", "folders", "update", False),
        ("folders:delete", "Delete folders", "folders", "delete", False),
        ("folders:admin", "Administer folders", "folders", "admin", False),
        
        # System permissions
        ("system:read", "Read system information", "system", "read", True),
        ("system:admin", "System administration", "system", "admin", True),
        ("system:audit", "System audit access", "system", "audit", True),
        ("system:backup", "System backup access", "system", "backup", True),
        ("system:config", "System configuration", "system", "config", True),

        # Audit permissions
        ("audit:read", "Read audit logs", "audit", "read", True),
        ("audit:create", "Create audit entries", "audit", "create", True),
        ("audit:admin", "Administer audit system", "audit", "admin", True),

        # Security permissions
        ("security:read", "Read security information", "security", "read", True),
        ("security:create", "Create security events", "security", "create", True),
        ("security:update", "Update security information", "security", "update", True),
        ("security:delete", "Delete security information", "security", "delete", True),
        ("security:admin", "Administer security system", "security", "admin", True),
    ]
    
    for perm_name, display_name, resource_type, action, is_system in default_permissions:
        try:
            existing = db.query(Permission).filter(Permission.name == perm_name).first()
            if not existing:
                permission = Permission(
                    name=perm_name,
                    display_name=display_name,
                    description=f"{display_name} permission for {resource_type}",
                    resource_type=resource_type,
                    action=action,
                    is_system=is_system
                )
                db.add(permission)
                logger.debug(f"Created permission: {perm_name}")
        except IntegrityError:
            # Permission already exists
            pass
    
    db.flush()  # Flush to get IDs but don't commit yet


def _create_default_roles(db: Session):
    """Create default system roles."""
    logger.info("Creating default roles...")
    
    default_roles = [
        ("viewer", "Viewer", "Can view documents and basic information", 1),
        ("user", "User", "Standard user with document creation privileges", 2),
        ("manager", "Manager", "Can manage team documents and users", 3),
        ("admin", "Administrator", "Can manage system users and configurations", 4),
        ("super_admin", "Super Administrator", "Full system access", 5),
    ]
    
    for role_name, display_name, description, hierarchy_level in default_roles:
        try:
            existing = db.query(Role).filter(Role.name == role_name).first()
            if not existing:
                role = Role(
                    name=role_name,
                    display_name=display_name,
                    description=description,
                    hierarchy_level=hierarchy_level,
                    is_system=True,
                    is_active=True
                )
                db.add(role)
                logger.debug(f"Created role: {role_name}")
        except IntegrityError:
            # Role already exists
            pass
    
    db.flush()  # Flush to get IDs


def _assign_default_role_permissions(db: Session):
    """Assign default permissions to roles."""
    logger.info("Assigning permissions to roles...")
    
    # Define role-permission mappings
    role_permissions = {
        "viewer": [
            "documents:read",
            "folders:read",
        ],
        "user": [
            "documents:read",
            "documents:create",
            "folders:read",
            "folders:create",
        ],
        "manager": [
            "documents:read",
            "documents:create",
            "documents:update", 
            "documents:delete",
            "folders:read",
            "folders:create",
            "folders:update",
            "folders:delete",
            "users:read",
        ],
        "admin": [
            "documents:read",
            "documents:create",
            "documents:update",
            "documents:delete",
            "documents:admin",
            "folders:read",
            "folders:create",
            "folders:update",
            "folders:delete",
            "folders:admin",
            "users:read",
            "users:create",
            "users:update",
            "users:admin",
            "roles:read",
            "system:read",
            "system:audit",
            "system:backup",
            "audit:read",
            "security:read",
            "security:create",
            "security:update",
        ],
        "super_admin": [
            "documents:read",
            "documents:create",
            "documents:update",
            "documents:delete",
            "documents:admin",
            "folders:read",
            "folders:create",
            "folders:update",
            "folders:delete",
            "folders:admin",
            "users:read",
            "users:create",
            "users:update",
            "users:delete",
            "users:admin",
            "roles:read",
            "roles:create",
            "roles:update",
            "roles:delete",
            "roles:admin",
            "system:read",
            "system:admin",
            "system:audit",
            "system:backup",
            "system:config",
            "audit:read",
            "audit:create",
            "audit:admin",
            "security:read",
            "security:create",
            "security:update",
            "security:delete",
            "security:admin",
        ],
    }
    
    for role_name, permission_names in role_permissions.items():
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            logger.warning(f"Role {role_name} not found, skipping permission assignment")
            continue
        
        for perm_name in permission_names:
            permission = db.query(Permission).filter(Permission.name == perm_name).first()
            if not permission:
                logger.warning(f"Permission {perm_name} not found, skipping")
                continue
            
            # Check if assignment already exists
            existing = db.query(RolePermission).filter(
                RolePermission.role_id == role.id,
                RolePermission.permission_id == permission.id
            ).first()
            
            if not existing:
                role_permission = RolePermission(
                    role_id=role.id,
                    permission_id=permission.id
                )
                db.add(role_permission)
                logger.debug(f"Assigned {perm_name} to {role_name}")


def _update_existing_users(db: Session):
    """Update existing users with default roles based on their current role field."""
    logger.info("Updating existing users with RBAC roles...")
    
    users = db.query(User).all()
    
    for user in users:
        # Skip if user already has RBAC roles assigned
        if hasattr(user, 'user_roles') and user.user_roles:
            continue
        
        # Map legacy role field to RBAC role
        role_mapping = {
            'super_admin': 'super_admin',
            'admin': 'admin', 
            'manager': 'manager',
            'user': 'user',
            'viewer': 'viewer'
        }
        
        role_name = role_mapping.get(user.role, 'user')  # Default to 'user' role
        role = db.query(Role).filter(Role.name == role_name).first()
        
        if role:
            from ..models.rbac import UserRole
            user_role = UserRole(
                user_id=user.id,
                role_id=role.id,
                is_primary=True,
                is_active=True
            )
            db.add(user_role)
            logger.debug(f"Assigned role {role_name} to user {user.username}")


def create_custom_role(db: Session, name: str, display_name: str, description: str,
                      hierarchy_level: int, permissions: list):
    """Create a custom role with specified permissions."""
    try:
        # Create the role
        role = Role(
            name=name,
            display_name=display_name,
            description=description,
            hierarchy_level=hierarchy_level,
            is_system=False,
            is_active=True
        )
        db.add(role)
        db.flush()  # Get the role ID
        
        # Assign permissions
        for perm_name in permissions:
            permission = db.query(Permission).filter(Permission.name == perm_name).first()
            if permission:
                role_permission = RolePermission(
                    role_id=role.id,
                    permission_id=permission.id
                )
                db.add(role_permission)
        
        db.commit()
        logger.info(f"Created custom role: {name}")
        return role
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create custom role {name}: {e}")
        raise


def verify_rbac_system(db: Session) -> dict:
    """Verify that the RBAC system is properly initialized."""
    try:
        # Count roles and permissions
        role_count = db.query(Role).count()
        permission_count = db.query(Permission).count()
        role_permission_count = db.query(RolePermission).count()
        
        # Get system roles
        system_roles = db.query(Role).filter(Role.is_system == True).all()
        system_role_names = [role.name for role in system_roles]
        
        # Check for required system roles
        required_roles = {'viewer', 'user', 'manager', 'admin', 'super_admin'}
        missing_roles = required_roles - set(system_role_names)
        
        # Get system permissions
        system_permissions = db.query(Permission).filter(Permission.is_system == True).all()
        system_permission_names = [perm.name for perm in system_permissions]
        
        verification_result = {
            'status': 'healthy' if not missing_roles else 'incomplete',
            'roles': {
                'total': role_count,
                'system_roles': len(system_roles),
                'missing_required': list(missing_roles)
            },
            'permissions': {
                'total': permission_count,
                'system_permissions': len(system_permissions)
            },
            'role_permissions': {
                'total': role_permission_count
            },
            'system_ready': len(missing_roles) == 0
        }
        
        logger.info(f"RBAC system verification: {verification_result['status']}")
        return verification_result
        
    except Exception as e:
        logger.error(f"RBAC system verification failed: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'system_ready': False
        }