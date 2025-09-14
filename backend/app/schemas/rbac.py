"""
Pydantic schemas for RBAC (Role-Based Access Control) system.

This module defines request/response schemas for the RBAC API endpoints
including validation rules and serialization formats.
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Set, Dict, Any
from datetime import datetime
from enum import Enum


class RoleHierarchyLevel(int, Enum):
    """Enumeration of role hierarchy levels."""
    VIEWER = 1
    USER = 2
    MANAGER = 3
    ADMIN = 4
    SUPER_ADMIN = 5


class PermissionAction(str, Enum):
    """Enumeration of permission actions."""
    READ = "read"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    ADMIN = "admin"


class ResourceType(str, Enum):
    """Enumeration of resource types."""
    DOCUMENTS = "documents"
    USERS = "users"
    ROLES = "roles"
    SYSTEM = "system"
    FOLDERS = "folders"


class SubjectType(str, Enum):
    """Enumeration of permission subject types."""
    USER = "user"
    ROLE = "role"


# Base schemas
class PermissionBase(BaseModel):
    """Base schema for permissions."""
    name: str = Field(..., min_length=3, max_length=100, description="Permission name (e.g., 'documents:read')")
    display_name: Optional[str] = Field(None, max_length=100, description="Human-readable permission name")
    description: Optional[str] = Field(None, description="Permission description")
    resource_type: str = Field(..., description="Resource type this permission applies to")
    action: str = Field(..., description="Action this permission allows")
    requires_resource_ownership: bool = Field(False, description="Whether permission requires owning the resource")

    @validator('name')
    def validate_permission_name(cls, v):
        """Validate permission name format."""
        if ':' not in v:
            raise ValueError("Permission name must follow format 'resource:action'")
        
        parts = v.split(':')
        if len(parts) != 2:
            raise ValueError("Permission name must follow format 'resource:action'")
        
        resource, action = parts
        if not resource or not action:
            raise ValueError("Both resource and action must be non-empty")
        
        return v.lower()


class PermissionCreate(PermissionBase):
    """Schema for creating new permissions."""
    pass


class PermissionUpdate(BaseModel):
    """Schema for updating permissions."""
    display_name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    requires_resource_ownership: Optional[bool] = None


class Permission(PermissionBase):
    """Schema for permission responses."""
    id: int
    is_system: bool = Field(description="Whether this is a system permission")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Role schemas
class RoleBase(BaseModel):
    """Base schema for roles."""
    name: str = Field(..., min_length=2, max_length=50, description="Role name")
    display_name: Optional[str] = Field(None, max_length=100, description="Human-readable role name")
    description: Optional[str] = Field(None, description="Role description")
    hierarchy_level: Optional[int] = Field(None, ge=1, le=5, description="Role hierarchy level (1-5)")

    @validator('name')
    def validate_role_name(cls, v):
        """Validate role name format."""
        if not v.replace('_', '').isalnum():
            raise ValueError("Role name can only contain letters, numbers, and underscores")
        return v.lower()


class RoleCreate(RoleBase):
    """Schema for creating new roles."""
    permissions: Optional[List[str]] = Field(default_factory=list, description="List of permission names to assign")


class RoleUpdate(BaseModel):
    """Schema for updating roles."""
    display_name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None
    permissions: Optional[List[str]] = Field(None, description="List of permission names to assign")


class Role(RoleBase):
    """Schema for role responses."""
    id: int
    hierarchy_level: int = Field(description="Role hierarchy level")
    is_system: bool = Field(description="Whether this is a system role")
    is_active: bool = Field(description="Whether this role is active")
    created_at: datetime
    updated_at: datetime
    permissions: List[Permission] = Field(default_factory=list, description="Permissions assigned to this role")

    class Config:
        from_attributes = True


class RoleWithStats(Role):
    """Schema for role responses with usage statistics."""
    user_count: int = Field(description="Number of users with this role")
    permission_count: int = Field(description="Number of permissions assigned to this role")


# User role assignment schemas
class UserRoleAssignmentBase(BaseModel):
    """Base schema for user role assignments."""
    user_id: int = Field(..., description="ID of the user")
    role_id: int = Field(..., description="ID of the role")
    is_primary: bool = Field(True, description="Whether this is the user's primary role")
    expires_at: Optional[datetime] = Field(None, description="When this role assignment expires")


class UserRoleAssignment(UserRoleAssignmentBase):
    """Schema for user role assignment requests."""
    pass


class UserRoleAssignmentResponse(UserRoleAssignmentBase):
    """Schema for user role assignment responses."""
    assigned_at: datetime
    assigned_by: Optional[int] = Field(None, description="ID of user who made the assignment")
    is_active: bool = Field(description="Whether this assignment is active")
    role: Role = Field(description="Role details")

    class Config:
        from_attributes = True


# Resource permission schemas
class ResourcePermissionBase(BaseModel):
    """Base schema for resource permissions."""
    resource_type: str = Field(..., description="Type of resource")
    resource_id: int = Field(..., description="ID of the specific resource")
    subject_type: SubjectType = Field(..., description="Type of subject (user or role)")
    subject_id: int = Field(..., description="ID of the subject")
    permission: str = Field(..., description="Permission level")
    granted: bool = Field(True, description="Whether permission is granted or denied")
    inheritable: bool = Field(True, description="Whether permission can be inherited")
    expires_at: Optional[datetime] = Field(None, description="When this permission expires")
    conditions: Optional[Dict[str, Any]] = Field(None, description="Conditional access rules")


class ResourcePermissionCreate(ResourcePermissionBase):
    """Schema for creating resource permissions."""
    pass


class ResourcePermissionUpdate(BaseModel):
    """Schema for updating resource permissions."""
    permission: Optional[str] = None
    granted: Optional[bool] = None
    inheritable: Optional[bool] = None
    expires_at: Optional[datetime] = None
    conditions: Optional[Dict[str, Any]] = None


class ResourcePermission(ResourcePermissionBase):
    """Schema for resource permission responses."""
    id: int
    granted_at: datetime
    granted_by: Optional[int] = Field(None, description="ID of user who granted permission")
    inherited_from: Optional[int] = Field(None, description="ID of parent permission if inherited")

    class Config:
        from_attributes = True


# Permission check schemas
class PermissionCheckRequest(BaseModel):
    """Schema for permission check requests."""
    user_id: int = Field(..., description="ID of the user")
    permission: str = Field(..., description="Permission to check")
    resource_type: Optional[str] = Field(None, description="Type of resource")
    resource_id: Optional[int] = Field(None, description="ID of specific resource")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context for permission check")


class PermissionCheckResponse(BaseModel):
    """Schema for permission check responses."""
    granted: bool = Field(description="Whether permission is granted")
    reason: str = Field(description="Reason for grant or denial")
    source: str = Field(description="Source of permission (role, resource, etc.)")
    expires_at: Optional[datetime] = Field(None, description="When permission expires")


# Bulk operation schemas
class BulkRoleAssignment(BaseModel):
    """Schema for bulk role assignments."""
    user_ids: List[int] = Field(..., min_items=1, description="List of user IDs")
    role_name: str = Field(..., description="Role name to assign")
    is_primary: bool = Field(False, description="Whether to set as primary role")
    expires_at: Optional[datetime] = Field(None, description="When assignments expire")


class BulkRoleAssignmentResponse(BaseModel):
    """Schema for bulk role assignment responses."""
    successful: List[int] = Field(description="User IDs successfully assigned")
    failed: List[Dict[str, Any]] = Field(description="Failed assignments with reasons")
    total_processed: int = Field(description="Total number of users processed")


class BulkPermissionGrant(BaseModel):
    """Schema for bulk permission grants."""
    subject_type: SubjectType = Field(..., description="Type of subjects")
    subject_ids: List[int] = Field(..., min_items=1, description="List of subject IDs")
    resource_type: str = Field(..., description="Type of resources")
    resource_ids: List[int] = Field(..., min_items=1, description="List of resource IDs")
    permission: str = Field(..., description="Permission to grant")
    expires_at: Optional[datetime] = Field(None, description="When permissions expire")


# Audit and reporting schemas
class RoleAuditEntry(BaseModel):
    """Schema for role audit log entries."""
    id: int
    user_id: int
    role_name: str
    action: str = Field(description="Action performed (assign, revoke, create, delete)")
    performed_by: int = Field(description="ID of user who performed the action")
    performed_at: datetime
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details")

    class Config:
        from_attributes = True


class PermissionAuditEntry(BaseModel):
    """Schema for permission audit log entries."""
    id: int
    user_id: int
    permission: str
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    granted: bool = Field(description="Whether permission was granted")
    checked_at: datetime
    source: str = Field(description="Source of permission decision")

    class Config:
        from_attributes = True


class AccessDeniedLog(BaseModel):
    """Schema for access denied log entries."""
    id: int
    user_id: int
    attempted_action: str
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    reason: str = Field(description="Reason for denial")
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    attempted_at: datetime

    class Config:
        from_attributes = True


# Statistics and reporting schemas
class RoleStatistics(BaseModel):
    """Schema for role usage statistics."""
    role_name: str
    user_count: int = Field(description="Number of users with this role")
    permission_count: int = Field(description="Number of permissions assigned")
    hierarchy_level: int
    is_active: bool
    created_at: datetime


class UserPermissionSummary(BaseModel):
    """Schema for user permission summary."""
    user_id: int
    username: str
    primary_role: Optional[str] = Field(None, description="Primary role name")
    all_roles: List[str] = Field(description="All assigned role names")
    permission_count: int = Field(description="Total number of permissions")
    highest_hierarchy_level: int = Field(description="Highest role hierarchy level")
    last_login: Optional[datetime] = None


class SystemPermissionMatrix(BaseModel):
    """Schema for system-wide permission matrix."""
    roles: List[Role] = Field(description="All system roles")
    permissions: List[Permission] = Field(description="All system permissions")
    matrix: Dict[str, List[str]] = Field(description="Role -> Permission mappings")
    hierarchy: Dict[str, int] = Field(description="Role hierarchy levels")


# Response wrapper schemas
class RoleListResponse(BaseModel):
    """Schema for paginated role list responses."""
    roles: List[RoleWithStats]
    total: int = Field(description="Total number of roles")
    page: int = Field(description="Current page number")
    size: int = Field(description="Page size")
    has_next: bool = Field(description="Whether there are more pages")


class PermissionListResponse(BaseModel):
    """Schema for paginated permission list responses."""
    permissions: List[Permission]
    total: int = Field(description="Total number of permissions")
    page: int = Field(description="Current page number")
    size: int = Field(description="Page size")
    has_next: bool = Field(description="Whether there are more pages")


class UserRoleListResponse(BaseModel):
    """Schema for user role list responses."""
    user_roles: List[UserRoleAssignmentResponse]
    total: int = Field(description="Total number of role assignments")
    user_id: int = Field(description="User ID")
    username: str = Field(description="Username")


# Error schemas
class RBACError(BaseModel):
    """Schema for RBAC-specific errors."""
    error_code: str = Field(description="Error code")
    message: str = Field(description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")


class ValidationError(BaseModel):
    """Schema for validation errors."""
    field: str = Field(description="Field that failed validation")
    message: str = Field(description="Validation error message")
    rejected_value: Any = Field(description="Value that was rejected")


# Configuration schemas
class RBACConfig(BaseModel):
    """Schema for RBAC system configuration."""
    enable_resource_permissions: bool = Field(True, description="Enable resource-level permissions")
    enable_temporary_roles: bool = Field(True, description="Enable temporary role assignments")
    enable_conditional_permissions: bool = Field(False, description="Enable conditional permissions")
    default_role: str = Field("user", description="Default role for new users")
    audit_all_checks: bool = Field(False, description="Audit all permission checks")
    cache_permissions: bool = Field(True, description="Cache permission lookups")
    cache_ttl_seconds: int = Field(300, description="Permission cache TTL in seconds")