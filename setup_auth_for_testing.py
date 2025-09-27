#!/usr/bin/env python3
"""
Create test user and generate authentication token for Share functionality testing.
"""

import sys
import os
from datetime import datetime, timedelta
import json

# Add the backend directory to Python path
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_path)

def create_test_user_and_token():
    """Create test user and generate authentication token."""
    try:
        # Import backend modules
        from app.core.database import get_db, engine, Base
        from app.models.user import User
        from app.core.security import hash_password, create_access_token
        from app.core.config import settings
        from sqlalchemy.orm import Session

        print("Setting up test user and authentication...")

        # Create tables if they don't exist
        print("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("Database tables created/verified")

        # Create database session
        db = Session(bind=engine)

        try:
            # Check if test user exists
            test_username = "testuser"
            test_email = "test@example.com"
            test_password = "testpassword123"

            existing_user = db.query(User).filter(
                (User.username == test_username) | (User.email == test_email)
            ).first()

            if existing_user:
                print(f"Test user already exists: {existing_user.username}")
                user = existing_user
            else:
                # Create test user
                print("Creating test user...")

                user = User(
                    username=test_username,
                    email=test_email,
                    password_hash=hash_password(test_password),
                    is_active=True,
                    is_verified=True,
                    must_change_password=False,
                    role="user",
                    mfa_enabled=False
                )

                db.add(user)
                db.commit()
                db.refresh(user)

                print(f"Created test user: {user.username} (ID: {user.id})")

            # Generate JWT token
            print("Generating JWT token...")

            token_data = {
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "exp": datetime.utcnow() + timedelta(hours=24)  # 24-hour token
            }

            access_token = create_access_token(token_data)

            print("Generated JWT token successfully!")
            print("\n" + "="*60)
            print("TEST AUTHENTICATION DETAILS")
            print("="*60)
            print(f"Username: {test_username}")
            print(f"Password: {test_password}")
            print(f"Email: {test_email}")
            print(f"User ID: {user.id}")
            print(f"Role: {user.role}")
            print(f"Token expires: 24 hours from now")
            print(f"\nJWT TOKEN (copy this for API testing):")
            print("-" * 40)
            print(access_token)
            print("-" * 40)

            # Test the token
            print("\nTesting token validation...")

            from app.core.security import decode_token
            try:
                payload = decode_token(access_token)
                print(f"Token validation successful!")
                print(f"User ID from token: {payload.get('user_id')}")
                print(f"Username from token: {payload.get('username')}")

                return access_token, user.id
            except Exception as e:
                print(f"Token validation failed: {e}")
                return None, None

        finally:
            db.close()

    except ImportError as e:
        print(f"Import error: {e}")
        print("Make sure you're running this from the project root directory")
        return None, None
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return None, None

def test_share_creation(token, user_id):
    """Test share creation with the generated token."""
    print("\nTesting Share Creation with Generated Token...")

    import requests

    # Test data
    test_payload = {
        "share_name": "Test Share via Script",
        "share_type": "external",
        "allow_preview": True,
        "allow_download": False,
        "require_password": False
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    try:
        # Test with a fake document ID (this will help verify the auth works)
        response = requests.post(
            "http://localhost:8002/api/v1/shares/?document_id=1",
            json=test_payload,
            headers=headers,
            timeout=10
        )

        print(f"Share Creation Test Results:")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text[:300]}...")

        if response.status_code == 401:
            print("Authentication still failing - token issue")
            return False
        elif response.status_code == 404:
            print("SUCCESS: Authentication works! (404 = document not found, but auth passed)")
            return True
        elif response.status_code == 201:
            print("FULL SUCCESS: Share created successfully!")
            return True
        else:
            print(f"Unexpected response: {response.status_code}")
            return False

    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        print("Make sure the backend server is running on localhost:8002")
        return False

def main():
    """Main function to set up test environment."""
    print("SecureVault Share Testing Setup")
    print("="*40)

    token, user_id = create_test_user_and_token()

    if token and user_id:
        # Test the share creation
        success = test_share_creation(token, user_id)

        print("\n" + "="*60)
        print("SETUP COMPLETE")
        print("="*60)

        if success:
            print("Authentication system is working!")
            print("You can now test Share functionality with the token above.")
        else:
            print("Authentication system needs additional configuration.")

        print("\nExample curl command to test shares:")
        print(f'curl -X POST "http://localhost:8002/api/v1/shares/?document_id=1" \\')
        print(f'  -H "Content-Type: application/json" \\')
        print(f'  -H "Authorization: Bearer {token[:20]}..." \\')
        print(f'  -d \'{"share_name":"Test","share_type":"external","allow_preview":true,"allow_download":false}\'')

if __name__ == "__main__":
    main()