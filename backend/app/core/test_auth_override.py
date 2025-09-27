"""
Test authentication override for Share functionality testing.

This temporarily overrides the authentication system to work without a database
so we can test the Share functionality.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import jwt
from datetime import datetime

# Mock User class for testing
class MockUser:
    def __init__(self, id: int, username: str, email: str, role: str = "user"):
        self.id = id
        self.username = username
        self.email = email
        self.role = role
        self.is_active = True

# Settings to match the main app
SECRET_KEY = "your-super-secret-key-change-in-production"
ALGORITHM = "HS256"

def decode_test_token(token: str) -> dict:
    """Decode JWT token for testing."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

security = HTTPBearer()

async def get_test_current_user(token: HTTPAuthorizationCredentials = Depends(security)) -> MockUser:
    """
    Test implementation of get_current_user that works without database.
    """
    try:
        # Decode and verify token
        payload = decode_test_token(token.credentials)
        user_id = payload.get("user_id")
        username = payload.get("username")
        email = payload.get("email")
        role = payload.get("role", "user")

        if not user_id or not username:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Return mock user object
        return MockUser(id=user_id, username=username, email=email, role=role)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token validation failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_test_current_user_optional(
    token: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[MockUser]:
    """
    Test implementation of get_current_user_optional.
    """
    if not token:
        return None

    try:
        return await get_test_current_user(token)
    except HTTPException:
        return None

# Function to patch the shares module for testing
def patch_shares_auth_for_testing():
    """Patch the shares module to use test authentication."""
    import sys
    import os

    # Add backend to path
    backend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..')
    sys.path.insert(0, backend_path)

    try:
        from app.api.v1 import shares

        # Replace the authentication functions
        shares.get_current_user = get_test_current_user
        shares.get_current_user_optional = get_test_current_user_optional

        print("Successfully patched shares authentication for testing")
        return True
    except Exception as e:
        print(f"Failed to patch shares authentication: {e}")
        return False

if __name__ == "__main__":
    # Test the token generation and validation
    from test_security import create_test_jwt_token

    token = create_test_jwt_token()
    print(f"Generated token: {token[:50]}...")

    # Test decode
    try:
        payload = decode_test_token(token)
        print(f"Token decoded successfully: user_id={payload['user_id']}")

        # Test creating mock user
        user = MockUser(
            id=payload['user_id'],
            username=payload['username'],
            email=payload['email'],
            role=payload['role']
        )

        print(f"Mock user created: {user.username} (ID: {user.id})")

    except Exception as e:
        print(f"Token test failed: {e}")