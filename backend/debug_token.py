#!/usr/bin/env python3
"""
Debug script to check token creation and validation
"""

import sys
from datetime import timedelta

# Add the backend directory to the Python path
sys.path.append('.')

from app.core.security import create_access_token, decode_token
from app.core.database import SessionLocal
from app.models.user import User


def debug_token():
    """Debug token creation and validation"""
    print("Debugging Token Creation and Validation...")

    db = SessionLocal()
    try:
        # Find the rahumana user
        user = db.query(User).filter(User.username == "rahumana").first()
        if not user:
            print("User 'rahumana' not found")
            return False

        print(f"Found user: {user.username} (ID: {user.id})")

        # Create token with correct payload
        token_data = {
            'sub': str(user.id),
            'user_id': user.id,  # This is what get_current_user expects
            'username': user.username,
            'role': user.role
        }
        
        print(f"Token data: {token_data}")
        
        access_token = create_access_token(data=token_data, expires_delta=timedelta(minutes=15))
        print(f"Created token: {access_token[:50]}...")

        # Decode the token to see what's in it
        try:
            payload = decode_token(access_token)
            print(f"Decoded payload: {payload}")
            
            # Check if user_id is present
            if 'user_id' in payload:
                print("✅ user_id found in payload")
            else:
                print("❌ user_id NOT found in payload")
                
            if 'sub' in payload:
                print("✅ sub found in payload")
            else:
                print("❌ sub NOT found in payload")
                
        except Exception as e:
            print(f"❌ Token decode failed: {e}")
            return False

        return True

    finally:
        db.close()


if __name__ == "__main__":
    print("Token Debug Script")
    print("=" * 50)
    
    success = debug_token()
    
    print("\n" + "=" * 50)
    if success:
        print("Debug completed successfully!")
    else:
        print("Debug failed")
        sys.exit(1)