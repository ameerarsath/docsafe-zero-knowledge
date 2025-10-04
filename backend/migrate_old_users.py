#!/usr/bin/env python3
"""
Migration script to import old user data with legacy key verification payload format.
"""

import os
import sys
import json
import base64
from datetime import datetime

# Add the app directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db, engine
from app.models.user import User
from sqlalchemy.orm import Session
from sqlalchemy import text

def migrate_old_users():
    """Migrate old user data with legacy encryption payload format."""

    print("=== MIGRATING OLD USER DATA ===\n")

    # Get database session
    db = next(get_db())

    try:
        # Old user data you provided
        old_users = [
            {
                "username": "ameer_arsath",
                "email": "ameerarsath2@gmail.com",
                "password_hash": "$2b$12$jDL6i2jLdDuUkOnb0KcdfORcDfrHQzo9hLV6H9PgvuNycB.U3FKim",
                "encryption_salt": "V6Vi46InLBidRtjm4Mx/C8+NUA4IR8k/rRFCrGlkaas=",
                "key_verification_payload": '{"ciphertext":"vKJargXCKf7vzbMc3vnAjJclxk56waA=","iv":"D8YHk2qbVhjmncK4","authTag":"n4DYnUOvfRv6Ppfw3wGr+w=="}',
                "encryption_method": "PBKDF2-SHA256",
                "key_derivation_iterations": 500000,
                "is_active": True,
                "is_verified": True,
                "must_change_password": False,
                "role": "user",
                "full_name": "ameer_arsath"
            },
            {
                "username": "rahumana",
                "email": "rahumana@test.com",
                "password_hash": "$2b$12$bWINlzucx/7Pq7EO8pPiJufDZQsHSxDlbtvTVP7H.oKnaRC4mZNE6",
                "encryption_salt": "A4eSOJpzoRq/yynj+IaQTXHVmqKUklJqAb/9Yc/Qa90=",
                "key_verification_payload": '{"ciphertext": "jcNMcK/dQQAz/fXOrNa1YuG5ylW/Y2x4rd4ljG6IzYb5Gu7KpXeCoxBxOXGhaYkrXGb8/w==", "iv": "7pCQjY104ZqvSYvG", "authTag": "PRvHaUSFbCYLBtvpdTKzSA=="}',
                "encryption_method": "PBKDF2-SHA256",
                "key_derivation_iterations": 500000,
                "is_active": True,
                "is_verified": True,
                "must_change_password": False,
                "role": "super_admin",
                "full_name": "Test User"
            },
            {
                "username": "suga",
                "email": "sugail@gmail.com",
                "password_hash": "$2b$12$gxs4PiVj5rHUzk.1z/5fPuVhPj44zkIM.e5T9iYvSz/JDwy3yjXm.",
                "encryption_salt": "I+Ybkxm+tECRroI67HN5N8tSfjzVYCdrw8fs/o9vvsc=",
                "key_verification_payload": '{"iv": "rZ',  # Incomplete in your data, will handle specially
                "encryption_method": "PBKDF2-SHA256",
                "key_derivation_iterations": 500000,
                "is_active": True,
                "is_verified": True,
                "must_change_password": False,
                "role": "user"
            }
        ]

        for i, old_user in enumerate(old_users):
            print(f"\nProcessing user {i+1}: {old_user['username']}")

            # Check if user already exists
            existing_user = db.query(User).filter(
                (User.username == old_user['username']) |
                (User.email == old_user['email'])
            ).first()

            if existing_user:
                print(f"  User '{old_user['username']}' already exists (ID: {existing_user.id}). Skipping...")
                continue

            # Create new user
            user = User(
                username=old_user['username'],
                email=old_user['email'],
                password_hash=old_user['password_hash'],
                encryption_salt=old_user['encryption_salt'],
                key_verification_payload=old_user['key_verification_payload'],
                encryption_method=old_user['encryption_method'],
                key_derivation_iterations=old_user['key_derivation_iterations'],
                is_active=old_user['is_active'],
                is_verified=old_user['is_verified'],
                must_change_password=old_user['must_change_password'],
                role=old_user['role'],
                full_name=old_user.get('full_name'),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )

            # Save user to database
            db.add(user)
            db.commit()
            db.refresh(user)

            print(f"  [SUCCESS] Created user '{old_user['username']}' with ID: {user.id}")

            # Verify the key verification payload
            if user.key_verification_payload:
                try:
                    payload = json.loads(user.key_verification_payload)
                    print(f"  [OK] Key verification payload is valid JSON")
                    print(f"    Fields in payload: {list(payload.keys())}")
                except json.JSONDecodeError as e:
                    print(f"  ⚠ Key verification payload is not valid JSON: {e}")

        # Show final user count
        total_users = db.query(User).count()
        print(f"\n=== MIGRATION COMPLETE ===")
        print(f"Total users in database: {total_users}")

        # List all users
        print("\nCurrent users:")
        users = db.query(User).all()
        for user in users:
            print(f"  - ID: {user.id}, Username: {user.username}, Role: {user.role}, Verified: {user.is_verified}")

    except Exception as e:
        print(f"\n[ERROR]: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

def test_login():
    """Test login with migrated users."""
    print("\n=== TESTING LOGIN ===")

    db = next(get_db())

    try:
        # Test with rahumana user
        user = db.query(User).filter(User.username == "rahumana").first()
        if user:
            print(f"\nFound user: {user.username}")
            print(f"  Email: {user.email}")
            print(f"  Role: {user.role}")
            print(f"  Is active: {user.is_active}")
            print(f"  Is verified: {user.is_verified}")
            print(f"  Has encryption salt: {bool(user.encryption_salt)}")
            print(f"  Has key verification payload: {bool(user.key_verification_payload)}")

            if user.key_verification_payload:
                try:
                    payload = json.loads(user.key_verification_payload)
                    print(f"  Payload fields: {list(payload.keys())}")
                except:
                    print(f"  Invalid JSON in key_verification_payload")
        else:
            print("User 'rahumana' not found in database")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_old_users()
    test_login()