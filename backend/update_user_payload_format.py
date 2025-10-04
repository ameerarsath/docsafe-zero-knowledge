#!/usr/bin/env python3
"""
Update user key_verification_payload from old format to new format
"""

import os
import sys
import json

# Add the app directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db
from app.models.user import User

def update_user_payloads():
    """Update user key_verification_payload from old format to new format"""

    print("=== UPDATING USER PAYLOAD FORMAT ===\n")

    db = next(get_db())

    try:
        users = db.query(User).all()

        for user in users:
            if not user.key_verification_payload:
                continue

            print(f"Processing user: {user.username}")

            try:
                # Parse existing payload
                payload = json.loads(user.key_verification_payload)

                # Check if it's the old format
                if 'ciphertext' in payload or 'iv' in payload or 'authTag' in payload:
                    print(f"  Found old format payload")

                    # Create new format payload
                    new_payload = {}

                    # Map old fields to new fields
                    if 'ciphertext' in payload:
                        # For user encryption, ciphertext maps to encrypted_dek
                        new_payload['encrypted_dek'] = payload['ciphertext']
                        print(f"    Mapped ciphertext -> encrypted_dek")

                    if 'iv' in payload:
                        new_payload['encryption_iv'] = payload['iv']
                        print(f"    Mapped iv -> encryption_iv")

                    if 'authTag' in payload:
                        new_payload['encryption_auth_tag'] = payload['authTag']
                        print(f"    Mapped authTag -> encryption_auth_tag")

                    # Update the user record
                    user.key_verification_payload = json.dumps(new_payload)
                    db.commit()

                    print(f"  [SUCCESS] Updated payload for {user.username}")
                else:
                    print(f"  Payload already in correct format")

            except json.JSONDecodeError as e:
                print(f"  [ERROR] Invalid JSON in key_verification_payload: {e}")

            print()

        # Verify updates
        print("\n=== VERIFICATION ===")
        users = db.query(User).all()
        for user in users:
            if user.key_verification_payload:
                try:
                    payload = json.loads(user.key_verification_payload)
                    print(f"User: {user.username}")
                    print(f"  Fields: {list(payload.keys())}")
                except:
                    print(f"User: {user.username} - Invalid JSON")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_user_payloads()