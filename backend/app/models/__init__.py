"""
Models package initialization.

This module imports all SQLAlchemy models to ensure they are registered
with the Base metadata for table creation and migrations.
"""

from .user import User
from .token import TokenFamily
from .mfa import MFAUsedCode, MFAAuditLog, MFAFailedAttempt
from .rbac import (
    Role, 
    Permission, 
    RolePermission, 
    UserRole, 
    ResourcePermission, 
    RoleHierarchy
)
from .document import (
    Document,
    DocumentPermission,
    DocumentShare,
    DocumentVersion,
    DocumentAccessLog
)

# Ensure RBAC model extensions are applied
from .rbac import extend_user_model
extend_user_model()

__all__ = [
    "User",
    "TokenFamily",
    "MFAUsedCode",
    "MFAAuditLog", 
    "MFAFailedAttempt",
    "Role",
    "Permission",
    "RolePermission",
    "UserRole",
    "ResourcePermission",
    "RoleHierarchy",
    "Document",
    "DocumentPermission",
    "DocumentShare",
    "DocumentVersion",
    "DocumentAccessLog"
]