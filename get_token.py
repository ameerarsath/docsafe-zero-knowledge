#!/usr/bin/env python3
import jwt
from datetime import datetime, timedelta

SECRET_KEY = "your-super-secret-key-must-be-at-least-32-characters-long"
ALGORITHM = "HS256"

def create_jwt_token(user_id: int = 2, username: str = "rahumana", role: str = "user") -> str:
    """Create a valid JWT token."""
    payload = {
        "user_id": user_id,
        "username": username,
        "email": f"{username}@example.com",
        "role": role,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

if __name__ == "__main__":
    token = create_jwt_token()
    print(f"JWT Token: {token}")