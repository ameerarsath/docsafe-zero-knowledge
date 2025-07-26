"""
Pydantic schemas for MFA (Multi-Factor Authentication) operations.

This module defines request/response schemas for MFA-related API endpoints
including TOTP setup, verification, backup codes, and status checking.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, validator


class MFASetupRequest(BaseModel):
    """Request schema for MFA setup."""
    
    password: str = Field(..., description="User's current password for verification")
    issuer: Optional[str] = Field(
        default="SecureVault",
        description="Issuer name for TOTP (shown in authenticator app)"
    )


class MFASetupResponse(BaseModel):
    """Response schema for MFA setup."""
    
    secret: str = Field(..., description="Base32-encoded TOTP secret")
    qr_code_url: str = Field(..., description="TOTP provisioning URI for QR code")
    qr_code_data_uri: str = Field(..., description="QR code as data URI for display")
    backup_codes: List[str] = Field(..., description="Recovery backup codes")
    
    class Config:
        """Pydantic configuration."""
        json_encoders = {
            # Don't log the secret or backup codes in responses
        }


class MFAVerifyRequest(BaseModel):
    """Request schema for MFA code verification."""
    
    code: str = Field(
        ...,
        min_length=6,
        max_length=8,
        description="TOTP code or backup code"
    )
    
    @validator('code')
    def validate_code_format(cls, v):
        """Validate MFA code format."""
        if not v.isalnum():
            raise ValueError('Code must be alphanumeric')
        return v.upper()


class MFAVerifyResponse(BaseModel):
    """Response schema for MFA verification."""
    
    verified: bool = Field(..., description="Whether code was valid")
    backup_code_used: bool = Field(
        default=False,
        description="Whether a backup code was used"
    )
    backup_codes_remaining: int = Field(
        default=0,
        description="Number of unused backup codes remaining"
    )


class MFADisableRequest(BaseModel):
    """Request schema for disabling MFA."""
    
    password: str = Field(..., description="User's current password for verification")
    admin_override: Optional[bool] = Field(
        default=False,
        description="Admin override flag (admin users only)"
    )


class MFAStatus(BaseModel):
    """Schema for MFA status information."""
    
    enabled: bool = Field(..., description="Whether MFA is enabled")
    setup_date: Optional[datetime] = Field(
        None,
        description="When MFA was first enabled"
    )
    backup_codes_remaining: int = Field(
        default=0,
        description="Number of unused backup codes"
    )
    last_used: Optional[datetime] = Field(
        None,
        description="When MFA was last used for authentication"
    )
    required_by_policy: bool = Field(
        default=False,
        description="Whether MFA is required by admin policy"
    )


class BackupCodesRequest(BaseModel):
    """Request schema for generating new backup codes."""
    
    password: str = Field(..., description="User's current password for verification")
    count: Optional[int] = Field(
        default=10,
        ge=5,
        le=20,
        description="Number of backup codes to generate"
    )


class BackupCodesResponse(BaseModel):
    """Response schema for backup codes generation."""
    
    backup_codes: List[str] = Field(..., description="New backup codes")
    codes_replaced: int = Field(
        default=0,
        description="Number of old codes that were replaced"
    )
    
    class Config:
        """Pydantic configuration."""
        # In production, consider not including codes in response logs
        pass


class MFAResetRequest(BaseModel):
    """Request schema for admin MFA reset."""
    
    user_id: int = Field(..., description="User ID to reset MFA for")
    reason: str = Field(
        ...,
        min_length=10,
        max_length=500,
        description="Reason for MFA reset (for audit log)"
    )


class MFAResetResponse(BaseModel):
    """Response schema for MFA reset."""
    
    success: bool = Field(..., description="Whether reset was successful")
    user_id: int = Field(..., description="User ID that was reset")
    reset_by: int = Field(..., description="Admin user ID who performed reset")
    reset_at: datetime = Field(..., description="When the reset occurred")


class QRCodeRequest(BaseModel):
    """Request schema for QR code generation."""
    
    format: Optional[str] = Field(
        default="data_uri",
        pattern="^(data_uri|png|svg)$",
        description="QR code format: data_uri, png, or svg"
    )
    size: Optional[int] = Field(
        default=10,
        ge=5,
        le=20,
        description="QR code module size"
    )


class QRCodeResponse(BaseModel):
    """Response schema for QR code generation."""
    
    qr_code: str = Field(..., description="QR code in requested format")
    format: str = Field(..., description="Format of the QR code")
    provisioning_uri: str = Field(..., description="TOTP provisioning URI")


class MFAStatsResponse(BaseModel):
    """Response schema for MFA statistics (admin only)."""
    
    total_users: int = Field(..., description="Total number of users")
    mfa_enabled_users: int = Field(..., description="Users with MFA enabled")
    mfa_enabled_percentage: float = Field(..., description="Percentage with MFA enabled")
    backup_codes_exhausted: int = Field(
        default=0,
        description="Users with all backup codes used"
    )
    recent_mfa_setups: int = Field(
        default=0,
        description="MFA setups in last 30 days"
    )


class MFAConfigRequest(BaseModel):
    """Request schema for MFA configuration (admin only)."""
    
    require_mfa_for_roles: Optional[List[str]] = Field(
        default=None,
        description="Roles that require MFA"
    )
    mfa_grace_period_hours: Optional[int] = Field(
        default=24,
        ge=0,
        le=168,  # 1 week max
        description="Grace period for MFA setup (hours)"
    )
    backup_codes_count: Optional[int] = Field(
        default=10,
        ge=5,
        le=20,
        description="Number of backup codes to generate"
    )
    totp_window_tolerance: Optional[int] = Field(
        default=1,
        ge=0,
        le=3,
        description="TOTP time window tolerance"
    )


class MFAConfigResponse(BaseModel):
    """Response schema for MFA configuration."""
    
    require_mfa_for_roles: List[str] = Field(
        default_factory=list,
        description="Roles that require MFA"
    )
    mfa_grace_period_hours: int = Field(
        default=24,
        description="Grace period for MFA setup (hours)"
    )
    backup_codes_count: int = Field(
        default=10,
        description="Number of backup codes to generate"
    )
    totp_window_tolerance: int = Field(
        default=1,
        description="TOTP time window tolerance"
    )
    updated_by: Optional[int] = Field(
        None,
        description="Admin user who last updated config"
    )
    updated_at: Optional[datetime] = Field(
        None,
        description="When config was last updated"
    )


class MFAHealthResponse(BaseModel):
    """Response schema for MFA health check."""
    
    totp_service_available: bool = Field(..., description="TOTP service status")
    qr_code_service_available: bool = Field(..., description="QR code service status")
    backup_codes_service_available: bool = Field(..., description="Backup codes service status")
    database_connection: bool = Field(..., description="Database connection status")
    rate_limiting_active: bool = Field(..., description="Rate limiting status")
    
    errors: List[str] = Field(
        default_factory=list,
        description="Any service errors detected"
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Any service warnings"
    )