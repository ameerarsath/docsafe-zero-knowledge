"""
Encryption models for SecureVault.

This module defines SQLAlchemy models for:
- User encryption keys and key management
- Key derivation parameters and validation
- Key escrow and recovery systems
- Encryption audit logging
- Master key management
"""

from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey,
    JSON, LargeBinary, Index, UniqueConstraint, Float
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from ..core.database import Base


class UserEncryptionKey(Base):
    """User encryption key management."""
    __tablename__ = "user_encryption_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    key_id = Column(String(255), unique=True, nullable=False, index=True)
    
    # Encryption algorithm details
    algorithm = Column(String(50), nullable=False, default="AES-256-GCM")
    key_derivation_method = Column(String(50), nullable=False, default="PBKDF2-SHA256")
    iterations = Column(Integer, nullable=False)
    salt = Column(Text, nullable=False)  # Base64 encoded
    
    # Key validation
    validation_hash = Column(String(64), nullable=False)  # SHA256 of derived key
    hint = Column(String(255), nullable=True)
    
    # Key lifecycle
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Deactivation info
    deactivated_at = Column(DateTime(timezone=True), nullable=True)
    deactivated_reason = Column(String(255), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    creator = relationship("User", foreign_keys=[created_by])
    escrow_records = relationship("KeyEscrow", back_populates="encryption_key")
    audit_logs = relationship("EncryptionAuditLog", back_populates="encryption_key")

    # Indexes
    __table_args__ = (
        Index('idx_user_encryption_keys_user_active', 'user_id', 'is_active'),
        Index('idx_user_encryption_keys_created', 'created_at'),
    )

    def __repr__(self):
        return f"<UserEncryptionKey(key_id='{self.key_id}', user_id={self.user_id}, active={self.is_active})>"


class MasterKey(Base):
    """Master encryption keys for system-level operations."""
    __tablename__ = "master_keys"

    id = Column(Integer, primary_key=True, index=True)
    key_id = Column(String(255), unique=True, nullable=False, index=True)
    
    # Key details
    purpose = Column(String(100), nullable=False)  # 'escrow', 'backup', 'system'
    algorithm = Column(String(50), nullable=False, default="AES-256-GCM")
    key_material = Column(LargeBinary, nullable=False)  # Encrypted key material
    
    # Key protection
    protection_method = Column(String(50), nullable=False)  # 'hsm', 'password', 'split'
    protection_parameters = Column(JSON, nullable=True)
    
    # Lifecycle
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Rotation info
    previous_key_id = Column(String(255), nullable=True)
    next_rotation_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    creator = relationship("User")
    escrow_records = relationship("KeyEscrow", back_populates="master_key")

    # Indexes
    __table_args__ = (
        Index('idx_master_keys_purpose_active', 'purpose', 'is_active'),
        Index('idx_master_keys_rotation', 'next_rotation_at'),
    )

    def __repr__(self):
        return f"<MasterKey(key_id='{self.key_id}', purpose='{self.purpose}', active={self.is_active})>"


class KeyEscrow(Base):
    """Key escrow for recovery purposes."""
    __tablename__ = "key_escrow"

    id = Column(Integer, primary_key=True, index=True)
    key_id = Column(String(255), ForeignKey("user_encryption_keys.key_id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    master_key_id = Column(String(255), ForeignKey("master_keys.key_id"), nullable=True, index=True)
    
    # Escrow data
    escrow_data = Column(LargeBinary, nullable=False)  # Encrypted key material
    escrow_method = Column(String(50), nullable=False)  # 'admin_escrow', 'split_key', 'hsm'
    escrow_parameters = Column(JSON, nullable=True)
    
    # Recovery information
    recovery_hint = Column(String(500), nullable=True)
    recovery_threshold = Column(Integer, nullable=True)  # For split key scenarios
    
    # Lifecycle
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Recovery tracking
    recovered_at = Column(DateTime(timezone=True), nullable=True)
    recovered_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    recovery_reason = Column(String(500), nullable=True)
    
    # Relationships
    encryption_key = relationship("UserEncryptionKey", back_populates="escrow_records")
    user = relationship("User", foreign_keys=[user_id])
    creator = relationship("User", foreign_keys=[created_by])
    recoverer = relationship("User", foreign_keys=[recovered_by])
    master_key = relationship("MasterKey", back_populates="escrow_records")

    # Indexes
    __table_args__ = (
        Index('idx_key_escrow_user', 'user_id'),
        Index('idx_key_escrow_created', 'created_at'),
        Index('idx_key_escrow_recovered', 'recovered_at'),
        UniqueConstraint('key_id', name='uq_key_escrow_key_id'),
    )

    def __repr__(self):
        return f"<KeyEscrow(key_id='{self.key_id}', user_id={self.user_id}, method='{self.escrow_method}')>"


class EncryptionAuditLog(Base):
    """Audit log for encryption operations."""
    __tablename__ = "encryption_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    key_id = Column(String(255), ForeignKey("user_encryption_keys.key_id"), nullable=True, index=True)
    
    # Operation details
    action = Column(String(100), nullable=False, index=True)  # 'create_key', 'derive_key', 'validate', etc.
    operation_id = Column(String(36), default=lambda: str(uuid.uuid4()), nullable=False, index=True)
    
    # Request context
    ip_address = Column(String(45), nullable=True)  # IPv4/IPv6
    user_agent = Column(String(500), nullable=True)
    session_id = Column(String(255), nullable=True)
    
    # Operation result
    success = Column(Boolean, nullable=False, index=True)
    error_code = Column(String(50), nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Additional data
    details = Column(JSON, nullable=True)  # Operation-specific details
    risk_score = Column(Integer, nullable=True)  # 0-100, for suspicious activity detection
    
    # Timing
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    duration_ms = Column(Integer, nullable=True)  # Operation duration in milliseconds
    
    # Relationships
    user = relationship("User")
    encryption_key = relationship("UserEncryptionKey", back_populates="audit_logs")

    # Indexes
    __table_args__ = (
        Index('idx_encryption_audit_user_action', 'user_id', 'action'),
        Index('idx_encryption_audit_timestamp', 'timestamp'),
        Index('idx_encryption_audit_success', 'success'),
        Index('idx_encryption_audit_risk', 'risk_score'),
        Index('idx_encryption_audit_operation', 'operation_id'),
    )

    def __repr__(self):
        return f"<EncryptionAuditLog(user_id={self.user_id}, action='{self.action}', success={self.success})>"


class KeyRotationLog(Base):
    """Log of key rotation events."""
    __tablename__ = "key_rotation_logs"

    id = Column(Integer, primary_key=True, index=True)
    old_key_id = Column(String(255), nullable=False, index=True)
    new_key_id = Column(String(255), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Rotation details
    rotation_type = Column(String(50), nullable=False)  # 'manual', 'scheduled', 'emergency'
    rotation_reason = Column(String(500), nullable=False)
    
    # Migration progress
    documents_migrated = Column(Integer, default=0, nullable=False)
    documents_total = Column(Integer, nullable=False)
    migration_completed = Column(Boolean, default=False, nullable=False)
    
    # Timing
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Status
    status = Column(String(50), default='in_progress', nullable=False)  # 'in_progress', 'completed', 'failed'
    error_message = Column(Text, nullable=True)
    
    # Relationships
    user = relationship("User")

    # Indexes
    __table_args__ = (
        Index('idx_key_rotation_user', 'user_id'),
        Index('idx_key_rotation_status', 'status'),
        Index('idx_key_rotation_started', 'started_at'),
    )

    def __repr__(self):
        return f"<KeyRotationLog(old_key='{self.old_key_id}', new_key='{self.new_key_id}', status='{self.status}')>"


class CryptoRandomnessTest(Base):
    """Test results for cryptographic randomness quality."""
    __tablename__ = "crypto_randomness_tests"

    id = Column(Integer, primary_key=True, index=True)
    test_type = Column(String(50), nullable=False, index=True)  # 'entropy', 'chi_square', 'runs'
    test_timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Test parameters
    sample_size = Column(Integer, nullable=False)
    test_parameters = Column(JSON, nullable=True)
    
    # Test results
    test_passed = Column(Boolean, nullable=False, index=True)
    test_score = Column(Float, nullable=True)
    p_value = Column(Float, nullable=True)
    
    # Quality metrics
    entropy_bits = Column(Float, nullable=True)
    quality_grade = Column(String(10), nullable=True)  # 'A', 'B', 'C', 'D', 'F'
    
    # Details
    details = Column(JSON, nullable=True)
    recommendations = Column(Text, nullable=True)

    # Indexes
    __table_args__ = (
        Index('idx_crypto_randomness_type', 'test_type'),
        Index('idx_crypto_randomness_timestamp', 'test_timestamp'),
        Index('idx_crypto_randomness_passed', 'test_passed'),
    )

    def __repr__(self):
        return f"<CryptoRandomnessTest(type='{self.test_type}', passed={self.test_passed}, grade='{self.quality_grade}')>"