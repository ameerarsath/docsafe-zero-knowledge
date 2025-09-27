"""
Client-side encryption API endpoints for SecureVault.

This module provides REST API endpoints for:
- Encryption key management
- Key derivation and validation
- Encryption metadata handling
- Master key operations
- Key escrow and recovery
"""

import os
import base64
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import (
    APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
)
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend

from ...core.database import get_db
from ...core.security import get_current_user
from ...core.rbac import has_permission
from ...core.config import settings
from ...models.user import User
from ...models.encryption import (
    UserEncryptionKey, MasterKey, KeyEscrow, EncryptionAuditLog
)
from ...schemas.encryption import (
    EncryptionKeyCreate,
    EncryptionKeyResponse,
    EncryptionKeyList,
    KeyDerivationRequest,
    KeyDerivationResponse,
    EncryptionValidationRequest,
    EncryptionValidationResponse,
    MasterKeyCreate,
    MasterKeyResponse,
    KeyEscrowCreate,
    KeyEscrowResponse,
    KeyRecoveryRequest,
    KeyRecoveryResponse,
    EncryptionHealthCheck,
    CryptoParameters
)


router = APIRouter(prefix="/encryption", tags=["Encryption"])


def strip_emojis_and_unicode(text: str) -> str:
    """Remove emojis and problematic Unicode characters that cause encoding issues."""
    if not text:
        return ""

    import re

    # Remove emoji ranges and problematic Unicode characters
    emoji_pattern = re.compile(
        r'[\U00010000-\U0010ffff]'  # Supplementary planes (includes key emoji)
        r'|[\u2600-\u2B55]'         # Misc symbols
        r'|[\u23cf\u23e9\u231a\ufe0f\u3030]'  # Specific symbols
        r'|[\u200d]',               # Zero width joiner
        flags=re.UNICODE
    )

    # First remove emojis
    clean_text = emoji_pattern.sub('', text)

    # Then ensure only ASCII characters remain for maximum safety
    try:
        ascii_text = clean_text.encode('ascii', errors='ignore').decode('ascii')
        return ascii_text.strip()
    except:
        return "TEXT_ENCODING_ERROR"


# Encryption Key Management Endpoints
@router.post("/keys", response_model=EncryptionKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_encryption_key(
    key_data: EncryptionKeyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Create a new user encryption key."""
    # Users can create their own encryption keys for document upload
    # Only admin-level users need encryption:manage for system-wide key management
    if not current_user or not current_user.id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to create encryption keys"
        )
    
    try:
        # Validate key derivation parameters
        if key_data.iterations < 100000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PBKDF2 iterations must be at least 100,000"
            )
        
        # Check if user already has an active key
        existing_key = db.query(UserEncryptionKey).filter(
            and_(
                UserEncryptionKey.user_id == current_user.id,
                UserEncryptionKey.is_active == True
            )
        ).first()
        
        if existing_key and not key_data.replace_existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User already has an active encryption key. Set replace_existing=true to replace."
            )
        
        # Generate key ID and validation hash
        key_id = f"key_{current_user.id}_{secrets.token_hex(16)}"
        
        # Validate the derived key by attempting to decrypt the validation payload
        try:
            # Decode base64 components
            salt = base64.b64decode(key_data.salt)
            validation_iv = base64.b64decode(key_data.validation_iv)
            validation_tag = base64.b64decode(key_data.validation_auth_tag)
            validation_ciphertext = base64.b64decode(key_data.validation_ciphertext)
            
            # Derive key using provided parameters
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,  # 256 bits for AES-256
                salt=salt,
                iterations=key_data.iterations,
                backend=default_backend()
            )
            derived_key = kdf.derive(key_data.password.encode('utf-8'))
            
            # Attempt to decrypt validation payload
            aesgcm = AESGCM(derived_key)
            decrypted = aesgcm.decrypt(validation_iv, validation_ciphertext + validation_tag, None)
            
            # Verify the decrypted payload matches expected content
            if decrypted.decode('utf-8') != f"validation:{current_user.username}":
                raise ValueError("Validation payload mismatch")
                
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Key validation failed: {str(e)}"
            )
        
        # Deactivate existing key if replacing
        if existing_key and key_data.replace_existing:
            existing_key.is_active = False
            existing_key.deactivated_at = func.now()
            existing_key.deactivated_reason = "Replaced by new key"
        
        # Create new encryption key record
        encryption_key = UserEncryptionKey(
            user_id=current_user.id,
            key_id=key_id,
            algorithm="AES-256-GCM",
            key_derivation_method="PBKDF2-SHA256",
            iterations=key_data.iterations,
            salt=base64.b64encode(salt).decode('utf-8'),
            validation_hash=hashlib.sha256(derived_key).hexdigest(),
            hint=key_data.hint,
            is_active=True,
            created_by=current_user.id
        )
        
        db.add(encryption_key)
        db.commit()
        db.refresh(encryption_key)
        
        # Create audit log
        audit_log = EncryptionAuditLog(
            user_id=current_user.id,
            action="create_key",
            key_id=key_id,
            success=True,
            details={
                "algorithm": "AES-256-GCM",
                "derivation_method": "PBKDF2-SHA256",
                "iterations": key_data.iterations,
                "replaced_existing": key_data.replace_existing
            }
        )
        db.add(audit_log)
        db.commit()
        
        # Schedule key escrow creation in background if enabled
        if settings.ENCRYPTION_ESCROW_ENABLED:
            background_tasks.add_task(
                create_key_escrow_async,
                db=db,
                user_id=current_user.id,
                key_id=key_id,
                derived_key=derived_key
            )
        
        return EncryptionKeyResponse(
            key_id=key_id,
            algorithm="AES-256-GCM",
            key_derivation_method="PBKDF2-SHA256",
            iterations=key_data.iterations,
            salt=base64.b64encode(salt).decode('utf-8'),
            hint=key_data.hint,
            is_active=True,
            created_at=encryption_key.created_at,
            expires_at=encryption_key.expires_at,
            escrow_available=settings.ENCRYPTION_ESCROW_ENABLED
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create encryption key: {str(e)}"
        )


@router.get("/keys-test")
async def test_endpoint_no_auth():
    """Test endpoint without authentication to isolate Unicode error."""
    return {"message": "Test successful", "status": "working"}


@router.get("/auth-test")
async def test_endpoint_with_auth(current_user: User = Depends(get_current_user)):
    """Test endpoint with authentication to isolate Unicode error."""
    return {"message": "Auth test successful", "user": current_user.username}


@router.get("/encoding-test")
async def test_encoding_fix():
    """Test endpoint to verify UTF-8 encoding is working properly."""
    test_data = {
        "message": "Encoding test successful [OK]",
        "emoji_test": "[KEY] [ROCKET] [COMPUTER]",
        "unicode_chars": "cafe resume naive",
        "mixed_content": "Regular text with [KEY] symbols and cafe"
    }

    # Return with explicit UTF-8 encoding
    from fastapi.responses import JSONResponse
    return JSONResponse(
        content=test_data,
        headers={"Content-Type": "application/json; charset=utf-8"}
    )


@router.get("/keys", response_model=EncryptionKeyList)
async def list_user_encryption_keys(
    include_inactive: bool = Query(False, description="Include inactive keys"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's encryption keys."""
    try:
        # Safe debug logging without Unicode issues
        username_safe = current_user.username.encode('ascii', errors='replace').decode('ascii')
        print(f"DEBUG: ENCRYPTION KEYS REQUEST - User {username_safe} (ID: {current_user.id})")
        query = db.query(UserEncryptionKey).filter(UserEncryptionKey.user_id == current_user.id)

        if not include_inactive:
            query = query.filter(UserEncryptionKey.is_active == True)

        print(f"DEBUG: EXECUTING QUERY - User ID {current_user.id}")
        keys = query.order_by(desc(UserEncryptionKey.created_at)).all()
        print(f"DEBUG: FOUND KEYS: {len(keys)} encryption keys")

        key_responses = []
        for key in keys:
            key_id_safe = key.key_id.encode('ascii', errors='replace').decode('ascii') if key.key_id else 'None'
            print(f"DEBUG: PROCESSING KEY: {key_id_safe}")

            # Ensure all string fields are properly encoded for Unicode safety
            hint = key.hint or ""
            if isinstance(hint, str):
                hint = hint.encode('ascii', errors='replace').decode('ascii')

            deactivated_reason = key.deactivated_reason or ""
            if isinstance(deactivated_reason, str):
                deactivated_reason = deactivated_reason.encode('ascii', errors='replace').decode('ascii')

            key_responses.append(EncryptionKeyResponse(
                key_id=key.key_id,
                algorithm=key.algorithm,
                key_derivation_method=key.key_derivation_method,
                iterations=key.iterations,
                salt=key.salt,
                hint=hint,
                is_active=key.is_active,
                created_at=key.created_at,
                expires_at=key.expires_at,
                deactivated_at=key.deactivated_at,
                deactivated_reason=deactivated_reason,
                escrow_available=bool(
                    db.query(KeyEscrow).filter(KeyEscrow.key_id == key.key_id).first()
                )
            ))

        print(f"DEBUG: RETURNING: {len(key_responses)} key responses")
        return EncryptionKeyList(
            keys=key_responses,
            total=len(key_responses),
            active_count=len([k for k in key_responses if k.is_active])
        )
    except Exception as e:
        print(f"ERROR: ENCRYPTION KEYS ERROR: {e}")
        import traceback
        traceback.print_exc()
        # Safe error handling to prevent Unicode encoding issues
        safe_error = str(e).encode('ascii', errors='replace').decode('ascii')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list encryption keys: {safe_error}"
        )


@router.get("/user-keys-fixed")
async def get_user_keys_bypass_cache(
    include_inactive: bool = Query(False, description="Include inactive keys"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Completely new endpoint to bypass cached Unicode errors."""
    try:
        # Replicate the exact same logic as /keys but with a different function name
        query = db.query(UserEncryptionKey).filter(UserEncryptionKey.user_id == current_user.id)
        if not include_inactive:
            query = query.filter(UserEncryptionKey.is_active == True)

        keys = query.order_by(desc(UserEncryptionKey.created_at)).all()

        key_responses = []
        for key in keys:
            # Use our emoji stripping function
            hint = strip_emojis_and_unicode(key.hint) if key.hint else ""
            deactivated_reason = strip_emojis_and_unicode(key.deactivated_reason) if key.deactivated_reason else ""

            key_dict = {
                "key_id": str(key.key_id),
                "algorithm": str(key.algorithm),
                "key_derivation_method": str(key.key_derivation_method),
                "iterations": int(key.iterations),
                "salt": str(key.salt),
                "hint": hint,
                "is_active": bool(key.is_active),
                "created_at": key.created_at.isoformat() if key.created_at else None,
                "expires_at": key.expires_at.isoformat() if key.expires_at else None,
                "deactivated_at": key.deactivated_at.isoformat() if key.deactivated_at else None,
                "deactivated_reason": deactivated_reason,
                "escrow_available": bool(
                    db.query(KeyEscrow).filter(KeyEscrow.key_id == key.key_id).first()
                )
            }
            key_responses.append(key_dict)

        # Return with explicit UTF-8 encoding
        return JSONResponse(
            content={
                "keys": key_responses,
                "total": len(key_responses),
                "active_count": len([k for k in key_responses if k.get("is_active", False)]),
                "bypass_success": True
            },
            headers={"Content-Type": "application/json; charset=utf-8"}
        )

    except Exception as e:
        # Safe error handling without Unicode
        safe_error = str(e).encode('ascii', errors='ignore').decode('ascii')
        return JSONResponse(
            content={
                "keys": [],
                "total": 0,
                "active_count": 0,
                "error": f"Bypass route error: {safe_error}",
                "bypass_failed": True
            },
            status_code=200,
            headers={"Content-Type": "application/json; charset=utf-8"}
        )


@router.get("/keys/all", response_model=EncryptionKeyList)
async def list_all_encryption_keys(
    include_inactive: bool = Query(False, description="Include inactive keys"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all encryption keys (admin only) or user's keys."""
    try:
        # Check if user has admin permissions
        if has_permission(current_user, "encryption:admin", db):
            # Admin can see all keys
            query = db.query(UserEncryptionKey)
            if not include_inactive:
                query = query.filter(UserEncryptionKey.is_active == True)
        else:
            # Regular users see only their own keys
            query = db.query(UserEncryptionKey).filter(UserEncryptionKey.user_id == current_user.id)
            if not include_inactive:
                query = query.filter(UserEncryptionKey.is_active == True)

        keys = query.order_by(desc(UserEncryptionKey.created_at)).all()

        key_responses = []
        for key in keys:
            # Ensure all string fields are properly encoded for Unicode safety
            hint = key.hint or ""
            if isinstance(hint, str):
                # Replace any potential Unicode characters that might cause encoding issues
                hint = hint.encode('ascii', errors='replace').decode('ascii')

            deactivated_reason = key.deactivated_reason or ""
            if isinstance(deactivated_reason, str):
                deactivated_reason = deactivated_reason.encode('ascii', errors='replace').decode('ascii')

            key_responses.append(EncryptionKeyResponse(
                key_id=key.key_id,
                algorithm=key.algorithm,
                key_derivation_method=key.key_derivation_method,
                iterations=key.iterations,
                salt=key.salt,
                hint=hint,
                is_active=key.is_active,
                created_at=key.created_at,
                expires_at=key.expires_at,
                deactivated_at=key.deactivated_at,
                deactivated_reason=deactivated_reason,
                escrow_available=bool(
                    db.query(KeyEscrow).filter(KeyEscrow.key_id == key.key_id).first()
                )
            ))

        return EncryptionKeyList(
            keys=key_responses,
            total=len(key_responses),
            active_count=len([k for k in key_responses if k.is_active])
        )

    except Exception as e:
        # Safe error handling to prevent Unicode encoding issues
        safe_error = str(e).encode('ascii', errors='replace').decode('ascii')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list all encryption keys: {safe_error}"
        )


@router.get("/keys/{key_id}", response_model=EncryptionKeyResponse)
async def get_encryption_key(
    key_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific encryption key."""
    key = db.query(UserEncryptionKey).filter(
        and_(
            UserEncryptionKey.key_id == key_id,
            UserEncryptionKey.user_id == current_user.id
        )
    ).first()
    
    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encryption key not found"
        )
    
    # Ensure all string fields are properly encoded for Unicode safety
    hint = key.hint or ""
    if isinstance(hint, str):
        hint = hint.encode('ascii', errors='replace').decode('ascii')

    deactivated_reason = key.deactivated_reason or ""
    if isinstance(deactivated_reason, str):
        deactivated_reason = deactivated_reason.encode('ascii', errors='replace').decode('ascii')

    return EncryptionKeyResponse(
        key_id=key.key_id,
        algorithm=key.algorithm,
        key_derivation_method=key.key_derivation_method,
        iterations=key.iterations,
        salt=key.salt,
        hint=hint,
        is_active=key.is_active,
        created_at=key.created_at,
        expires_at=key.expires_at,
        deactivated_at=key.deactivated_at,
        deactivated_reason=deactivated_reason,
        escrow_available=bool(
            db.query(KeyEscrow).filter(KeyEscrow.key_id == key_id).first()
        )
    )


@router.delete("/keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_encryption_key(
    key_id: str,
    reason: str = Query("User requested deactivation", description="Reason for deactivation"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Deactivate an encryption key."""
    key = db.query(UserEncryptionKey).filter(
        and_(
            UserEncryptionKey.key_id == key_id,
            UserEncryptionKey.user_id == current_user.id,
            UserEncryptionKey.is_active == True
        )
    ).first()
    
    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active encryption key not found"
        )
    
    try:
        key.is_active = False
        key.deactivated_at = func.now()
        key.deactivated_reason = reason
        
        # Create audit log
        audit_log = EncryptionAuditLog(
            user_id=current_user.id,
            action="deactivate_key",
            key_id=key_id,
            success=True,
            details={"reason": reason}
        )
        db.add(audit_log)
        db.commit()
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to deactivate key: {str(e)}"
        )


@router.post("/keys/{key_id}/rotate", response_model=EncryptionKeyResponse)
async def rotate_encryption_key(
    key_id: str,
    force_rotation: bool = Query(False, description="Force rotation even if key is not expired"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Rotate an existing encryption key by creating a new one and deactivating the old one."""
    try:
        print(f"KEY ROTATION REQUEST: User {current_user.username} (ID: {current_user.id}) wants to rotate key {key_id}")

        # Find the existing key
        existing_key = db.query(UserEncryptionKey).filter(
            and_(
                UserEncryptionKey.key_id == key_id,
                UserEncryptionKey.user_id == current_user.id,
                UserEncryptionKey.is_active == True
            )
        ).first()

        if not existing_key:
            # Check if the key exists but belongs to another user or is inactive
            any_key = db.query(UserEncryptionKey).filter(UserEncryptionKey.key_id == key_id).first()
            if any_key:
                if any_key.user_id != current_user.id:
                    print(f"ERROR KEY ROTATION: Key {key_id} belongs to user {any_key.user_id}, not {current_user.id}")
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You don't have permission to rotate this key"
                    )
                elif not any_key.is_active:
                    print(f"ERROR KEY ROTATION: Key {key_id} is inactive")
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot rotate inactive key"
                    )
            else:
                print(f"ERROR KEY ROTATION: Key {key_id} not found in database")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Encryption key '{key_id}' not found"
                )

        # Generate new salt and key ID for rotation
        new_salt = secrets.token_bytes(32)
        new_key_id = f"key_{current_user.id}_{secrets.token_hex(16)}"

        # For key rotation, we'll create a new key with enhanced security
        # Using maximum recommended iterations for better security
        iterations = 500000

        # Generate a validation payload for the new key
        # This is a placeholder - in real implementation, the client would provide this
        # after deriving the new key with the user's password
        validation_payload = {
            "user": current_user.username,
            "timestamp": datetime.utcnow().isoformat(),
            "key_version": 2
        }

        # Create new encryption key record
        new_encryption_key = UserEncryptionKey(
            user_id=current_user.id,
            key_id=new_key_id,
            algorithm="AES-256-GCM",
            key_derivation_method="PBKDF2-SHA256",
            iterations=iterations,
            salt=base64.b64encode(new_salt).decode('utf-8'),
            validation_hash="rotated_key_placeholder",  # Would be updated by client
            hint=f"Rotated from {existing_key.key_id}",
            is_active=True,
            created_by=current_user.id
        )

        # Deactivate the old key
        existing_key.is_active = False
        existing_key.deactivated_at = func.now()
        existing_key.deactivated_reason = f"Rotated to {new_key_id}"

        # Add both changes to database
        db.add(new_encryption_key)
        db.commit()
        db.refresh(new_encryption_key)

        # Create audit logs for both operations
        # Log deactivation of old key
        old_key_audit = EncryptionAuditLog(
            user_id=current_user.id,
            action="rotate_key_deactivate",
            key_id=key_id,
            success=True,
            details={
                "new_key_id": new_key_id,
                "force_rotation": force_rotation,
                "rotation_reason": "User-initiated key rotation"
            }
        )

        # Log creation of new key
        new_key_audit = EncryptionAuditLog(
            user_id=current_user.id,
            action="rotate_key_create",
            key_id=new_key_id,
            success=True,
            details={
                "old_key_id": key_id,
                "algorithm": "AES-256-GCM",
                "derivation_method": "PBKDF2-SHA256",
                "iterations": iterations
            }
        )

        db.add(old_key_audit)
        db.add(new_key_audit)
        db.commit()

        # Schedule key escrow creation in background if enabled
        if settings.ENCRYPTION_ESCROW_ENABLED:
            background_tasks.add_task(
                create_key_escrow_async,
                db=db,
                user_id=current_user.id,
                key_id=new_key_id,
                derived_key=b"placeholder_for_rotated_key"  # Would be actual key in real implementation
            )

        return EncryptionKeyResponse(
            key_id=new_key_id,
            algorithm="AES-256-GCM",
            key_derivation_method="PBKDF2-SHA256",
            iterations=iterations,
            salt=base64.b64encode(new_salt).decode('utf-8'),
            hint=f"Rotated from {existing_key.key_id}",
            is_active=True,
            created_at=new_encryption_key.created_at,
            expires_at=new_encryption_key.expires_at,
            escrow_available=settings.ENCRYPTION_ESCROW_ENABLED
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to rotate encryption key: {str(e)}"
        )


# Key Derivation and Validation Endpoints
@router.post("/derive-key", response_model=KeyDerivationResponse)
async def derive_encryption_key(
    request: KeyDerivationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Derive encryption key using PBKDF2 with provided parameters."""
    try:
        # Validate parameters
        if request.iterations < 100000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Iterations must be at least 100,000"
            )
        
        # Decode salt
        salt = base64.b64decode(request.salt)
        if len(salt) < 16:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Salt must be at least 16 bytes"
            )
        
        # Derive key
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,  # 256 bits for AES-256
            salt=salt,
            iterations=request.iterations,
            backend=default_backend()
        )
        derived_key = kdf.derive(request.password.encode('utf-8'))
        
        # Create audit log
        audit_log = EncryptionAuditLog(
            user_id=current_user.id,
            action="derive_key",
            success=True,
            details={
                "iterations": request.iterations,
                "salt_length": len(salt)
            }
        )
        db.add(audit_log)
        db.commit()
        
        return KeyDerivationResponse(
            derived_key=base64.b64encode(derived_key).decode('utf-8'),
            key_hash=hashlib.sha256(derived_key).hexdigest(),
            algorithm="PBKDF2-SHA256",
            iterations=request.iterations
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # Log failed attempt
        audit_log = EncryptionAuditLog(
            user_id=current_user.id,
            action="derive_key",
            success=False,
            details={"error": str(e)}
        )
        db.add(audit_log)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Key derivation failed: {str(e)}"
        )


@router.post("/validate", response_model=EncryptionValidationResponse)
async def validate_encryption(
    request: EncryptionValidationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Validate encryption/decryption with provided parameters."""
    try:
        # Decode components
        key_bytes = base64.b64decode(request.key)
        iv = base64.b64decode(request.iv)
        auth_tag = base64.b64decode(request.auth_tag)
        ciphertext = base64.b64decode(request.ciphertext)
        
        # Validate parameters
        if len(key_bytes) != 32:
            raise ValueError("Key must be 32 bytes (256 bits)")
        if len(iv) != 12:
            raise ValueError("IV must be 12 bytes for AES-GCM")
        if len(auth_tag) != 16:
            raise ValueError("Auth tag must be 16 bytes")
        
        # Perform decryption to validate
        aesgcm = AESGCM(key_bytes)
        
        # Additional authenticated data (AAD) if provided
        aad = request.aad.encode('utf-8') if request.aad else None
        
        try:
            decrypted = aesgcm.decrypt(iv, ciphertext + auth_tag, aad)
            validation_success = True
            plaintext_hash = hashlib.sha256(decrypted).hexdigest()
            error_message = None
            
        except Exception as decrypt_error:
            validation_success = False
            plaintext_hash = None
            error_message = str(decrypt_error)
        
        # Create audit log
        audit_log = EncryptionAuditLog(
            user_id=current_user.id,
            action="validate_encryption",
            success=validation_success,
            details={
                "validation_type": "decrypt",
                "has_aad": bool(request.aad),
                "error": error_message
            }
        )
        db.add(audit_log)
        db.commit()
        
        return EncryptionValidationResponse(
            valid=validation_success,
            algorithm="AES-256-GCM",
            plaintext_hash=plaintext_hash,
            error_message=error_message
        )
        
    except HTTPException:
        raise
    except Exception as e:
        # Log validation failure
        audit_log = EncryptionAuditLog(
            user_id=current_user.id,
            action="validate_encryption",
            success=False,
            details={"error": str(e)}
        )
        db.add(audit_log)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Validation failed: {str(e)}"
        )


# Crypto Parameters and Utilities
@router.get("/parameters", response_model=CryptoParameters)
async def get_crypto_parameters():
    """Get recommended cryptographic parameters."""
    return CryptoParameters(
        algorithm="AES-256-GCM",
        key_derivation="PBKDF2-SHA256",
        min_iterations=100000,
        recommended_iterations=500000,
        salt_length=32,
        iv_length=12,
        auth_tag_length=16,
        key_length=32
    )


@router.post("/generate-salt")
async def generate_salt(
    length: int = Query(32, ge=16, le=64, description="Salt length in bytes")
):
    """Generate a cryptographically secure random salt."""
    salt = secrets.token_bytes(length)
    return {
        "salt": base64.b64encode(salt).decode('utf-8'),
        "length": length,
        "entropy_bits": length * 8
    }


@router.post("/generate-iv")
async def generate_iv():
    """Generate a cryptographically secure random IV for AES-GCM."""
    iv = secrets.token_bytes(12)  # 96 bits for AES-GCM
    return {
        "iv": base64.b64encode(iv).decode('utf-8'),
        "length": 12,
        "algorithm": "AES-GCM"
    }


# Key Escrow and Recovery (Admin only)
@router.post("/escrow", response_model=KeyEscrowResponse)
async def create_key_escrow(
    request: KeyEscrowCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create key escrow (admin only)."""
    if not has_permission(current_user, "encryption:admin", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges for key escrow operations"
        )
    
    # Verify key exists and belongs to target user
    key = db.query(UserEncryptionKey).filter(UserEncryptionKey.key_id == request.key_id).first()
    if not key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encryption key not found"
        )
    
    # Check if escrow already exists
    existing_escrow = db.query(KeyEscrow).filter(KeyEscrow.key_id == request.key_id).first()
    if existing_escrow:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Key escrow already exists"
        )
    
    try:
        # Create escrow record
        escrow = KeyEscrow(
            key_id=request.key_id,
            user_id=key.user_id,
            escrow_data=request.encrypted_key_material,
            escrow_method=request.escrow_method,
            created_by=current_user.id,
            recovery_hint=request.recovery_hint
        )
        
        db.add(escrow)
        db.commit()
        db.refresh(escrow)
        
        # Create audit log
        audit_log = EncryptionAuditLog(
            user_id=key.user_id,
            action="create_escrow",
            key_id=request.key_id,
            success=True,
            details={
                "escrow_method": request.escrow_method,
                "created_by": current_user.id
            }
        )
        db.add(audit_log)
        db.commit()
        
        return KeyEscrowResponse(
            escrow_id=escrow.id,
            key_id=request.key_id,
            user_id=key.user_id,
            escrow_method=request.escrow_method,
            recovery_hint=request.recovery_hint,
            created_at=escrow.created_at,
            created_by=current_user.id
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create key escrow: {str(e)}"
        )


@router.post("/recover", response_model=KeyRecoveryResponse)
async def recover_encryption_key(
    request: KeyRecoveryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Recover encryption key from escrow (admin only)."""
    if not has_permission(current_user, "encryption:admin", db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges for key recovery operations"
        )
    
    # Find escrow record
    escrow = db.query(KeyEscrow).filter(KeyEscrow.key_id == request.key_id).first()
    if not escrow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Key escrow not found"
        )
    
    try:
        # Create audit log for recovery attempt
        audit_log = EncryptionAuditLog(
            user_id=escrow.user_id,
            action="recover_key",
            key_id=request.key_id,
            success=True,
            details={
                "recovery_reason": request.recovery_reason,
                "recovered_by": current_user.id
            }
        )
        db.add(audit_log)
        
        # Update escrow with recovery info
        escrow.recovered_at = func.now()
        escrow.recovered_by = current_user.id
        escrow.recovery_reason = request.recovery_reason
        
        db.commit()
        
        return KeyRecoveryResponse(
            key_id=request.key_id,
            user_id=escrow.user_id,
            escrow_data=escrow.escrow_data,
            escrow_method=escrow.escrow_method,
            recovery_hint=escrow.recovery_hint,
            recovered_at=escrow.recovered_at,
            recovered_by=current_user.id
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to recover key: {str(e)}"
        )


# Health Check
@router.get("/health", response_model=EncryptionHealthCheck)
async def encryption_health_check(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Check encryption system health."""
    try:
        # Test basic crypto operations
        test_key = secrets.token_bytes(32)
        test_iv = secrets.token_bytes(12)
        test_data = b"health check test data"
        
        # Test AES-GCM encryption/decryption
        aesgcm = AESGCM(test_key)
        ciphertext = aesgcm.encrypt(test_iv, test_data, None)
        decrypted = aesgcm.decrypt(test_iv, ciphertext, None)
        
        crypto_functional = (decrypted == test_data)
        
        # Check database connectivity
        user_keys_count = db.query(UserEncryptionKey).filter(
            UserEncryptionKey.user_id == current_user.id
        ).count()
        
        # Check audit log functionality
        audit_count = db.query(EncryptionAuditLog).filter(
            EncryptionAuditLog.user_id == current_user.id
        ).count()
        
        return EncryptionHealthCheck(
            status="healthy" if crypto_functional else "unhealthy",
            crypto_functional=crypto_functional,
            user_keys_count=user_keys_count,
            audit_logs_count=audit_count,
            escrow_enabled=settings.ENCRYPTION_ESCROW_ENABLED,
            supported_algorithms=["AES-256-GCM"],
            supported_kdf=["PBKDF2-SHA256"]
        )
        
    except Exception as e:
        return EncryptionHealthCheck(
            status="unhealthy",
            crypto_functional=False,
            error=str(e),
            user_keys_count=0,
            audit_logs_count=0,
            escrow_enabled=False,
            supported_algorithms=[],
            supported_kdf=[]
        )


# Background task functions
async def create_key_escrow_async(db: Session, user_id: int, key_id: str, derived_key: bytes):
    """Background task to create key escrow."""
    try:
        # This would encrypt the key using master escrow key
        # For now, we'll create a placeholder escrow
        escrow = KeyEscrow(
            key_id=key_id,
            user_id=user_id,
            escrow_data="encrypted_with_master_key",
            escrow_method="admin_escrow",
            created_by=1  # System user
        )
        
        db.add(escrow)
        db.commit()
        
    except Exception as e:
        # Log error but don't fail the main operation
        print(f"Failed to create automatic escrow: {e}")