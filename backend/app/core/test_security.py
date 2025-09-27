"""
Test security module for generating valid JWT tokens without database dependency.

This creates valid tokens that can be used for testing the Share functionality.
"""

import jwt
from datetime import datetime, timedelta
from typing import Dict, Any

# Match the settings from config.py
SECRET_KEY = "your-super-secret-key-change-in-production"
ALGORITHM = "HS256"

def create_test_jwt_token(user_id: int = 1, username: str = "testuser", role: str = "user") -> str:
    """Create a valid JWT token for testing without database dependency."""

    payload = {
        "user_id": user_id,
        "username": username,
        "email": f"{username}@example.com",
        "role": role,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=24)
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token

def verify_test_token(token: str) -> Dict[str, Any]:
    """Verify a test JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception("Token has expired")
    except jwt.InvalidTokenError:
        raise Exception("Invalid token")

if __name__ == "__main__":
    # Generate test token
    token = create_test_jwt_token()

    print("Generated Test JWT Token:")
    print("="*50)
    print(token)
    print("="*50)

    # Verify it works
    try:
        payload = verify_test_token(token)
        print("Token verification successful!")
        print(f"User ID: {payload['user_id']}")
        print(f"Username: {payload['username']}")
        print(f"Role: {payload['role']}")
        print(f"Expires: {datetime.fromtimestamp(payload['exp'])}")
    except Exception as e:
        print(f"Token verification failed: {e}")

    print("\nCurl command to test shares:")
    print(f'curl -X POST "http://localhost:8002/api/v1/shares/?document_id=1" \\')
    print(f'  -H "Content-Type: application/json" \\')
    print(f'  -H "Authorization: Bearer {token}" \\')
    print(f'  -d \'{"share_name":"Test Share","share_type":"external","allow_preview":true,"allow_download":false}\'')