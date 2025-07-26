"""
Pydantic schemas for encryption system.

This module defines request/response schemas for:
- Encryption key management
- Key derivation and validation
- Cryptographic operations
- Key escrow and recovery
- Encryption audit and health checks
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime


# Base schemas
class CryptoParameters(BaseModel):
    """Recommended cryptographic parameters."""
    algorithm: str = Field(..., description="Encryption algorithm")
    key_derivation: str = Field(..., description="Key derivation function")
    min_iterations: int = Field(..., description="Minimum PBKDF2 iterations")
    recommended_iterations: int = Field(..., description="Recommended PBKDF2 iterations")
    salt_length: int = Field(..., description="Salt length in bytes")
    iv_length: int = Field(..., description="IV length in bytes")
    auth_tag_length: int = Field(..., description="Authentication tag length in bytes")
    key_length: int = Field(..., description="Key length in bytes")

    class Config:
        json_schema_extra = {
            "example": {
                "algorithm": "AES-256-GCM",
                "key_derivation": "PBKDF2-SHA256",
                "min_iterations": 100000,
                "recommended_iterations": 500000,
                "salt_length": 32,
                "iv_length": 12,
                "auth_tag_length": 16,
                "key_length": 32
            }
        }


# Encryption Key Management Schemas
class EncryptionKeyCreate(BaseModel):
    """Request schema for creating encryption keys."""
    password: str = Field(..., description="Master password for key derivation")
    iterations: int = Field(..., ge=100000, description="PBKDF2 iterations (min 100,000)")
    salt: str = Field(..., description="Base64 encoded salt")
    hint: Optional[str] = Field(None, max_length=255, description="Password hint")
    
    # Validation payload (client encrypts known plaintext with derived key)
    validation_ciphertext: str = Field(..., description="Base64 encoded validation ciphertext")
    validation_iv: str = Field(..., description="Base64 encoded validation IV")
    validation_auth_tag: str = Field(..., description="Base64 encoded validation auth tag")
    
    replace_existing: bool = Field(False, description="Replace existing active key")

    @validator('iterations')
    def validate_iterations(cls, v):
        if v < 100000:
            raise ValueError('Iterations must be at least 100,000')
        if v > 10000000:
            raise ValueError('Iterations must not exceed 10,000,000')
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "password": "SecurePassword123!",
                "iterations": 500000,
                "salt": "base64encodedSalt==",
                "hint": "My favorite password",
                "validation_ciphertext": "encryptedValidationData==",
                "validation_iv": "randomIV==",
                "validation_auth_tag": "authTag==",
                "replace_existing": False
            }
        }


class EncryptionKeyResponse(BaseModel):
    """Response schema for encryption keys."""
    key_id: str = Field(..., description="Unique key identifier")
    algorithm: str = Field(..., description="Encryption algorithm")
    key_derivation_method: str = Field(..., description="Key derivation method")
    iterations: int = Field(..., description="PBKDF2 iterations")
    salt: str = Field(..., description="Base64 encoded salt")
    hint: Optional[str] = Field(None, description="Password hint")
    is_active: bool = Field(..., description="Whether key is active")
    created_at: datetime = Field(..., description="Creation timestamp")
    expires_at: Optional[datetime] = Field(None, description="Expiration timestamp")
    deactivated_at: Optional[datetime] = Field(None, description="Deactivation timestamp")
    deactivated_reason: Optional[str] = Field(None, description="Deactivation reason")
    escrow_available: bool = Field(..., description="Whether key escrow is available")

    class Config:
        from_attributes = True


class EncryptionKeyList(BaseModel):
    """Response schema for listing encryption keys."""
    keys: List[EncryptionKeyResponse] = Field(..., description="List of encryption keys")
    total: int = Field(..., description="Total number of keys")
    active_count: int = Field(..., description="Number of active keys")


# Key Derivation Schemas
class KeyDerivationRequest(BaseModel):
    """Request schema for key derivation."""
    password: str = Field(..., description="Password for key derivation")
    salt: str = Field(..., description="Base64 encoded salt")
    iterations: int = Field(..., ge=100000, description="PBKDF2 iterations")

    @validator('iterations')
    def validate_iterations(cls, v):
        if v < 100000:
            raise ValueError('Iterations must be at least 100,000')
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "password": "SecurePassword123!",
                "salt": "base64encodedSalt==",
                "iterations": 500000
            }
        }


class KeyDerivationResponse(BaseModel):
    """Response schema for key derivation."""
    derived_key: str = Field(..., description="Base64 encoded derived key")
    key_hash: str = Field(..., description="SHA256 hash of derived key")
    algorithm: str = Field(..., description="Key derivation algorithm")
    iterations: int = Field(..., description="PBKDF2 iterations used")


# Encryption Validation Schemas
class EncryptionValidationRequest(BaseModel):
    """Request schema for encryption validation."""
    key: str = Field(..., description="Base64 encoded encryption key")
    iv: str = Field(..., description="Base64 encoded initialization vector")
    auth_tag: str = Field(..., description="Base64 encoded authentication tag")
    ciphertext: str = Field(..., description="Base64 encoded ciphertext")
    aad: Optional[str] = Field(None, description="Additional authenticated data")

    class Config:
        json_schema_extra = {
            "example": {
                "key": "base64encodedKey==",
                "iv": "base64encodedIV==",
                "auth_tag": "base64encodedTag==",
                "ciphertext": "base64encodedCiphertext==",
                "aad": "optional additional data"
            }
        }


class EncryptionValidationResponse(BaseModel):
    """Response schema for encryption validation."""
    valid: bool = Field(..., description="Whether validation succeeded")
    algorithm: str = Field(..., description="Encryption algorithm used")
    plaintext_hash: Optional[str] = Field(None, description="SHA256 hash of decrypted plaintext")
    error_message: Optional[str] = Field(None, description="Error message if validation failed")


# Master Key Schemas
class MasterKeyCreate(BaseModel):
    """Request schema for creating master keys."""
    purpose: str = Field(..., description="Purpose of the master key")
    algorithm: str = Field("AES-256-GCM", description="Encryption algorithm")
    protection_method: str = Field(..., description="Key protection method")
    protection_parameters: Optional[Dict[str, Any]] = Field(None, description="Protection parameters")
    expires_at: Optional[datetime] = Field(None, description="Expiration timestamp")

    @validator('purpose')
    def validate_purpose(cls, v):
        allowed_purposes = ['escrow', 'backup', 'system', 'recovery']
        if v not in allowed_purposes:
            raise ValueError(f'Purpose must be one of: {allowed_purposes}')
        return v


class MasterKeyResponse(BaseModel):
    """Response schema for master keys."""
    key_id: str = Field(..., description="Unique key identifier")
    purpose: str = Field(..., description="Purpose of the master key")
    algorithm: str = Field(..., description="Encryption algorithm")
    protection_method: str = Field(..., description="Key protection method")
    is_active: bool = Field(..., description="Whether key is active")
    created_at: datetime = Field(..., description="Creation timestamp")
    expires_at: Optional[datetime] = Field(None, description="Expiration timestamp")
    next_rotation_at: Optional[datetime] = Field(None, description="Next rotation timestamp")

    class Config:
        from_attributes = True


# Key Escrow Schemas
class KeyEscrowCreate(BaseModel):
    """Request schema for creating key escrow."""
    key_id: str = Field(..., description="Key ID to escrow")
    encrypted_key_material: str = Field(..., description="Encrypted key material")
    escrow_method: str = Field(..., description="Escrow method")
    recovery_hint: Optional[str] = Field(None, max_length=500, description="Recovery hint")

    @validator('escrow_method')
    def validate_escrow_method(cls, v):
        allowed_methods = ['admin_escrow', 'split_key', 'hsm']
        if v not in allowed_methods:
            raise ValueError(f'Escrow method must be one of: {allowed_methods}')
        return v


class KeyEscrowResponse(BaseModel):
    """Response schema for key escrow."""
    escrow_id: int = Field(..., description="Escrow record ID")
    key_id: str = Field(..., description="Key ID")
    user_id: int = Field(..., description="User ID")
    escrow_method: str = Field(..., description="Escrow method")
    recovery_hint: Optional[str] = Field(None, description="Recovery hint")
    created_at: datetime = Field(..., description="Creation timestamp")
    created_by: int = Field(..., description="Created by user ID")

    class Config:
        from_attributes = True


# Key Recovery Schemas
class KeyRecoveryRequest(BaseModel):
    """Request schema for key recovery."""
    key_id: str = Field(..., description="Key ID to recover")
    recovery_reason: str = Field(..., description="Reason for recovery")

    class Config:
        json_schema_extra = {
            "example": {
                "key_id": "key_123_abc456",
                "recovery_reason": "User forgot password, emergency access needed"
            }
        }


class KeyRecoveryResponse(BaseModel):
    """Response schema for key recovery."""
    key_id: str = Field(..., description="Key ID")
    user_id: int = Field(..., description="User ID")
    escrow_data: str = Field(..., description="Encrypted key material")
    escrow_method: str = Field(..., description="Escrow method")
    recovery_hint: Optional[str] = Field(None, description="Recovery hint")
    recovered_at: datetime = Field(..., description="Recovery timestamp")
    recovered_by: int = Field(..., description="Recovered by user ID")

    class Config:
        from_attributes = True


# Health Check Schema
class EncryptionHealthCheck(BaseModel):
    """Health check response schema."""
    status: str = Field(..., description="Overall health status")
    crypto_functional: bool = Field(..., description="Whether crypto operations work")
    user_keys_count: int = Field(..., description="Number of user keys")
    audit_logs_count: int = Field(..., description="Number of audit log entries")
    escrow_enabled: bool = Field(..., description="Whether key escrow is enabled")
    supported_algorithms: List[str] = Field(..., description="Supported encryption algorithms")
    supported_kdf: List[str] = Field(..., description="Supported key derivation functions")
    error: Optional[str] = Field(None, description="Error message if unhealthy")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "healthy",
                "crypto_functional": True,
                "user_keys_count": 5,
                "audit_logs_count": 150,
                "escrow_enabled": True,
                "supported_algorithms": ["AES-256-GCM"],
                "supported_kdf": ["PBKDF2-SHA256"],
                "error": None
            }
        }


# Audit and Monitoring Schemas
class EncryptionAuditLogResponse(BaseModel):
    """Response schema for encryption audit logs."""
    id: int = Field(..., description="Audit log ID")
    user_id: int = Field(..., description="User ID")
    key_id: Optional[str] = Field(None, description="Key ID")
    action: str = Field(..., description="Action performed")
    operation_id: str = Field(..., description="Operation ID")
    success: bool = Field(..., description="Whether operation succeeded")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    details: Optional[Dict[str, Any]] = Field(None, description="Operation details")
    risk_score: Optional[int] = Field(None, description="Risk score (0-100)")
    timestamp: datetime = Field(..., description="Operation timestamp")
    duration_ms: Optional[int] = Field(None, description="Operation duration in ms")

    class Config:
        from_attributes = True


class EncryptionMetrics(BaseModel):
    """Encryption system metrics."""
    total_keys: int = Field(..., description="Total number of encryption keys")
    active_keys: int = Field(..., description="Number of active keys")
    escrowed_keys: int = Field(..., description="Number of escrowed keys")
    recent_operations: int = Field(..., description="Operations in last 24 hours")
    failed_operations: int = Field(..., description="Failed operations in last 24 hours")
    average_key_age_days: float = Field(..., description="Average key age in days")
    keys_expiring_soon: int = Field(..., description="Keys expiring in next 30 days")


# Client-side Encryption Helper Schemas
class ClientEncryptionRequest(BaseModel):
    """Schema for client-side encryption requests."""
    plaintext: str = Field(..., description="Data to encrypt (base64)")
    key_id: str = Field(..., description="Key ID to use")
    aad: Optional[str] = Field(None, description="Additional authenticated data")

    class Config:
        json_schema_extra = {
            "example": {
                "plaintext": "base64encodedData==",
                "key_id": "key_123_abc456",
                "aad": "document_metadata"
            }
        }


class ClientEncryptionResponse(BaseModel):
    """Schema for client-side encryption responses."""
    ciphertext: str = Field(..., description="Encrypted data (base64)")
    iv: str = Field(..., description="Initialization vector (base64)")
    auth_tag: str = Field(..., description="Authentication tag (base64)")
    key_id: str = Field(..., description="Key ID used")
    algorithm: str = Field(..., description="Encryption algorithm")

    class Config:
        json_schema_extra = {
            "example": {
                "ciphertext": "base64encodedCiphertext==",
                "iv": "base64encodedIV==",
                "auth_tag": "base64encodedTag==",
                "key_id": "key_123_abc456",
                "algorithm": "AES-256-GCM"
            }
        }


class ClientDecryptionRequest(BaseModel):
    """Schema for client-side decryption requests."""
    ciphertext: str = Field(..., description="Encrypted data (base64)")
    iv: str = Field(..., description="Initialization vector (base64)")
    auth_tag: str = Field(..., description="Authentication tag (base64)")
    key_id: str = Field(..., description="Key ID used")
    aad: Optional[str] = Field(None, description="Additional authenticated data")

    class Config:
        json_schema_extra = {
            "example": {
                "ciphertext": "base64encodedCiphertext==",
                "iv": "base64encodedIV==",
                "auth_tag": "base64encodedTag==",
                "key_id": "key_123_abc456",
                "aad": "document_metadata"
            }
        }


class ClientDecryptionResponse(BaseModel):
    """Schema for client-side decryption responses."""
    plaintext: str = Field(..., description="Decrypted data (base64)")
    key_id: str = Field(..., description="Key ID used")
    algorithm: str = Field(..., description="Encryption algorithm")
    verified: bool = Field(..., description="Whether authentication succeeded")

    class Config:
        json_schema_extra = {
            "example": {
                "plaintext": "base64encodedData==",
                "key_id": "key_123_abc456",
                "algorithm": "AES-256-GCM",
                "verified": True
            }
        }