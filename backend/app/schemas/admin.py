"""
Admin API schemas for SecureVault.

This module defines Pydantic schemas for admin operations including:
- User management (create, update, list responses)
- System monitoring (health, metrics responses)  
- Audit and compliance (log responses, reports)
- Bulk operations and administrative functions
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, EmailStr, Field, validator


# User Management Schemas
class UserCreate(BaseModel):
    """Schema for creating a new user."""
    username: str = Field(..., min_length=3, max_length=50, description="Username")
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., min_length=8, description="Login password")
    encryption_password: Optional[str] = Field(None, description="Encryption password for zero-knowledge storage (defaults to login password if not provided)")
    is_active: bool = Field(True, description="Whether user is active")
    is_verified: bool = Field(False, description="Whether user email is verified")
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password complexity."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

    @validator('encryption_password')
    def validate_encryption_password(cls, v):
        """Validate encryption password complexity if provided."""
        if v is not None and len(v) < 8:
            raise ValueError('Encryption password must be at least 8 characters long')
        return v


class UserUpdate(BaseModel):
    """Schema for updating an existing user."""
    email: Optional[EmailStr] = Field(None, description="Email address")
    password: Optional[str] = Field(None, min_length=8, description="New password")
    is_active: Optional[bool] = Field(None, description="Whether user is active")
    is_verified: Optional[bool] = Field(None, description="Whether user email is verified")
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password complexity if provided."""
        if v is not None and len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v


class UserResponse(BaseModel):
    """Schema for user response data."""
    id: int = Field(..., description="User ID")
    username: str = Field(..., description="Username")
    email: str = Field(..., description="Email address")
    first_name: str = Field("", description="First name (placeholder)")
    last_name: str = Field("", description="Last name (placeholder)")
    is_active: bool = Field(..., description="Whether user is active")
    is_verified: bool = Field(..., description="Whether user email is verified")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    login_count: int = Field(0, description="Number of logins")
    is_mfa_enabled: bool = Field(False, description="Whether MFA is enabled")

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """Schema for paginated user list response."""
    users: List[UserResponse] = Field(..., description="List of users")
    total: int = Field(..., description="Total number of users")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    has_next: bool = Field(..., description="Whether there are more pages")


class PasswordResetRequest(BaseModel):
    """Schema for password reset request."""
    new_password: str = Field(..., min_length=8, description="New password")
    force_change_on_login: bool = Field(False, description="Force password change on next login")
    
    @validator('new_password')
    def validate_password(cls, v):
        """Validate password complexity."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v


class BulkUserOperation(BaseModel):
    """Schema for bulk user operations."""
    operation: str = Field(..., description="Operation type", pattern="^(activate|deactivate|force_password_reset|enable_mfa)$")
    user_ids: List[int] = Field(..., min_items=1, description="List of user IDs")


# System Monitoring Schemas
class ComponentStatus(BaseModel):
    """Schema for individual component status."""
    status: str = Field(..., description="Component status")
    response_time_ms: Optional[float] = Field(None, description="Response time in milliseconds")
    usage_percent: Optional[float] = Field(None, description="Usage percentage")
    total_gb: Optional[float] = Field(None, description="Total capacity in GB")
    available_gb: Optional[float] = Field(None, description="Available capacity in GB")
    free_gb: Optional[float] = Field(None, description="Free capacity in GB")


class SystemHealthResponse(BaseModel):
    """Schema for system health response."""
    status: str = Field(..., description="Overall system status")
    timestamp: datetime = Field(..., description="Health check timestamp")
    components: Dict[str, ComponentStatus] = Field(..., description="Component statuses")


class SystemMetricsResponse(BaseModel):
    """Schema for system metrics response."""
    timestamp: datetime = Field(..., description="Metrics timestamp")
    cpu_usage: float = Field(..., description="CPU usage percentage")
    memory_usage: float = Field(..., description="Memory usage percentage")
    disk_usage: float = Field(..., description="Disk usage percentage")
    database_stats: Dict[str, Union[int, float]] = Field(..., description="Database statistics")
    activity_stats: Dict[str, int] = Field(..., description="Activity statistics")
    uptime_seconds: float = Field(..., description="System uptime in seconds")


# Audit and Compliance Schemas
class AuditLogResponse(BaseModel):
    """Schema for audit log response."""
    id: int = Field(..., description="Log entry ID")
    document_id: Optional[int] = Field(None, description="Document ID")
    user_id: int = Field(..., description="User ID")
    action: str = Field(..., description="Action performed")
    access_method: Optional[str] = Field(None, description="Access method")
    success: bool = Field(..., description="Whether action was successful")
    accessed_at: datetime = Field(..., description="Access timestamp")
    ip_address: Optional[str] = Field(None, description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional details")
    error_message: Optional[str] = Field(None, description="Error message if failed")

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    """Schema for paginated audit log list response."""
    logs: List[AuditLogResponse] = Field(..., description="List of audit logs")
    total: int = Field(..., description="Total number of logs")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    has_next: bool = Field(..., description="Whether there are more pages")


class ComplianceReportResponse(BaseModel):
    """Schema for compliance report response."""
    report_id: str = Field(..., description="Report ID")
    report_type: str = Field(..., description="Report type")
    generated_at: datetime = Field(..., description="Generation timestamp")
    data: Dict[str, Any] = Field(..., description="Report data")


class UserActivityResponse(BaseModel):
    """Schema for user activity response."""
    user_id: int = Field(..., description="User ID")
    username: str = Field(..., description="Username")
    period_days: int = Field(..., description="Period covered in days")
    statistics: Dict[str, Union[int, str, None]] = Field(..., description="Activity statistics")
    recent_activity: List[Dict[str, Any]] = Field(..., description="Recent activity log")


# Error Response Schema
class AdminErrorResponse(BaseModel):
    """Schema for admin API error responses."""
    detail: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Error code")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")


# Success Response Schema
class AdminSuccessResponse(BaseModel):
    """Schema for admin API success responses."""
    message: str = Field(..., description="Success message")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional data")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")