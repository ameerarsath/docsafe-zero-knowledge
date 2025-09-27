#!/usr/bin/env python3
import sys
import os
import json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app.core.database import SessionLocal
from backend.app.models.user import User
import secrets
import base64

def fix_test_user():
    """Fix the test user's key_verification_payload to be valid JSON"""

    # Create a proper validation payload JSON
    validation_payload = {
        "ciphertext": base64.b64encode(secrets.token_bytes(32)).decode('utf-8'),
        "iv": base64.b64encode(secrets.token_bytes(12)).decode('utf-8'),
        "authTag": base64.b64encode(secrets.token_bytes(16)).decode('utf-8')
    }

    validation_payload_json = json.dumps(validation_payload)

    # Get database session
    db = SessionLocal()
    try:
        # Find the test user
        user = db.query(User).filter(User.username == "rahumana").first()

        if not user:
            print("Test user not found!")
            return

        # Update the key_verification_payload
        user.key_verification_payload = validation_payload_json
        db.commit()

        print("Test user updated successfully!")
        print(f"Username: {user.username}")
        print(f"New validation payload: {validation_payload_json}")

    except Exception as e:
        print(f"Error updating user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_test_user()