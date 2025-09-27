#!/usr/bin/env python3
"""Debug authentication directly"""
import sys
import os
sys.path.append('backend')
from backend.app.core.database import SessionLocal
from backend.app.models import User
from backend.app.core.security import decode_token
from backend.app.core.config import settings

def test_auth_flow(token: str):
    """Test the complete authentication flow"""
    print(f"Testing token: {token[:50]}...")

    try:
        # Step 1: Decode token
        print("\n1. Decoding token...")
        payload = decode_token(token)
        print(f"   ✓ Token decoded successfully")
        print(f"   User ID: {payload.get('user_id')}")
        print(f"   Username: {payload.get('username')}")

        # Step 2: Get user from database
        print("\n2. Querying database...")
        db = SessionLocal()
        user_id = payload.get("user_id")

        if not user_id:
            print("   ✗ No user_id in token payload")
            return False

        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            print(f"   ✗ User ID {user_id} not found in database")
            return False

        print(f"   ✓ User found: {user.username} ({user.email})")
        print(f"   Active: {user.is_active}")
        print(f"   Verified: {user.is_verified}")

        if not user.is_active:
            print("   ✗ User account is disabled")
            return False

        print("   ✓ Authentication should succeed")
        return True

    except Exception as e:
        print(f"   ✗ Error: {e}")
        return False
    finally:
        if 'db' in locals():
            db.close()

if __name__ == "__main__":
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwiZW1haWwiOiJ0ZXN0dXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzU4Nzc1MzMxLCJleHAiOjE3NTg4NjE3MzF9.Ahf5PXSlxxKd_alfT61cSvzcUiFhriXZmddgaW77QAc"
    result = test_auth_flow(token)
    print(f"\nOverall result: {'✓ PASS' if result else '✗ FAIL'}")