"""
Authentication schemas for SecureVault API.

This module defines Pydantic models for authentication-related
request/response objects and data validation.
"""

from pydantic import BaseModel, EmailStr, validator, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class LoginRequest(BaseModel):
    """Schema for login request payload."""
    
    username: str = Field(..., min_length=1, max_length=50, description="Username")
    password: str = Field(..., min_length=1, description="Password")
    
    @validator('username')
    def validate_username(cls, v):
        """Validate username format."""
        if not v or v.isspace():
            raise ValueError('Username cannot be empty or whitespace')
        return v.strip()
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password is not empty."""
        if not v:
            raise ValueError('Password cannot be empty')
        return v


class LoginResponse(BaseModel):
    """Schema for successful login response."""
    
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")
    user_id: int = Field(..., description="User ID")
    username: str = Field(..., description="Username")
    role: str = Field(..., description="User role")
    must_change_password: bool = Field(default=False, description="Whether user must change password")
    mfa_required: Optional[bool] = Field(None, description="Whether MFA is required")
    temp_token: Optional[str] = Field(None, description="Temporary token for MFA completion")
    
    # Zero-Knowledge specific fields (returned after stage 1 login)
    encryption_salt: Optional[str] = Field(None, description="Base64 encoded salt for key derivation")
    key_verification_payload: Optional[str] = Field(None, description="Encrypted payload for key verification")
    encryption_method: Optional[str] = Field(None, description="Key derivation method")
    key_derivation_iterations: Optional[int] = Field(None, description="PBKDF2 iterations count")


class TokenData(BaseModel):
    """Schema for token payload data."""
    
    username: Optional[str] = None
    user_id: Optional[int] = None
    role: Optional[str] = None
    permissions: List[str] = Field(default_factory=list)


class TokenRefreshRequest(BaseModel):
    """Schema for token refresh request."""
    
    refresh_token: str = Field(..., description="Refresh token")


class TokenRefreshResponse(BaseModel):
    """Schema for token refresh response."""
    
    access_token: str = Field(..., description="New JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")


class MFAVerificationRequest(BaseModel):
    """Schema for MFA verification request."""
    
    temp_token: str = Field(..., description="Temporary token from initial login")
    mfa_code: str = Field(..., min_length=6, max_length=6, description="6-digit TOTP code")
    
    @validator('mfa_code')
    def validate_mfa_code(cls, v):
        """Validate MFA code format."""
        if not v.isdigit():
            raise ValueError('MFA code must be 6 digits')
        return v


class MFASetupRequest(BaseModel):
    """Schema for MFA setup request."""
    
    password: str = Field(..., description="User's current password for verification")


class MFASetupResponse(BaseModel):
    """Schema for MFA setup response."""
    
    secret: str = Field(..., description="TOTP secret key")
    qr_code_url: str = Field(..., description="QR code URL for authenticator apps")
    backup_codes: List[str] = Field(..., description="One-time backup codes")


class PasswordChangeRequest(BaseModel):
    """Schema for password change request."""
    
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=10, description="New password")
    confirm_password: str = Field(..., description="Password confirmation")
    
    @validator('confirm_password')
    def validate_passwords_match(cls, v, values):
        """Validate that passwords match."""
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v


class UserCreate(BaseModel):
    """Schema for user creation (admin only)."""
    
    username: str = Field(..., min_length=3, max_length=50, description="Username")
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., min_length=10, description="Initial password")
    role: str = Field(default="user", description="User role")
    full_name: Optional[str] = Field(None, max_length=100, description="Full name")
    department: Optional[str] = Field(None, max_length=100, description="Department")
    must_change_password: bool = Field(default=True, description="Force password change on first login")
    
    @validator('role')
    def validate_role(cls, v):
        """Validate role is allowed."""
        allowed_roles = {'super_admin', 'admin', 'manager', 'user', 'viewer'}
        if v not in allowed_roles:
            raise ValueError(f'Role must be one of: {allowed_roles}')
        return v


class ZeroKnowledgeRegistrationRequest(BaseModel):
    """Schema for zero-knowledge registration request."""
    
    # Standard login credentials
    username: str = Field(..., min_length=3, max_length=50, description="Username")
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., min_length=10, description="Login password")
    full_name: Optional[str] = Field(None, max_length=100, description="Full name")
    
    # Zero-Knowledge encryption fields
    encryption_salt: str = Field(..., description="Base64 encoded salt for PBKDF2 (32 bytes)")
    key_verification_payload: str = Field(..., description="Encrypted verification payload")
    encryption_method: str = Field(default="PBKDF2-SHA256", description="Key derivation method")
    key_derivation_iterations: int = Field(default=500000, ge=100000, description="PBKDF2 iterations")
    
    @validator('encryption_salt')
    def validate_salt(cls, v):
        """Validate salt format and length."""
        import base64
        try:
            decoded = base64.b64decode(v)
            if len(decoded) != 32:
                raise ValueError('Salt must be exactly 32 bytes when base64 decoded')
            return v
        except Exception:
            raise ValueError('Salt must be valid base64 encoded 32 bytes')
    
    @validator('encryption_method')
    def validate_encryption_method(cls, v):
        """Validate encryption method."""
        allowed_methods = {'PBKDF2-SHA256'}
        if v not in allowed_methods:
            raise ValueError(f'Encryption method must be one of: {allowed_methods}')
        return v


class ZeroKnowledgeRegistrationResponse(BaseModel):
    """Schema for zero-knowledge registration response."""
    
    message: str = Field(..., description="Success message")
    user_id: int = Field(..., description="Created user ID")
    username: str = Field(..., description="Username")
    encryption_configured: bool = Field(default=True, description="Whether encryption is configured")


class UserResponse(BaseModel):
    """Schema for user data response."""
    
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    is_verified: bool
    mfa_enabled: bool
    last_login: Optional[datetime]
    created_at: datetime
    full_name: Optional[str]
    department: Optional[str]
    must_change_password: bool
    
    class Config:
        """Pydantic configuration."""
        from_attributes = True


class SimpleRegistrationRequest(BaseModel):
    """Schema for simplified registration request."""
    
    username: str = Field(..., min_length=3, max_length=50, description="Username")
    email: EmailStr = Field(..., description="Email address")
    password: str = Field(..., min_length=10, description="Login password")
    encryption_password: str = Field(..., min_length=10, description="Encryption password")
    full_name: Optional[str] = Field(None, max_length=100, description="Full name")


class ErrorResponse(BaseModel):
    """Schema for error responses."""
    
    detail: str = Field(..., description="Error message")
    error_code: Optional[str] = Field(None, description="Specific error code")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")


class SessionData(BaseModel):
    """Schema for session data stored in Redis."""
    
    user_id: int
    username: str
    role: str
    login_time: datetime
    last_activity: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    class Config:
        """Pydantic configuration."""
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }