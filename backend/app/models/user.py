"""
User model for SecureVault authentication system.

This module defines the User SQLAlchemy model with all required fields
for authentication, authorization, and user management.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from typing import Optional

from ..core.database import Base


class User(Base):
    """User model for authentication and authorization."""
    
    __tablename__ = "users"
    
    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Authentication fields
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    # Zero-Knowledge Encryption fields (separate from login authentication)
    encryption_salt = Column(String(64), nullable=True)  # Base64 encoded salt for PBKDF2
    key_verification_payload = Column(Text, nullable=True)  # Encrypted payload to verify encryption key
    encryption_method = Column(String(50), default='PBKDF2-SHA256', nullable=False)
    key_derivation_iterations = Column(Integer, default=500000, nullable=False)
    
    # User status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    must_change_password = Column(Boolean, default=True, nullable=False)
    
    # Role-based access control
    role = Column(String(50), default="user", nullable=False)
    
    # Multi-factor authentication
    mfa_enabled = Column(Boolean, default=False, nullable=False)
    mfa_secret = Column(String(255), nullable=True)  # Encrypted TOTP secret
    mfa_setup_date = Column(DateTime, nullable=True)
    mfa_last_used = Column(DateTime, nullable=True)
    backup_codes = Column(Text, nullable=True)  # JSON array of hashed backup codes
    backup_codes_generated_at = Column(DateTime, nullable=True)
    
    # Account security
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)
    last_password_change = Column(DateTime, default=func.now(), nullable=False)
    
    # Audit fields
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    created_by = Column(Integer, nullable=True)  # User ID who created this user
    
    # Additional profile fields
    full_name = Column(String(100), nullable=True)
    department = Column(String(100), nullable=True)
    
    # MFA relationships (defined here to avoid circular imports)
    # mfa_used_codes = relationship("MFAUsedCode", back_populates="user", cascade="all, delete-orphan")
    # mfa_audit_logs = relationship("MFAAuditLog", foreign_keys="MFAAuditLog.user_id", back_populates="user", cascade="all, delete-orphan")
    # mfa_failed_attempts = relationship("MFAFailedAttempt", back_populates="user", cascade="all, delete-orphan")
    
    # Document relationships (defined here to avoid circular imports)
    # owned_documents = relationship("Document", foreign_keys="Document.owner_id", back_populates="owner", cascade="all, delete-orphan")
    
    # Encryption relationships (defined here to avoid circular imports)
    # encryption_keys = relationship("UserEncryptionKey", foreign_keys="UserEncryptionKey.user_id", back_populates="user", cascade="all, delete-orphan")
    
    def __init__(self, **kwargs):
        """Initialize User with provided data."""
        # Handle password field by hashing it
        if 'password' in kwargs:
            from ..core.security import hash_password
            self.password_hash = hash_password(kwargs.pop('password'))
        
        # Set all other fields
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    @property
    def is_locked(self) -> bool:
        """Check if user account is locked."""
        if self.locked_until is None:
            return False
        return datetime.utcnow() < self.locked_until
    
    @property
    def is_admin(self) -> bool:
        """Check if user has admin privileges."""
        return self.role in ['admin', 'super_admin']
    
    @property
    def is_super_admin(self) -> bool:
        """Check if user is super admin."""
        return self.role == 'super_admin'
    
    def can_login(self) -> bool:
        """Check if user can login (active, not locked, verified)."""
        return (
            self.is_active and 
            not self.is_locked and 
            self.is_verified
        )
    
    def has_permission(self, permission: str, db=None) -> bool:
        """Check if user has a specific permission."""
        from ..core.rbac import has_permission
        return has_permission(self, permission, db)
    
    def get_highest_hierarchy_level(self, db=None) -> int:
        """Get the highest hierarchy level for this user."""
        role_levels = {
            'viewer': 1,
            'user': 2,
            'manager': 3,
            'admin': 4,
            'super_admin': 5
        }
        return role_levels.get(self.role, 0)
    
    def __repr__(self) -> str:
        """String representation of user."""
        return f"<User(id={self.id}, username='{self.username}', role='{self.role}')>"