"""
Security module for SecureVault authentication and authorization.

This module provides all security-related functionality including password hashing,
JWT token management, TOTP handling, and password policy enforcement.
"""

import bcrypt
import jwt
import secrets
import uuid
import re
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from passlib.context import CryptContext
from pydantic import BaseModel
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .config import settings


# Custom Exceptions
class SecurityError(Exception):
    """Base exception for security-related errors."""
    pass


class PasswordHashingError(SecurityError):
    """Exception raised when password hashing fails."""
    pass


class WeakPasswordError(SecurityError):
    """Exception raised when password doesn't meet policy requirements."""
    pass


class TokenError(SecurityError):
    """Base exception for token-related errors."""
    pass


class ExpiredTokenError(TokenError):
    """Exception raised when token has expired."""
    pass


class InvalidTokenError(TokenError):
    """Exception raised when token is invalid."""
    pass


class MalformedTokenError(TokenError):
    """Exception raised when token is malformed."""
    pass


# Password Strength Validation Result
class PasswordValidationResult(BaseModel):
    """Result of password strength validation."""
    is_valid: bool
    issues: List[str]
    entropy_score: float
    
    
# Password policy configuration
_password_policy = {
    'min_length': settings.PASSWORD_MIN_LENGTH,
    'require_uppercase': settings.PASSWORD_REQUIRE_UPPERCASE,
    'require_lowercase': settings.PASSWORD_REQUIRE_LOWERCASE,
    'require_digits': settings.PASSWORD_REQUIRE_DIGITS,
    'require_special_chars': settings.PASSWORD_REQUIRE_SPECIAL_CHARS,
    'max_length': settings.PASSWORD_MAX_LENGTH,
    'bcrypt_rounds': settings.BCRYPT_ROUNDS,
    'entropy_threshold': settings.PASSWORD_ENTROPY_THRESHOLD,
}


def configure_password_policy(policy: Dict[str, Any]) -> None:
    """Configure password policy settings."""
    global _password_policy
    _password_policy.update(policy)


# Password Context for hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def generate_salt(rounds: int = None) -> str:
    """Generate a bcrypt salt with specified rounds."""
    if rounds is None:
        rounds = _password_policy['bcrypt_rounds']
    return bcrypt.gensalt(rounds=rounds).decode('utf-8')


def hash_password(password: str, rounds: int = None) -> str:
    """
    Hash a password using bcrypt with salt.
    
    Args:
        password: Password to hash
        rounds: Number of bcrypt rounds (default from settings)
        
    Returns:
        Hashed password string
        
    Raises:
        WeakPasswordError: If password doesn't meet policy requirements
        PasswordHashingError: If hashing fails
    """
    if password is None:
        raise WeakPasswordError("Password cannot be None")
        
    if password == "":
        raise WeakPasswordError("Password cannot be empty")
    
    # Validate password strength
    validation_result = validate_password_strength(password)
    if not validation_result.is_valid:
        raise WeakPasswordError(f"Password doesn't meet policy requirements: {', '.join(validation_result.issues)}")
    
    try:
        if rounds is None:
            rounds = _password_policy['bcrypt_rounds']
            
        # Generate salt and hash
        salt = bcrypt.gensalt(rounds=rounds)
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
        
    except Exception as e:
        raise PasswordHashingError(f"Password hashing failed: {str(e)}")


def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    
    Args:
        password: Plain text password
        hashed_password: Hashed password to verify against
        
    Returns:
        True if password matches, False otherwise
        
    Raises:
        PasswordHashingError: If verification fails due to system error
    """
    if not password or not hashed_password:
        return False
        
    try:
        return bcrypt.checkpw(
            password.encode('utf-8'), 
            hashed_password.encode('utf-8')
        )
    except Exception as e:
        raise PasswordHashingError(f"Password verification failed: {str(e)}")


def validate_password_strength(password: str) -> PasswordValidationResult:
    """
    Validate password strength against policy requirements.
    
    Args:
        password: Password to validate
        
    Returns:
        PasswordValidationResult with validation details
    """
    if password is None:
        raise WeakPasswordError("Password cannot be None")
        
    issues = []
    
    # Check minimum length
    if len(password) < _password_policy['min_length']:
        issues.append(f"Password too short (minimum {_password_policy['min_length']} characters)")
    
    # Check maximum length
    if len(password) > _password_policy['max_length']:
        issues.append(f"Password too long (maximum {_password_policy['max_length']} characters)")
    
    # Check character requirements
    if _password_policy['require_uppercase'] and not re.search(r'[A-Z]', password):
        issues.append("Password must contain at least one uppercase letter")
        
    if _password_policy['require_lowercase'] and not re.search(r'[a-z]', password):
        issues.append("Password must contain at least one lowercase letter")
        
    if _password_policy['require_digits'] and not re.search(r'\d', password):
        issues.append("Password must contain at least one digit")
        
    if _password_policy['require_special_chars'] and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        issues.append("Password must contain at least one special character")
    
    # Check against common passwords
    common_passwords = {
        'password123', 'password123!', '123456789', 'qwerty123', 'admin123!',
        'password', '12345678', 'qwerty', 'admin', 'letmein'
    }
    
    if password.lower() in common_passwords:
        issues.append("Password is too common")
    
    # Calculate entropy score
    entropy_score = calculate_password_entropy(password)
    if entropy_score < _password_policy['entropy_threshold']:
        issues.append(f"Password entropy too low (minimum {_password_policy['entropy_threshold']})")
    
    return PasswordValidationResult(
        is_valid=len(issues) == 0,
        issues=issues,
        entropy_score=entropy_score
    )


def calculate_password_entropy(password: str) -> float:
    """Calculate password entropy score."""
    if not password:
        return 0.0
        
    # Character set sizes
    char_sets = {
        'lowercase': 26,
        'uppercase': 26,
        'digits': 10,
        'special': 32,
    }
    
    # Determine which character sets are used
    charset_size = 0
    if re.search(r'[a-z]', password):
        charset_size += char_sets['lowercase']
    if re.search(r'[A-Z]', password):
        charset_size += char_sets['uppercase']
    if re.search(r'\d', password):
        charset_size += char_sets['digits']
    if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        charset_size += char_sets['special']
    
    if charset_size == 0:
        return 0.0
    
    # Calculate entropy: log2(charset_size^length)
    import math
    entropy = len(password) * math.log2(charset_size)
    
    # Penalize for patterns and repetition
    unique_chars = len(set(password))
    repetition_penalty = unique_chars / len(password)
    
    return entropy * repetition_penalty


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Payload data to encode in token
        expires_delta: Custom expiration time
        
    Returns:
        JWT token string
        
    Raises:
        TokenError: If token creation fails
    """
    if not data or "sub" not in data:
        raise ValueError("Token data must contain 'sub' field")
        
    to_encode = data.copy()
    
    # Set expiration
    if expires_delta and expires_delta.total_seconds() < 0:
        raise ValueError("Expiration delta cannot be negative")
        
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Add standard claims
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
        "jti": str(uuid.uuid4())  # Unique token ID
    })
    
    try:
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    except Exception as e:
        raise TokenError(f"Token creation failed: {str(e)}")


def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT refresh token.
    
    Args:
        data: Payload data to encode in token
        expires_delta: Custom expiration time
        
    Returns:
        JWT refresh token string
        
    Raises:
        TokenError: If token creation fails
    """
    if not data or "sub" not in data:
        raise ValueError("Token data must contain 'sub' field")
        
    to_encode = data.copy()
    
    # Set expiration (longer than access token)
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    # Add standard claims
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
        "jti": str(uuid.uuid4())  # Unique token ID
    })
    
    try:
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    except Exception as e:
        raise TokenError(f"Refresh token creation failed: {str(e)}")


def verify_token(token: str) -> bool:
    """
    Verify JWT token validity.
    
    Args:
        token: JWT token to verify
        
    Returns:
        True if token is valid
        
    Raises:
        ExpiredTokenError: If token has expired
        InvalidTokenError: If token is invalid
        MalformedTokenError: If token is malformed
    """
    if not token:
        raise MalformedTokenError("Token cannot be empty")
        
    try:
        jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return True
        
    except jwt.ExpiredSignatureError:
        raise ExpiredTokenError("Token has expired")
        
    except jwt.InvalidSignatureError:
        raise InvalidTokenError("Token signature is invalid")
        
    except jwt.DecodeError:
        raise MalformedTokenError("Token is malformed")
        
    except jwt.InvalidTokenError:
        raise InvalidTokenError("Token is invalid")


def decode_token(token: str, verify: bool = True) -> Dict[str, Any]:
    """
    Decode JWT token payload.
    
    Args:
        token: JWT token to decode
        verify: Whether to verify token signature
        
    Returns:
        Token payload dictionary
        
    Raises:
        TokenError: If token decoding fails
    """
    if not token:
        raise MalformedTokenError("Token cannot be empty")
        
    try:
        if verify:
            return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        else:
            return jwt.decode(token, options={"verify_signature": False})
            
    except jwt.ExpiredSignatureError:
        if verify:
            raise ExpiredTokenError("Token has expired")
        else:
            return jwt.decode(token, options={"verify_signature": False})
            
    except jwt.InvalidSignatureError:
        raise InvalidTokenError("Token signature is invalid")
        
    except jwt.DecodeError:
        raise MalformedTokenError("Token is malformed")
        
    except jwt.InvalidTokenError:
        raise InvalidTokenError("Token is invalid")


def get_token_payload(token: str) -> 'TokenData':
    """
    Extract token payload and convert to TokenData object.
    
    Args:
        token: JWT token to extract payload from
        
    Returns:
        TokenData object with user information
        
    Raises:
        InvalidTokenError: If required fields are missing
    """
    payload = decode_token(token)
    
    # Validate required fields
    if "sub" not in payload:
        raise InvalidTokenError("Token missing required 'sub' field")
        
    # Import here to avoid circular imports
    from ..schemas.auth import TokenData
    
    return TokenData(
        username=payload.get("sub"),
        user_id=payload.get("user_id"),
        role=payload.get("role"),
        permissions=payload.get("permissions", [])
    )


# TOTP/MFA functionality placeholders for future implementation
def generate_totp_secret() -> str:
    """Generate a new TOTP secret key."""
    return secrets.token_urlsafe(32)


def verify_totp_token(secret: str, token: str) -> bool:
    """
    Verify TOTP token against secret.
    
    Args:
        secret: The base32-encoded TOTP secret
        token: The 6-digit TOTP code to verify
        
    Returns:
        True if the token is valid, False otherwise
    """
    try:
        import pyotp
        
        if not secret or not token:
            return False
            
        # Clean up the token (remove spaces, ensure it's 6 digits)
        clean_token = token.strip().replace(' ', '')
        if not clean_token.isdigit() or len(clean_token) != 6:
            return False
            
        # Create TOTP instance and verify
        totp = pyotp.TOTP(secret)
        
        # Verify with a window of plus/minus 1 (allows for 30-second clock drift)
        return totp.verify(clean_token, valid_window=1)
        
    except Exception as e:
        # Log the error in production
        print(f"TOTP verification error: {str(e)}")
        return False


def generate_qr_code_url(secret: str, username: str) -> str:
    """Generate QR code URL for TOTP setup."""
    # Placeholder - will be implemented in MFA phase
    return f"otpauth://totp/SecureVault:{username}?secret={secret}&issuer=SecureVault"


# User dependency functions for FastAPI
async def get_current_user(token: HTTPAuthorizationCredentials = Depends(HTTPBearer())) -> 'User':
    """
    Get current user from JWT token.
    
    Args:
        token: Authorization token from request header
        
    Returns:
        User object
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    from fastapi import HTTPException, status
    from ..models.user import User
    from ..core.database import get_db
    
    try:
        # Decode and verify token
        payload = decode_token(token.credentials)
        
        # Try to get user_id first, then fall back to sub field
        user_id = payload.get("user_id")
        username = payload.get("sub")
        
        # Get user from database
        db = next(get_db())
        user = None
        
        # Try to find user by ID first (more efficient)
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
        
        # If not found by ID, try by username from sub field
        if not user and username:
            user = db.query(User).filter(User.username == username).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is disabled",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user
        
    except ExpiredTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (InvalidTokenError, MalformedTokenError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user_optional(
    token: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional['User']:
    """
    Get current user from JWT token (optional - returns None if no token).

    Args:
        token: Optional authorization token from request header

    Returns:
        User object or None if no token provided or invalid
    """
    if not token:
        return None

    try:
        # Use the existing get_current_user logic but catch exceptions
        from ..models.user import User
        from ..core.database import get_db

        # Decode and verify token
        payload = decode_token(token.credentials)
        
        # Try to get user_id first, then fall back to sub field
        user_id = payload.get("user_id")
        username = payload.get("sub")
        
        # Get user from database
        db = next(get_db())
        user = None
        
        # Try to find user by ID first (more efficient)
        if user_id:
            user = db.query(User).filter(User.id == user_id).first()
        
        # If not found by ID, try by username from sub field
        if not user and username:
            user = db.query(User).filter(User.username == username).first()

        if not user or not user.is_active:
            return None

        return user

    except (ExpiredTokenError, InvalidTokenError, MalformedTokenError, Exception):
        return None


def require_role(allowed_roles: List[str]):
    """
    Create a dependency that requires specific user roles.
    
    Args:
        allowed_roles: List of allowed role names
        
    Returns:
        FastAPI dependency function
    """
    async def role_dependency(current_user: 'User' = Depends(get_current_user)) -> 'User':
        from fastapi import HTTPException, status
        
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {allowed_roles}"
            )
        
        return current_user
    
    return role_dependency