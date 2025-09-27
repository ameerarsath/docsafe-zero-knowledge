#!/usr/bin/env python3
"""
Simple Share Document functionality test.
"""

import requests
import jwt
import sqlite3
from datetime import datetime, timedelta

# Configuration
SECRET_KEY = "your-super-secret-key-change-in-production"
ALGORITHM = "HS256"
BASE_URL = "http://localhost:8002"

def create_jwt_token(user_id: int = 1, username: str = "testuser") -> str:
    """Create a valid JWT token."""
    payload = {
        "user_id": user_id,
        "username": username,
        "email": f"{username}@example.com",
        "role": "user",
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def setup_database():
    """Set up SQLite database."""
    print("Setting up database...")

    conn = sqlite3.connect("backend/securevault.db")
    cursor = conn.cursor()

    # Create users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username VARCHAR(50) UNIQUE,
            email VARCHAR(255) UNIQUE,
            password_hash VARCHAR(255),
            is_active BOOLEAN DEFAULT 1,
            role VARCHAR(50) DEFAULT 'user'
        )
    """)

    # Create documents table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY,
            name VARCHAR(255),
            owner_id INTEGER,
            created_by INTEGER,
            file_size INTEGER DEFAULT 1024,
            mime_type VARCHAR(100) DEFAULT 'application/pdf',
            is_deleted BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Insert test data
    cursor.execute("INSERT OR REPLACE INTO users (id, username, email, password_hash, role) VALUES (1, 'testuser', 'test@example.com', 'hashed', 'user')")
    cursor.execute("INSERT OR REPLACE INTO documents (id, name, owner_id, created_by) VALUES (1, 'Test.pdf', 1, 1)")

    conn.commit()
    conn.close()
    print("Database setup complete")

def test_share_creation():
    """Test creating a share."""
    print("\nTesting share creation...")

    token = create_jwt_token()
    print(f"Generated token: {token[:30]}...")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    data = {
        "share_name": "Test Share",
        "share_type": "external",
        "allow_preview": True,
        "allow_download": False
    }

    try:
        response = requests.post(f"{BASE_URL}/api/v1/shares/?document_id=1", json=data, headers=headers, timeout=10)

        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:200]}...")

        if response.status_code == 201:
            result = response.json()
            print("SUCCESS: Share created!")
            share_token = result['share']['shareToken']
            print(f"Share token: {share_token}")
            return share_token
        else:
            print(f"FAILED: {response.status_code}")
            return None

    except Exception as e:
        print(f"Error: {e}")
        return None

def test_share_access(share_token):
    """Test accessing a share."""
    if not share_token:
        return False

    print(f"\nTesting share access...")

    try:
        # Get share details
        response = requests.get(f"{BASE_URL}/api/v1/shares/{share_token}", timeout=10)
        print(f"Share details status: {response.status_code}")

        if response.status_code == 200:
            print("SUCCESS: Share details retrieved")

            # Test document access
            access_response = requests.post(f"{BASE_URL}/api/v1/shares/{share_token}/access", json={"password": None}, timeout=10)
            print(f"Document access status: {access_response.status_code}")

            if access_response.status_code == 200:
                print("SUCCESS: Document access works")
                return True

        print(f"Response: {response.text[:200]}...")
        return False

    except Exception as e:
        print(f"Error: {e}")
        return False

def run_tests():
    """Run all tests."""
    print("Share Document Test Suite")
    print("=" * 40)

    setup_database()
    share_token = test_share_creation()
    access_works = test_share_access(share_token)

    print("\n" + "=" * 40)
    print("RESULTS:")
    print(f"Share Creation: {'PASS' if share_token else 'FAIL'}")
    print(f"Share Access: {'PASS' if access_works else 'FAIL'}")

    if share_token and access_works:
        print("OVERALL: SUCCESS - Share functionality working!")
        return True
    else:
        print("OVERALL: FAILED - Issues detected")
        return False

if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1)