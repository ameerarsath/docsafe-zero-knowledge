"""
MFA-related database models for SecureVault.

This module defines database models for MFA operations including
used TOTP codes tracking and MFA audit logs.
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime

from ..core.database import Base


class MFAUsedCode(Base):
    """
    Model for tracking used TOTP codes to prevent replay attacks.
    
    This table stores recently used TOTP codes with expiration to prevent
    the same code from being used multiple times within its validity window.
    """
    
    __tablename__ = "mfa_used_codes"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # User reference
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # TOTP code information
    code_hash = Column(String(255), nullable=False)  # Hashed TOTP code
    time_window = Column(Integer, nullable=False)  # TOTP time window
    
    # Timestamps
    used_at = Column(DateTime, default=func.now(), nullable=False)
    expires_at = Column(DateTime, nullable=False)  # When this record expires
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_mfa_used_codes_user_time', 'user_id', 'time_window'),
        Index('idx_mfa_used_codes_expires', 'expires_at'),
    )
    
    # Relationship
    user = relationship("User")


class MFAAuditLog(Base):
    """
    Model for MFA audit logging.
    
    This table tracks all MFA-related events for security auditing
    and compliance reporting.
    """
    
    __tablename__ = "mfa_audit_logs"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # User reference
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Event information
    event_type = Column(String(50), nullable=False, index=True)  # setup, verify, disable, reset, etc.
    event_result = Column(String(20), nullable=False)  # success, failure, error
    event_details = Column(Text, nullable=True)  # Additional event details (JSON)
    
    # Context information
    ip_address = Column(String(45), nullable=True)  # IPv4/IPv6 address
    user_agent = Column(String(500), nullable=True)  # Browser/client info
    session_id = Column(String(255), nullable=True)  # Session identifier
    
    # Admin actions
    performed_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # For admin actions
    
    # Timestamp
    created_at = Column(DateTime, default=func.now(), nullable=False, index=True)
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_mfa_audit_user_time', 'user_id', 'created_at'),
        Index('idx_mfa_audit_event_time', 'event_type', 'created_at'),
    )
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    performed_by_user = relationship("User", foreign_keys=[performed_by])


class MFAConfiguration(Base):
    """
    Model for system-wide MFA configuration settings.
    
    This table stores MFA policy settings that can be configured
    by administrators.
    """
    
    __tablename__ = "mfa_configuration"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Configuration settings
    require_mfa_for_roles = Column(Text, nullable=True)  # JSON array of roles
    mfa_grace_period_hours = Column(Integer, default=24, nullable=False)  # Grace period for setup
    backup_codes_count = Column(Integer, default=10, nullable=False)  # Number of backup codes
    totp_window_tolerance = Column(Integer, default=1, nullable=False)  # Time drift tolerance
    
    # Rate limiting settings
    max_failed_attempts = Column(Integer, default=5, nullable=False)
    lockout_duration_minutes = Column(Integer, default=15, nullable=False)
    
    # Audit fields
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relationship
    updated_by_user = relationship("User")


class MFAFailedAttempt(Base):
    """
    Model for tracking failed MFA attempts for rate limiting.
    
    This table stores failed MFA verification attempts to implement
    rate limiting and account protection.
    """
    
    __tablename__ = "mfa_failed_attempts"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # User reference
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Attempt information
    attempt_type = Column(String(20), nullable=False)  # totp, backup_code
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Timestamp
    attempted_at = Column(DateTime, default=func.now(), nullable=False, index=True)
    
    # Indexes for performance
    __table_args__ = (
        Index('idx_mfa_failed_user_time', 'user_id', 'attempted_at'),
    )
    
    # Relationship
    user = relationship("User")


# Update User model relationships (this would be added to user.py)
"""
Add these relationships to the User model:

# MFA relationships
mfa_used_codes = relationship("MFAUsedCode", back_populates="user", cascade="all, delete-orphan")
mfa_audit_logs = relationship("MFAAuditLog", foreign_keys="MFAAuditLog.user_id", back_populates="user", cascade="all, delete-orphan")
mfa_failed_attempts = relationship("MFAFailedAttempt", back_populates="user", cascade="all, delete-orphan")
"""