#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app.core.database import SessionLocal
from backend.app.models.user import User
from backend.app.core.security import hash_password
from datetime import datetime, timezone
import secrets
import base64

def create_test_user():
    """Create a test user in the database"""

    # Generate encryption salt
    encryption_salt = base64.b64encode(secrets.token_bytes(32)).decode('utf-8')

    # Create test user
    user_data = {
        "username": "rahumana",
        "email": "rahumana@example.com",
        "password_hash": hash_password("TestPass123@"),
        "encryption_salt": encryption_salt,
        "key_verification_payload": "test_payload",
        "encryption_method": "AES-256-GCM",
        "key_derivation_iterations": 100000,
        "is_active": True,
        "is_verified": True,
        "must_change_password": False,
        "role": "user",
        "mfa_enabled": False,
        "failed_login_attempts": 0,
        "last_password_change": datetime.now(timezone.utc),
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "full_name": "Test User"
    }

    # Get database session
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(
            (User.username == user_data["username"]) |
            (User.email == user_data["email"])
        ).first()

        if existing_user:
            print(f"User {user_data['username']} already exists!")
            return

        # Create new user
        user = User(**user_data)
        db.add(user)
        db.commit()
        db.refresh(user)

        print(f"✅ Test user created successfully!")
        print(f"Username: {user.username}")
        print(f"Email: {user.email}")
        print(f"Password: TestPass123@")
        print(f"User ID: {user.id}")

    except Exception as e:
        print(f"❌ Error creating user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()