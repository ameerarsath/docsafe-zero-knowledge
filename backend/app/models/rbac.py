"""
RBAC (Role-Based Access Control) models for SecureVault.

This module defines the database models for the RBAC system including:
- Role model with hierarchy levels
- Permission model for granular access control
- RolePermission junction table for role-permission mappings
- UserRole junction table for user-role assignments
- Resource-based permissions for document-level security
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, UniqueConstraint, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import Set, Optional, List

from ..core.database import Base


class Role(Base):
    """Role model for hierarchical role-based access control."""
    
    __tablename__ = "roles"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Role identification
    name = Column(String(50), unique=True, index=True, nullable=False)
    display_name = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    
    # Hierarchy and system roles
    hierarchy_level = Column(Integer, nullable=False, index=True)
    is_system = Column(Boolean, default=False, nullable=False)  # Prevents deletion of system roles
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Audit fields
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    role_permissions = relationship("RolePermission", back_populates="role", cascade="all, delete-orphan")
    user_roles = relationship("UserRole", back_populates="role", cascade="all, delete-orphan")
    
    def __init__(self, name: str, **kwargs):
        """Initialize Role with hierarchy level based on name."""
        # Set hierarchy level based on role name
        hierarchy_levels = {
            'super_admin': 5,
            'admin': 4,
            'manager': 3,
            'user': 2,
            'viewer': 1
        }
        
        self.name = name
        self.hierarchy_level = hierarchy_levels.get(name, 1)  # Default to viewer level
        
        # Set system role status for predefined roles
        system_roles = {'super_admin', 'admin', 'manager', 'user', 'viewer'}
        self.is_system = name in system_roles
        
        # Set display name if not provided
        if 'display_name' not in kwargs:
            self.display_name = name.replace('_', ' ').title()
        
        # Set all other fields
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def get_permission_names(self, db_session) -> Set[str]:
        """Get all permission names for this role."""
        permissions = db_session.query(Permission).join(RolePermission).filter(
            RolePermission.role_id == self.id
        ).all()
        return {perm.name for perm in permissions}
    
    def has_permission(self, permission_name: str, db_session) -> bool:
        """Check if role has specific permission."""
        return permission_name in self.get_permission_names(db_session)
    
    def can_manage_role(self, other_role: "Role") -> bool:
        """Check if this role can manage another role based on hierarchy."""
        return self.hierarchy_level > other_role.hierarchy_level
    
    def __repr__(self) -> str:
        """String representation of role."""
        return f"<Role(id={self.id}, name='{self.name}', level={self.hierarchy_level})>"


class Permission(Base):
    """Permission model for granular access control."""
    
    __tablename__ = "permissions"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Permission identification
    name = Column(String(100), unique=True, index=True, nullable=False)  # e.g., "documents:read"
    display_name = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    
    # Permission categorization
    resource_type = Column(String(50), nullable=False, index=True)  # e.g., "documents", "users", "system"
    action = Column(String(50), nullable=False, index=True)  # e.g., "read", "create", "update", "delete"
    
    # Permission properties
    is_system = Column(Boolean, default=False, nullable=False)  # System permissions cannot be deleted
    requires_resource_ownership = Column(Boolean, default=False, nullable=False)  # Requires owning the resource
    
    # Audit fields
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    role_permissions = relationship("RolePermission", back_populates="permission", cascade="all, delete-orphan")
    
    # Indexes for efficient querying
    __table_args__ = (
        Index('idx_permission_resource_action', 'resource_type', 'action'),
    )
    
    def __init__(self, name: str, **kwargs):
        """Initialize Permission and parse resource type and action from name."""
        self.name = name
        
        # Parse resource type and action from permission name (e.g., "documents:read")
        if ':' in name:
            resource_type, action = name.split(':', 1)
            self.resource_type = resource_type
            self.action = action
        else:
            self.resource_type = 'system'
            self.action = name
        
        # Set display name if not provided
        if 'display_name' not in kwargs:
            self.display_name = name.replace(':', ' ').replace('_', ' ').title()
        
        # Mark system permissions
        system_permissions = {
            'documents:read', 'documents:create', 'documents:update', 'documents:delete',
            'users:read', 'users:create', 'users:update', 'users:delete',
            'roles:read', 'roles:create', 'roles:update', 'roles:delete',
            'system:admin', 'system:audit'
        }
        self.is_system = name in system_permissions
        
        # Set all other fields
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def __repr__(self) -> str:
        """String representation of permission."""
        return f"<Permission(id={self.id}, name='{self.name}')>"


class RolePermission(Base):
    """Junction table for role-permission mappings."""
    
    __tablename__ = "role_permissions"
    
    # Composite primary key
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    permission_id = Column(Integer, ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)
    
    # Assignment metadata
    granted_at = Column(DateTime, default=func.now(), nullable=False)
    granted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Conditional permissions
    conditions = Column(Text, nullable=True)  # JSON string for conditional logic
    expires_at = Column(DateTime, nullable=True)  # For temporary permissions
    
    # Relationships
    role = relationship("Role", back_populates="role_permissions")
    permission = relationship("Permission", back_populates="role_permissions")
    
    def __init__(self, role_id: int, permission_id: int, **kwargs):
        """Initialize role-permission mapping."""
        self.role_id = role_id
        self.permission_id = permission_id
        
        # Set all other fields
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    @property
    def is_expired(self) -> bool:
        """Check if this permission grant has expired."""
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at
    
    def __repr__(self) -> str:
        """String representation of role-permission mapping."""
        return f"<RolePermission(role_id={self.role_id}, permission_id={self.permission_id})>"


class UserRole(Base):
    """Junction table for user-role assignments."""
    
    __tablename__ = "user_roles"
    
    # Composite primary key
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    
    # Assignment metadata
    assigned_at = Column(DateTime, default=func.now(), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    expires_at = Column(DateTime, nullable=True)  # For temporary role assignments
    
    # Assignment properties
    is_primary = Column(Boolean, default=True, nullable=False)  # Primary role for user
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relationships  
    role = relationship("Role", back_populates="user_roles")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'role_id', name='uq_user_role'),
        Index('idx_user_role_active', 'user_id', 'is_active'),
    )
    
    def __init__(self, user_id: int, role_id: int, **kwargs):
        """Initialize user-role assignment."""
        self.user_id = user_id
        self.role_id = role_id
        
        # Set all other fields
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    @property
    def is_expired(self) -> bool:
        """Check if this role assignment has expired."""
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at
    
    @property
    def is_valid(self) -> bool:
        """Check if this role assignment is currently valid."""
        return self.is_active and not self.is_expired
    
    def __repr__(self) -> str:
        """String representation of user-role assignment."""
        return f"<UserRole(user_id={self.user_id}, role_id={self.role_id}, primary={self.is_primary})>"


class ResourcePermission(Base):
    """Resource-level permissions for document and folder access control."""
    
    __tablename__ = "resource_permissions"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Resource identification
    resource_type = Column(String(50), nullable=False, index=True)  # e.g., "document", "folder"
    resource_id = Column(Integer, nullable=False, index=True)  # ID of the specific resource
    
    # Subject (who has permission)
    subject_type = Column(String(20), nullable=False)  # "user" or "role"
    subject_id = Column(Integer, nullable=False)  # User ID or Role ID
    
    # Permission details
    permission = Column(String(50), nullable=False)  # e.g., "read", "write", "admin"
    granted = Column(Boolean, default=True, nullable=False)  # True for grant, False for deny
    
    # Inheritance and propagation
    inheritable = Column(Boolean, default=True, nullable=False)  # Can be inherited by child resources
    inherited_from = Column(Integer, ForeignKey("resource_permissions.id"), nullable=True)  # Parent permission
    
    # Assignment metadata
    granted_at = Column(DateTime, default=func.now(), nullable=False)
    granted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    expires_at = Column(DateTime, nullable=True)
    
    # Conditional access
    conditions = Column(Text, nullable=True)  # JSON string for conditions (time-based, IP-based, etc.)
    
    # Relationships
    children = relationship("ResourcePermission", backref="parent", remote_side=[id])
    
    # Indexes for efficient querying
    __table_args__ = (
        UniqueConstraint('resource_type', 'resource_id', 'subject_type', 'subject_id', 'permission', 
                        name='uq_resource_permission'),
        Index('idx_resource_permission_lookup', 'resource_type', 'resource_id', 'subject_type', 'subject_id'),
        Index('idx_resource_permission_inheritance', 'inheritable', 'inherited_from'),
    )
    
    def __init__(self, resource_type: str, resource_id: int, subject_type: str, 
                 subject_id: int, permission: str, **kwargs):
        """Initialize resource permission."""
        self.resource_type = resource_type
        self.resource_id = resource_id
        self.subject_type = subject_type
        self.subject_id = subject_id
        self.permission = permission
        
        # Set all other fields
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    @property
    def is_expired(self) -> bool:
        """Check if this permission has expired."""
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at
    
    @property
    def is_valid(self) -> bool:
        """Check if this permission is currently valid."""
        return not self.is_expired
    
    def __repr__(self) -> str:
        """String representation of resource permission."""
        return (f"<ResourcePermission({self.resource_type}:{self.resource_id}, "
                f"{self.subject_type}:{self.subject_id}, {self.permission})>")


class RoleHierarchy(Base):
    """Model to track role hierarchy relationships and inheritance rules."""
    
    __tablename__ = "role_hierarchy"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Hierarchy relationship
    parent_role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    child_role_id = Column(Integer, ForeignKey("roles.id", ondelete="CASCADE"), nullable=False)
    
    # Inheritance rules
    inherit_permissions = Column(Boolean, default=True, nullable=False)
    inherit_resource_access = Column(Boolean, default=False, nullable=False)
    
    # Metadata
    created_at = Column(DateTime, default=func.now(), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationships
    parent_role = relationship("Role", foreign_keys=[parent_role_id])
    child_role = relationship("Role", foreign_keys=[child_role_id])
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('parent_role_id', 'child_role_id', name='uq_role_hierarchy'),
        Index('idx_role_hierarchy_parent', 'parent_role_id'),
        Index('idx_role_hierarchy_child', 'child_role_id'),
    )
    
    def __init__(self, parent_role_id: int, child_role_id: int, **kwargs):
        """Initialize role hierarchy relationship."""
        self.parent_role_id = parent_role_id
        self.child_role_id = child_role_id
        
        # Set all other fields
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def __repr__(self) -> str:
        """String representation of role hierarchy."""
        return f"<RoleHierarchy(parent={self.parent_role_id}, child={self.child_role_id})>"


# Update User model to include RBAC relationships
# This extends the existing User model with RBAC relationships
def extend_user_model():
    """Extend the User model with RBAC relationships."""
    from .user import User
    
    # Add relationships to User model
    if not hasattr(User, 'user_roles'):
        User.user_roles = relationship("UserRole", foreign_keys="UserRole.user_id", cascade="all, delete-orphan")
    
    # Add RBAC-related methods to User
    def get_roles(self, db_session) -> List[Role]:
        """Get all active roles for this user."""
        user_roles = db_session.query(UserRole).filter(
            UserRole.user_id == self.id,
            UserRole.is_active == True
        ).all()
        return [ur.role for ur in user_roles if not ur.is_expired]
    
    def get_primary_role(self, db_session) -> Optional[Role]:
        """Get the primary role for this user."""
        primary_ur = db_session.query(UserRole).filter(
            UserRole.user_id == self.id,
            UserRole.is_primary == True,
            UserRole.is_active == True
        ).first()
        return primary_ur.role if primary_ur and not primary_ur.is_expired else None
    
    def has_role(self, role_name: str, db_session) -> bool:
        """Check if user has a specific role."""
        return any(role.name == role_name for role in self.get_roles(db_session))
    
    def get_all_permissions(self, db_session) -> Set[str]:
        """Get all permissions for this user from all assigned roles."""
        permissions = set()
        for role in self.get_roles(db_session):
            permissions.update(role.get_permission_names(db_session))
        return permissions
    
    def has_permission(self, permission_name: str, db_session) -> bool:
        """Check if user has a specific permission."""
        return permission_name in self.get_all_permissions(db_session)
    
    def get_highest_hierarchy_level(self, db_session) -> int:
        """Get the highest hierarchy level from all user's roles."""
        roles = self.get_roles(db_session)
        return max(role.hierarchy_level for role in roles) if roles else 0
    
    def can_manage_user(self, other_user: "User", db_session) -> bool:
        """Check if this user can manage another user based on role hierarchy."""
        return self.get_highest_hierarchy_level(db_session) > other_user.get_highest_hierarchy_level(db_session)
    
    # Add methods to User class
    User.get_roles = get_roles
    User.get_primary_role = get_primary_role
    User.has_role = has_role
    User.get_all_permissions = get_all_permissions
    User.has_permission = has_permission
    User.get_highest_hierarchy_level = get_highest_hierarchy_level
    User.can_manage_user = can_manage_user


# Initialize the extension when the module is imported
extend_user_model()