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
    ErrorResponse
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
            mfa_required=False
        )
        
    except Exception as e:
        # Log error (in production, use proper logging)
        print(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
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
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "mfa_enabled": current_user.mfa_enabled,
        "must_change_password": current_user.must_change_password,
        "last_login": current_user.last_login,
        "created_at": current_user.created_at
    }