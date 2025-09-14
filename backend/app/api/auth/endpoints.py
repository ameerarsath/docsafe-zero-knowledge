"""
Authentication endpoints for SecureVault API.

This module implements all authentication-related endpoints including
login, logout, token refresh, and user session management.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional

from ...core.database import get_db
from ...core.redis import get_redis, RedisManager
from ...core.security import (
    verify_password, 
    create_access_token, 
    create_refresh_token,
    verify_token,
    get_token_payload,
    decode_token,
    ExpiredTokenError,
    InvalidTokenError,
    MalformedTokenError
)
from ...core.config import settings
from ...models.user import User
from ...schemas.auth import (
    LoginRequest, 
    LoginResponse, 
    TokenRefreshRequest, 
    TokenRefreshResponse,
    MFAVerificationRequest,
    SessionData,
    ErrorResponse,
    ZeroKnowledgeRegistrationRequest,
    ZeroKnowledgeRegistrationResponse,
    SimpleRegistrationRequest
)

router = APIRouter()
security = HTTPBearer()


async def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Get user by username or email from database."""
    # First try by username
    user = db.query(User).filter(User.username == username).first()
    if user:
        return user
    
    # If not found, try by email (for flexibility)
    return db.query(User).filter(User.email == username).first()


async def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get user by ID from database."""
    return db.query(User).filter(User.id == user_id).first()


async def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """
    Authenticate user with username and password.
    
    Args:
        db: Database session
        username: Username
        password: Plain text password
        
    Returns:
        User object if authentication successful, None otherwise
    """
    user = await get_user_by_username(db, username)
    
    if not user:
        return None
    
    if not user.can_login():
        return None
    
    if not verify_password(password, user.password_hash):
        return None
    return user


async def create_user_session(
    redis: RedisManager, 
    user: User, 
    request: Request
) -> None:
    """
    Create user session in Redis.
    
    Args:
        redis: Redis manager
        user: User object
        request: FastAPI request object
    """
    session_data = SessionData(
        user_id=user.id,
        username=user.username,
        role=user.role,
        login_time=datetime.utcnow(),
        last_activity=datetime.utcnow(),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    # Store session for 24 hours
    await redis.set_session(user.username, session_data, expire_seconds=86400)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token.
    
    Args:
        credentials: HTTP Bearer credentials
        db: Database session
        
    Returns:
        Current user object
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    try:
        # Verify and decode token
        verify_token(credentials.credentials)
        token_data = get_token_payload(credentials.credentials)
        
        # Get user from database
        user = await get_user_by_username(db, token_data.username)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        if not user.can_login():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is disabled"
            )
        
        return user
        
    except ExpiredTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except (InvalidTokenError, MalformedTokenError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
    redis: RedisManager = Depends(get_redis)
):
    """
    Authenticate user and return JWT tokens.
    
    Args:
        login_data: Login request with username and password
        request: FastAPI request object
        db: Database session
        redis: Redis manager
        
    Returns:
        LoginResponse with JWT tokens
        
    Raises:
        HTTPException: If authentication fails
    """
    # Check rate limiting
    rate_limit_key = f"login:{login_data.username}"
    if await redis.is_rate_limited(
        rate_limit_key, 
        settings.LOGIN_RATE_LIMIT_ATTEMPTS,
        settings.LOGIN_RATE_LIMIT_WINDOW
    ):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later."
        )
    
    # Authenticate user
    try:
        user = await authenticate_user(db, login_data.username, login_data.password)
        
        if not user:
            # Increment rate limit counter for failed attempts
            await redis.set_rate_limit(
                rate_limit_key,
                settings.LOGIN_RATE_LIMIT_ATTEMPTS,
                settings.LOGIN_RATE_LIMIT_WINDOW
            )
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Check if MFA is required
        if user.mfa_enabled:
            # Create temporary token for MFA completion
            temp_token_data = {
                "user_id": user.id,
                "username": user.username,
                "stage": "mfa_required"
            }
            temp_token = create_access_token(
                data={"sub": user.username, "temp": True},
                expires_delta=timedelta(minutes=5)
            )
            
            await redis.store_temp_token(temp_token, temp_token_data, expire_seconds=300)
            
            return LoginResponse(
                access_token="",  # No access token yet
                refresh_token="",  # No refresh token yet
                token_type="bearer",
                expires_in=0,
                user_id=user.id,
                username=user.username,
                role=user.role,
                must_change_password=user.must_change_password,
                mfa_required=True,
                temp_token=temp_token
            )
        
        # Create JWT tokens
        token_data = {
            "sub": user.username,
            "user_id": user.id,
            "role": user.role
        }
        
        access_token = create_access_token(data=token_data)
        refresh_token = create_refresh_token(data=token_data)
        
        # Create user session
        await create_user_session(redis, user, request)
        
        # Update user last login
        user.last_login = datetime.utcnow()
        user.failed_login_attempts = 0  # Reset failed attempts
        db.add(user)
        db.commit()
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user_id=user.id,
            username=user.username,
            role=user.role,
            must_change_password=user.must_change_password,
            mfa_required=False,
            # Zero-Knowledge encryption parameters (returned after successful stage 1 login)
            encryption_salt=getattr(user, 'encryption_salt', None),
            key_verification_payload=getattr(user, 'key_verification_payload', None),
            encryption_method=getattr(user, 'encryption_method', None),
            key_derivation_iterations=getattr(user, 'key_derivation_iterations', None)
        )
        
    except Exception as e:
        # Log error with full traceback
        import traceback
        print(f"Login error: {str(e)}")
        print(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.post("/mfa/verify", response_model=LoginResponse)
async def verify_mfa(
    mfa_data: MFAVerificationRequest,
    request: Request,
    db: Session = Depends(get_db),
    redis: RedisManager = Depends(get_redis)
):
    """
    Complete MFA verification and return JWT tokens.
    
    Args:
        mfa_data: MFA verification request
        request: FastAPI request object
        db: Database session
        redis: Redis manager
        
    Returns:
        LoginResponse with JWT tokens
    """
    # Get temporary token data
    temp_data = await redis.get_temp_token_data(mfa_data.temp_token)
    
    if not temp_data or temp_data.get("stage") != "mfa_required":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired temporary token"
        )
    
    # Get user
    user = await get_user_by_id(db, temp_data["user_id"])
    if not user or not user.can_login():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is disabled"
        )
    
    # Verify TOTP code - need to decrypt the secret first
    from ...core.mfa import decrypt_mfa_secret
    from ...core.security import verify_totp_token
    
    try:
        # Decrypt the stored MFA secret
        decrypted_secret = decrypt_mfa_secret(user.mfa_secret)
        
        # Verify the TOTP code with decrypted secret
        if not verify_totp_token(decrypted_secret, mfa_data.mfa_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid MFA code"
            )
    except Exception as e:
        # Log error for debugging
        print(f"MFA verification error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code"
        )
    
    # Create JWT tokens
    token_data = {
        "sub": user.username,
        "user_id": user.id,
        "role": user.role
    }
    
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data)
    
    # Create user session
    await create_user_session(redis, user, request)
    
    # Update user last login
    user.last_login = datetime.utcnow()
    db.add(user)
    db.commit()
    
    # Clean up temporary token
    await redis.delete_temp_token(mfa_data.temp_token)
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.id,
        username=user.username,
        role=user.role,
        must_change_password=user.must_change_password,
        mfa_required=False
    )


@router.post("/logout")
async def logout(
    request: Request,
    redis: RedisManager = Depends(get_redis),
    db: Session = Depends(get_db)
):
    """
    Logout user and clear session.
    
    This endpoint handles logout gracefully even if the token is expired or invalid.
    
    Returns:
        Success message
    """
    try:
        # Try to get current user from Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                # Try to decode token to get username
                token_data = get_token_payload(token)
                if token_data and token_data.username:
                    # Delete user session if we can identify the user
                    await redis.delete_session(token_data.username)
            except (ExpiredTokenError, InvalidTokenError, MalformedTokenError):
                # Token is invalid but that's OK for logout
                pass
    except Exception:
        # If anything fails, that's OK for logout
        pass
    
    return {"message": "Successfully logged out"}


@router.post("/refresh", response_model=TokenRefreshResponse)
async def refresh_token(
    refresh_data: TokenRefreshRequest,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token.
    
    Args:
        refresh_data: Token refresh request
        db: Database session
        
    Returns:
        New access token
    """
    try:
        # Verify refresh token
        verify_token(refresh_data.refresh_token)
        token_data = get_token_payload(refresh_data.refresh_token)
        
        # Verify it's a refresh token
        payload = decode_token(refresh_data.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        # Get user
        user = await get_user_by_username(db, token_data.username)
        if not user or not user.can_login():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User account is disabled"
            )
        
        # Create new access token
        new_token_data = {
            "sub": user.username,
            "user_id": user.id,
            "role": user.role
        }
        
        access_token = create_access_token(data=new_token_data)
        
        return TokenRefreshResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
    except ExpiredTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired"
        )
    except (InvalidTokenError, MalformedTokenError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )


@router.post("/register", response_model=ZeroKnowledgeRegistrationResponse)
async def zero_knowledge_register(
    registration_data: ZeroKnowledgeRegistrationRequest,
    request: Request,
    db: Session = Depends(get_db),
    redis: RedisManager = Depends(get_redis)
):
    """
    Register a new user with zero-knowledge encryption setup.
    
    This endpoint creates a new user account with separate login and encryption credentials.
    The server stores the encryption salt and verification payload but never sees the 
    encryption password or derived keys.
    
    Args:
        registration_data: Registration request with login and encryption parameters
        request: FastAPI request object
        db: Database session
        redis: Redis manager
        
    Returns:
        Registration success response
        
    Raises:
        HTTPException: If registration fails
    """
    try:
        # Check if username already exists
        existing_user = await get_user_by_username(db, registration_data.username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already exists"
            )
        
        # Check if email already exists
        existing_email = db.query(User).filter(User.email == registration_data.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists"
            )
        
        # Create new user with zero-knowledge encryption parameters
        new_user = User(
            username=registration_data.username,
            email=registration_data.email,
            password=registration_data.password,  # This gets hashed by User.__init__
            full_name=registration_data.full_name,
            role="user",
            is_active=True,
            is_verified=True,  # Auto-verify for now
            must_change_password=False,
            # Zero-Knowledge encryption fields
            encryption_salt=registration_data.encryption_salt,
            key_verification_payload=registration_data.key_verification_payload,
            encryption_method=registration_data.encryption_method,
            key_derivation_iterations=registration_data.key_derivation_iterations
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        return ZeroKnowledgeRegistrationResponse(
            message="User registered successfully with zero-knowledge encryption",
            user_id=new_user.id,
            username=new_user.username,
            encryption_configured=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.get("/me", response_model=dict)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user information.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User information
    """
    encryption_salt = getattr(current_user, 'encryption_salt', None)
    key_verification_payload = getattr(current_user, 'key_verification_payload', None)
    
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "mfa_enabled": current_user.mfa_enabled,
        "must_change_password": current_user.must_change_password,
        "last_login": current_user.last_login,
        "created_at": current_user.created_at,
        # Zero-Knowledge encryption status
        "encryption_configured": bool(encryption_salt and key_verification_payload),
        "encryption_method": getattr(current_user, 'encryption_method', None),
        "key_derivation_iterations": getattr(current_user, 'key_derivation_iterations', None),
        # Zero-Knowledge encryption parameters (needed for key derivation)
        "encryption_salt": encryption_salt,
        "key_verification_payload": key_verification_payload
    }


@router.post("/register/simple", response_model=ZeroKnowledgeRegistrationResponse)
async def simple_register(
    request: SimpleRegistrationRequest,
    db: Session = Depends(get_db)
):
    """
    Simplified registration endpoint that generates encryption parameters on server side.
    This is primarily for testing and backwards compatibility.
    
    Args:
        username: Username for login
        email: Email address
        password: Login password
        encryption_password: Separate password for encryption
        full_name: Optional full name
        db: Database session
        
    Returns:
        Registration response
    """
    import base64
    import secrets
    import json
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    from cryptography.hazmat.backends import default_backend
    
    def derive_key_pbkdf2(password: str, salt: bytes, iterations: int) -> bytes:
        """Derive key using PBKDF2-SHA256."""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=iterations,
            backend=default_backend()
        )
        return kdf.derive(password.encode('utf-8'))
    
    def create_validation_payload(username: str, master_key: bytes) -> dict:
        """Create validation payload for key verification matching frontend format."""
        # Create a simple validation string to match frontend expectation
        validation_string = f"validation:{username}"

        # Encrypt the validation string with the master key using AES-GCM
        aesgcm = AESGCM(master_key)
        iv = secrets.token_bytes(12)  # 12 bytes for GCM
        ciphertext_with_tag = aesgcm.encrypt(iv, validation_string.encode('utf-8'), None)

        # AES-GCM returns ciphertext + auth tag combined
        # Split them: last 16 bytes are auth tag, rest is ciphertext
        ciphertext = ciphertext_with_tag[:-16]
        auth_tag = ciphertext_with_tag[-16:]

        return {
            'ciphertext': base64.b64encode(ciphertext).decode('utf-8'),
            'iv': base64.b64encode(iv).decode('utf-8'),
            'authTag': base64.b64encode(auth_tag).decode('utf-8')
        }
    
    try:
        # Check if user already exists
        existing_user = await get_user_by_username(db, request.username)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
        
        existing_email = db.query(User).filter(User.email == request.email).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Generate encryption parameters server-side
        salt = secrets.token_bytes(32)
        salt_base64 = base64.b64encode(salt).decode('utf-8')
        
        # Derive key and create validation payload
        master_key = derive_key_pbkdf2(request.encryption_password, salt, 500000)
        validation_payload = create_validation_payload(request.username, master_key)
        
        # Create new user with generated encryption parameters
        new_user = User(
            username=request.username,
            email=request.email,
            password=request.password,  # This gets hashed by User.__init__
            full_name=request.full_name,
            role="user",
            is_active=True,
            is_verified=True,
            must_change_password=False,
            # Server-generated zero-knowledge encryption fields
            encryption_salt=salt_base64,
            key_verification_payload=json.dumps(validation_payload),
            encryption_method="PBKDF2-SHA256",
            key_derivation_iterations=500000
        )
        
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        return ZeroKnowledgeRegistrationResponse(
            message="User registered successfully with server-generated encryption parameters",
            user_id=new_user.id,
            username=new_user.username,
            encryption_configured=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Simple registration error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )