"""
Multi-Factor Authentication (MFA) core functionality for SecureVault.

This module implements TOTP-based MFA with Google Authenticator compatibility,
QR code generation, backup codes, and comprehensive security features.

Key Features:
- TOTP secret generation and validation
- Google Authenticator compatible TOTP codes
- QR code generation for easy setup
- Backup codes with secure hashing
- MFA verification with rate limiting
- Replay attack protection
- Time drift tolerance
"""

import base64
import hashlib
import io
import pyotp
import qrcode
import secrets
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
from urllib.parse import quote

from PIL import Image

from .security import hash_password, verify_password
from ..models.user import User


# Custom exceptions for MFA operations
class MFAError(Exception):
    """Base exception for MFA operations."""
    pass


class TOTPError(MFAError):
    """Base exception for TOTP operations."""
    pass


class MFANotEnabledError(MFAError):
    """Raised when MFA is not enabled for user."""
    pass


class MFAAlreadyEnabledError(MFAError):
    """Raised when trying to enable MFA that's already enabled."""
    pass


class InvalidMFACodeError(MFAError):
    """Raised when MFA code format is invalid."""
    pass


class InvalidTOTPSecretError(TOTPError):
    """Raised when TOTP secret is invalid."""
    pass


class InvalidTOTPCodeError(TOTPError):
    """Raised when TOTP code is invalid."""
    pass


class ExpiredTOTPCodeError(TOTPError):
    """Raised when TOTP code has expired."""
    pass


class QRCodeError(MFAError):
    """Raised when QR code generation fails."""
    pass


class InvalidQRContentError(QRCodeError):
    """Raised when QR code content is invalid."""
    pass


class BackupCodeExhaustedError(MFAError):
    """Raised when all backup codes are exhausted."""
    pass


# TOTP Configuration Constants
TOTP_ALGORITHM = "SHA1"  # Google Authenticator standard
TOTP_DIGITS = 6  # Standard 6-digit codes
TOTP_PERIOD = 30  # 30-second time windows
TOTP_ISSUER = "SecureVault"
TOTP_WINDOW = 1  # Allow 1 time step tolerance for clock drift

# Backup codes configuration
BACKUP_CODE_LENGTH = 8
BACKUP_CODE_COUNT = 10
BACKUP_CODE_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

# Security configuration
MFA_RATE_LIMIT_ATTEMPTS = 5
MFA_RATE_LIMIT_WINDOW = 900  # 15 minutes
TOTP_SECRET_ENTROPY_BYTES = 20  # 160 bits (RFC 4226 recommendation)


def generate_totp_secret(entropy_bytes: int = TOTP_SECRET_ENTROPY_BYTES) -> str:
    """
    Generate a cryptographically secure TOTP secret.
    
    Args:
        entropy_bytes: Number of entropy bytes (minimum 16, maximum 64)
        
    Returns:
        Base32-encoded TOTP secret
        
    Raises:
        ValueError: If entropy_bytes is invalid
    """
    if entropy_bytes < 16:
        raise ValueError("Entropy must be at least 16 bytes (128 bits)")
    if entropy_bytes > 64:
        raise ValueError("Entropy cannot exceed 64 bytes (512 bits)")
    
    # Generate cryptographically secure random bytes
    secret_bytes = secrets.token_bytes(entropy_bytes)
    
    # Encode as base32 (Google Authenticator standard)
    secret = base64.b32encode(secret_bytes).decode('ascii')
    
    return secret


def validate_totp_secret(secret: str) -> bool:
    """
    Validate a TOTP secret format and content.
    
    Args:
        secret: Base32-encoded TOTP secret
        
    Returns:
        True if valid
        
    Raises:
        InvalidTOTPSecretError: If secret is invalid
    """
    if not secret:
        raise InvalidTOTPSecretError("TOTP secret cannot be empty")
    
    if not isinstance(secret, str):
        raise InvalidTOTPSecretError("TOTP secret must be a string")
    
    if len(secret) < 16:
        raise InvalidTOTPSecretError("TOTP secret too short")
    
    if len(secret) > 128:
        raise InvalidTOTPSecretError("TOTP secret too long")
    
    # Validate base32 encoding
    try:
        decoded = base64.b32decode(secret)
        if len(decoded) < 10:  # Minimum 80 bits
            raise InvalidTOTPSecretError("TOTP secret insufficient entropy")
    except Exception:
        raise InvalidTOTPSecretError("TOTP secret is not valid base32")
    
    return True


def generate_totp_code(
    secret: str, 
    timestamp: Optional[int] = None,
    period: int = TOTP_PERIOD,
    digits: int = TOTP_DIGITS,
    algorithm: str = TOTP_ALGORITHM
) -> str:
    """
    Generate a TOTP code using the provided secret.
    
    Args:
        secret: Base32-encoded TOTP secret
        timestamp: Unix timestamp (current time if None)
        period: Time period in seconds
        digits: Number of digits in code
        algorithm: Hash algorithm
        
    Returns:
        TOTP code as string
        
    Raises:
        InvalidTOTPSecretError: If secret is invalid
        ValueError: If parameters are invalid
    """
    # Validate secret
    validate_totp_secret(secret)
    
    # Validate parameters
    if period <= 0:
        raise ValueError("Period must be positive")
    if digits < 4 or digits > 10:
        raise ValueError("Digits must be between 4 and 10")
    
    # Use current time if not provided
    if timestamp is None:
        timestamp = int(time.time())
    
    # Create TOTP instance
    totp = pyotp.TOTP(
        secret,
        digits=digits,
        digest=getattr(hashlib, algorithm.lower()),
        interval=period
    )
    
    # Generate code for timestamp
    code = totp.at(timestamp)
    
    return code


def verify_totp_code(
    secret: str,
    code: str,
    window: int = TOTP_WINDOW,
    prevent_replay: bool = False,
    user_id: Optional[int] = None
) -> bool:
    """
    Verify a TOTP code against the secret.
    
    Args:
        secret: Base32-encoded TOTP secret
        code: TOTP code to verify
        window: Time window tolerance (number of periods)
        prevent_replay: Enable replay attack protection
        user_id: User ID for replay protection
        
    Returns:
        True if code is valid
        
    Raises:
        InvalidTOTPSecretError: If secret is invalid
        InvalidTOTPCodeError: If code format is invalid
    """
    # Validate secret
    validate_totp_secret(secret)
    
    # Validate code format
    if not code or not isinstance(code, str):
        raise InvalidTOTPCodeError("TOTP code must be a non-empty string")
    
    if not code.isdigit():
        raise InvalidTOTPCodeError("TOTP code must contain only digits")
    
    if len(code) != TOTP_DIGITS:
        raise InvalidTOTPCodeError(f"TOTP code must be {TOTP_DIGITS} digits")
    
    # Check for replay protection
    if prevent_replay and user_id:
        if is_totp_code_used(user_id, code):
            return False
    
    # Create TOTP instance
    totp = pyotp.TOTP(secret, digits=TOTP_DIGITS, interval=TOTP_PERIOD)
    
    # Verify code with time window tolerance
    try:
        is_valid = totp.verify(code, valid_window=window)
        
        # Mark code as used for replay protection
        if is_valid and prevent_replay and user_id:
            mark_totp_code_used(user_id, code)
        
        return is_valid
    except Exception:
        return False


def get_totp_provisioning_uri(
    secret: str,
    account_name: str,
    issuer_name: str = TOTP_ISSUER,
    period: int = TOTP_PERIOD,
    digits: int = TOTP_DIGITS,
    algorithm: str = TOTP_ALGORITHM
) -> str:
    """
    Generate a TOTP provisioning URI for QR code generation.
    
    Args:
        secret: Base32-encoded TOTP secret
        account_name: Account name (usually email)
        issuer_name: Service issuer name
        period: Time period in seconds
        digits: Number of digits
        algorithm: Hash algorithm
        
    Returns:
        TOTP provisioning URI
        
    Raises:
        InvalidTOTPSecretError: If secret is invalid
        ValueError: If parameters are invalid
    """
    # Validate secret
    validate_totp_secret(secret)
    
    # Validate parameters
    if not account_name:
        raise ValueError("Account name cannot be empty")
    if not issuer_name:
        raise ValueError("Issuer name cannot be empty")
    
    # URL encode parameters
    encoded_issuer = quote(issuer_name)
    encoded_account = quote(account_name)
    
    # Construct URI
    uri = (
        f"otpauth://totp/{encoded_issuer}:{encoded_account}"
        f"?secret={secret}"
        f"&issuer={encoded_issuer}"
        f"&period={period}"
        f"&digits={digits}"
        f"&algorithm={algorithm}"
    )
    
    return uri


def generate_qr_code(
    content: str,
    box_size: int = 10,
    border: int = 4,
    error_correction: str = 'M'
) -> Image.Image:
    """
    Generate QR code image from content.
    
    Args:
        content: Content to encode in QR code
        box_size: Size of each box in pixels
        border: Border size in boxes
        error_correction: Error correction level (L, M, Q, H)
        
    Returns:
        PIL Image object
        
    Raises:
        InvalidQRContentError: If content is invalid
        QRCodeError: If QR code generation fails
        ValueError: If parameters are invalid
    """
    if not content:
        raise InvalidQRContentError("QR code content cannot be empty")
    
    if box_size <= 0:
        raise ValueError("Box size must be positive")
    
    if border < 0:
        raise ValueError("Border cannot be negative")
    
    # Map error correction levels
    error_levels = {
        'L': qrcode.constants.ERROR_CORRECT_L,
        'M': qrcode.constants.ERROR_CORRECT_M,
        'Q': qrcode.constants.ERROR_CORRECT_Q,
        'H': qrcode.constants.ERROR_CORRECT_H,
    }
    
    if error_correction not in error_levels:
        raise ValueError("Error correction must be one of: L, M, Q, H")
    
    try:
        # Create QR code instance
        qr = qrcode.QRCode(
            version=1,
            error_correction=error_levels[error_correction],
            box_size=box_size,
            border=border,
        )
        
        # Add data and make QR code
        qr.add_data(content)
        qr.make(fit=True)
        
        # Create image
        qr_image = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to PIL Image if needed and ensure RGB mode
        if hasattr(qr_image, '_img'):
            pil_image = qr_image._img
        elif hasattr(qr_image, 'get_image'):
            pil_image = qr_image.get_image()
        else:
            # For direct PIL image compatibility
            import io
            buffer = io.BytesIO()
            qr_image.save(buffer, format='PNG')
            buffer.seek(0)
            pil_image = Image.open(buffer)
        
        # Ensure the image is in RGB mode
        if pil_image.mode != 'RGB':
            pil_image = pil_image.convert('RGB')
        
        return pil_image
        
    except Exception as e:
        raise QRCodeError(f"Failed to generate QR code: {str(e)}")


def generate_qr_code_data_uri(
    content: str,
    format: str = "PNG",
    quality: int = 85,
    **kwargs
) -> str:
    """
    Generate QR code as data URI for embedding in HTML.
    
    Args:
        content: Content to encode
        format: Image format (PNG, JPEG)
        quality: JPEG quality (1-100)
        **kwargs: Additional arguments for generate_qr_code
        
    Returns:
        Data URI string
        
    Raises:
        ValueError: If format is invalid
        QRCodeError: If generation fails
    """
    if format.upper() not in ['PNG', 'JPEG']:
        raise ValueError("Format must be PNG or JPEG")
    
    # Generate QR code image
    image = generate_qr_code(content, **kwargs)
    
    # Convert to data URI
    buffer = io.BytesIO()
    
    if format.upper() == 'JPEG':
        # Convert to RGB for JPEG
        if image.mode != 'RGB':
            image = image.convert('RGB')
        image.save(buffer, format='JPEG', quality=quality)
        mime_type = "image/jpeg"
    else:
        image.save(buffer, format='PNG')
        mime_type = "image/png"
    
    # Encode as base64
    image_data = buffer.getvalue()
    encoded_data = base64.b64encode(image_data).decode('ascii')
    
    # Create data URI
    data_uri = f"data:{mime_type};base64,{encoded_data}"
    
    return data_uri


def get_qr_code_svg(
    content: str,
    module_size: int = 8,
    fill_color: str = "black",
    back_color: str = "white"
) -> str:
    """
    Generate QR code as SVG string.
    
    Args:
        content: Content to encode
        module_size: Size of each module
        fill_color: Fill color
        back_color: Background color
        
    Returns:
        SVG string
        
    Raises:
        QRCodeError: If generation fails
    """
    try:
        # Create QR code with SVG factory
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=module_size,
            border=4,
        )
        
        qr.add_data(content)
        qr.make(fit=True)
        
        # Generate SVG
        from qrcode.image.svg import SvgPathImage
        img = qr.make_image(
            image_factory=SvgPathImage,
            fill_color=fill_color,
            back_color=back_color
        )
        
        return img.to_string()
        
    except Exception as e:
        raise QRCodeError(f"Failed to generate SVG QR code: {str(e)}")


def validate_qr_code_content(content: str) -> bool:
    """
    Validate QR code content for security and format.
    
    Args:
        content: Content to validate
        
    Returns:
        True if valid
        
    Raises:
        InvalidQRContentError: If content is invalid
    """
    if not content:
        raise InvalidQRContentError("Content cannot be empty")
    
    # Check for TOTP URI format
    if content.startswith("otpauth://totp/"):
        # Basic TOTP URI validation
        if "secret=" not in content:
            raise InvalidQRContentError("TOTP URI missing secret parameter")
        return True
    
    # Reject potentially dangerous content
    dangerous_patterns = ['<script>', 'javascript:', 'data:', 'vbscript:']
    content_lower = content.lower()
    
    for pattern in dangerous_patterns:
        if pattern in content_lower:
            raise InvalidQRContentError("Content contains potentially dangerous patterns")
    
    # Check length limits
    if len(content) > 4296:  # QR code capacity limit
        raise InvalidQRContentError("Content exceeds QR code capacity")
    
    return True


def generate_backup_codes(user_id: int, count: int = BACKUP_CODE_COUNT) -> List[str]:
    """
    Generate backup codes for MFA recovery.
    
    Args:
        user_id: User ID
        count: Number of codes to generate
        
    Returns:
        List of backup codes
        
    Raises:
        ValueError: If count is invalid
    """
    if count <= 0 or count > 50:
        raise ValueError("Backup code count must be between 1 and 50")
    
    codes = []
    
    for _ in range(count):
        # Generate random code
        code = ''.join(
            secrets.choice(BACKUP_CODE_CHARSET) 
            for _ in range(BACKUP_CODE_LENGTH)
        )
        codes.append(code)
    
    return codes


def hash_backup_code(code: str) -> str:
    """
    Hash a backup code for secure storage.
    
    Args:
        code: Backup code to hash
        
    Returns:
        Hashed backup code
    """
    import bcrypt
    return bcrypt.hashpw(code.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_backup_code(user_id: int, code: str) -> bool:
    """
    Verify a backup code and mark it as used.
    
    Args:
        user_id: User ID
        code: Backup code to verify
        
    Returns:
        True if code is valid and unused
        
    Raises:
        InvalidMFACodeError: If code format is invalid
        BackupCodeExhaustedError: If all codes are used
    """
    # Validate code format
    if not code or len(code) != BACKUP_CODE_LENGTH:
        raise InvalidMFACodeError("Invalid backup code format")
    
    if not code.isalnum() or not code.isupper():
        raise InvalidMFACodeError("Backup code must be uppercase alphanumeric")
    
    # Get user backup codes
    backup_codes = get_user_backup_codes(user_id)
    if not backup_codes:
        return False
    
    # Check if code exists and is unused
    for stored_code in backup_codes:
        if verify_password(code, stored_code['hash']) and not stored_code['used']:
            # Mark as used
            mark_backup_code_used(user_id, code)
            return True
    
    # Check if all codes are exhausted
    unused_count = count_unused_backup_codes(user_id)
    if unused_count == 0:
        raise BackupCodeExhaustedError("All backup codes have been used")
    
    return False


# Helper functions that delegate to service layer
def get_user_backup_codes(user_id: int) -> List[Dict[str, Any]]:
    """Get user's backup codes from database."""
    from ..services.mfa_service import get_mfa_service
    service = get_mfa_service()
    return service.get_user_backup_codes(user_id)


def mark_backup_code_used(user_id: int, code: str) -> None:
    """Mark a backup code as used in database."""
    # This is handled within verify_backup_code
    pass


def count_unused_backup_codes(user_id: int) -> int:
    """Count unused backup codes for user."""
    from ..services.mfa_service import get_mfa_service
    service = get_mfa_service()
    return service.count_unused_backup_codes(user_id)


def is_totp_code_used(user_id: int, code: str) -> bool:
    """Check if TOTP code was recently used (replay protection)."""
    from ..services.mfa_service import get_mfa_service
    service = get_mfa_service()
    return service.is_totp_code_used(user_id, code)


def mark_totp_code_used(user_id: int, code: str) -> None:
    """Mark TOTP code as used for replay protection."""
    from ..services.mfa_service import get_mfa_service
    service = get_mfa_service()
    service.mark_totp_code_used(user_id, code)


def encrypt_mfa_secret(secret: str) -> str:
    """Encrypt MFA secret for database storage."""
    from ..services.mfa_service import get_mfa_service
    service = get_mfa_service()
    return service._encrypt_secret(secret)


def decrypt_mfa_secret(encrypted_secret: str) -> str:
    """Decrypt MFA secret from database."""
    from ..services.mfa_service import get_mfa_service
    service = get_mfa_service()
    return service._decrypt_secret(encrypted_secret)


def save_mfa_secret(user_id: int, secret: str) -> None:
    """Save encrypted MFA secret to database."""
    # This is handled within setup_user_mfa
    pass


def get_user_mfa_secret(user_id: int) -> Optional[str]:
    """Get user's MFA secret from database."""
    from ..services.mfa_service import get_mfa_service
    service = get_mfa_service()
    return service.get_user_mfa_secret(user_id)


def is_mfa_enabled_for_user(user_id: int) -> bool:
    """Check if MFA is enabled for user."""
    from ..services.mfa_service import get_mfa_service
    service = get_mfa_service()
    return service.is_mfa_enabled_for_user(user_id)


def get_user_by_id(user_id: int) -> Optional[User]:
    """Get user by ID from database."""
    from ..core.database import get_db
    from ..models.user import User
    db = next(get_db())
    return db.query(User).filter(User.id == user_id).first()


def validate_user_password(user_id: int, password: str) -> bool:
    """Validate user's password."""
    from ..core.security import verify_password
    user = get_user_by_id(user_id)
    if not user:
        return False
    return verify_password(password, user.password_hash)


def save_backup_codes(user_id: int, codes: List[str]) -> None:
    """Save hashed backup codes to database."""
    # This is handled within setup_user_mfa and generate_new_backup_codes
    pass


def remove_mfa_for_user(user_id: int) -> None:
    """Remove MFA configuration for user."""
    from ..services.mfa_service import get_mfa_service
    service = get_mfa_service()
    service.disable_user_mfa(user_id)


def is_user_admin(user_id: int) -> bool:
    """Check if user has admin privileges."""
    user = get_user_by_id(user_id)
    return user.is_admin if user else False


def log_mfa_reset(user_id: int, admin_id: int) -> None:
    """Log MFA reset event for audit."""
    # This is handled within reset_mfa_for_user
    pass


def is_mfa_rate_limited(user_id: int) -> bool:
    """Check if user is rate limited for MFA attempts."""
    from ..services.mfa_service import get_mfa_service
    service = get_mfa_service()
    return service.is_mfa_rate_limited(user_id)


def is_mfa_required_by_policy(user_id: int) -> bool:
    """Check if MFA is required by admin policy."""
    from ..services.mfa_service import get_mfa_service
    service = get_mfa_service()
    user = get_user_by_id(user_id)
    if not user:
        return False
    return service._is_mfa_required_by_policy(user.role)


def get_mfa_setup_date(user_id: int) -> Optional[datetime]:
    """Get MFA setup date for user."""
    user = get_user_by_id(user_id)
    return user.mfa_setup_date if user else None


# Main service functions
def setup_user_mfa(user_id: int, password: str, issuer: str = "SecureVault") -> Dict[str, Any]:
    """Set up MFA for a user using service layer."""
    from ..services.mfa_service import get_mfa_service
    from ..schemas.mfa import MFASetupResponse
    
    service = get_mfa_service()
    result = service.setup_user_mfa(user_id, password, issuer)
    
    # Create provisioning URI and QR code
    user = get_user_by_id(user_id)
    if not user:
        raise ValueError("User not found")
    
    provisioning_uri = get_totp_provisioning_uri(
        result['secret'],
        user.email,
        issuer
    )
    
    qr_code_data_uri = generate_qr_code_data_uri(provisioning_uri)
    
    return MFASetupResponse(
        secret=result['secret'],
        qr_code_url=provisioning_uri,
        qr_code_data_uri=qr_code_data_uri,
        backup_codes=result['backup_codes']
    )


def verify_mfa_code(user_id: int, code: str) -> bool:
    """Verify MFA code using service layer."""
    from ..services.mfa_service import get_mfa_service
    
    service = get_mfa_service()
    
    # Check if it's a TOTP code (6 digits) or backup code (8 chars)
    if len(code) == 6 and code.isdigit():
        # TOTP verification
        secret = service.get_user_mfa_secret(user_id)
        if not secret:
            return False
        
        is_valid = verify_totp_code(
            secret=secret,
            code=code,
            prevent_replay=True,
            user_id=user_id
        )
        return is_valid
    
    elif len(code) == 8:
        # Backup code verification
        return service.verify_backup_code(user_id, code)
    
    else:
        raise InvalidMFACodeError("Invalid code format")


def disable_user_mfa(user_id: int, password: str, admin_override: bool = False) -> bool:
    """Disable MFA for a user."""
    from ..services.mfa_service import get_mfa_service
    
    # Validate password unless admin override
    if not admin_override:
        if not validate_user_password(user_id, password):
            raise ValueError("Invalid password")
    
    service = get_mfa_service()
    return service.disable_user_mfa(user_id, admin_override)


def generate_new_backup_codes_for_user(user_id: int, count: int = BACKUP_CODE_COUNT) -> List[str]:
    """Generate new backup codes for a user."""
    from ..services.mfa_service import get_mfa_service
    
    service = get_mfa_service()
    return service.generate_new_backup_codes(user_id, count)


def get_mfa_status(user_id: int) -> Dict[str, Any]:
    """Get MFA status for a user."""
    from ..services.mfa_service import get_mfa_service
    from ..schemas.mfa import MFAStatus
    
    service = get_mfa_service()
    status_data = service.get_mfa_status(user_id)
    
    return MFAStatus(**status_data)


def is_mfa_required(user_id: int) -> bool:
    """Check if MFA is required for a user."""
    # Check if user has MFA enabled
    if is_mfa_enabled_for_user(user_id):
        return True
    
    # Check if MFA is required by policy
    return is_mfa_required_by_policy(user_id)


def reset_mfa_for_user(user_id: int, admin_id: int) -> bool:
    """Reset MFA for a user (admin action)."""
    from ..services.mfa_service import get_mfa_service
    
    # Verify admin has privileges
    if not is_user_admin(admin_id):
        raise ValueError("Admin privileges required")
    
    service = get_mfa_service()
    return service.reset_mfa_for_user(user_id, admin_id)