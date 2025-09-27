#!/usr/bin/env python3
"""
Complete Share Document functionality test to achieve 100% working status.

This script:
1. Sets up a local SQLite database
2. Creates test users and documents
3. Generates valid JWT tokens
4. Tests all Share functionality end-to-end
"""

import os
import sys
import sqlite3
import requests
import jwt
from datetime import datetime, timedelta
from typing import Optional
import json

# Configuration
SECRET_KEY = "your-super-secret-key-change-in-production"
ALGORITHM = "HS256"
BASE_URL = "http://localhost:8002"
API_BASE = f"{BASE_URL}/api/v1"

def create_jwt_token(user_id: int = 1, username: str = "testuser", role: str = "user") -> str:
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

def setup_sqlite_database():
    """Set up a local SQLite database with test data."""
    print("Setting up SQLite database...")

    # Create database and tables
    conn = sqlite3.connect("backend/securevault.db")
    cursor = conn.cursor()

    # Create users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            is_verified BOOLEAN DEFAULT 1,
            must_change_password BOOLEAN DEFAULT 0,
            role VARCHAR(50) DEFAULT 'user',
            mfa_enabled BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Create documents table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            document_type VARCHAR(20) DEFAULT 'document',
            mime_type VARCHAR(100),
            file_size BIGINT DEFAULT 0,
            owner_id INTEGER NOT NULL,
            created_by INTEGER NOT NULL,
            storage_path VARCHAR(500),
            is_encrypted BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_deleted BOOLEAN DEFAULT 0,
            FOREIGN KEY (owner_id) REFERENCES users (id),
            FOREIGN KEY (created_by) REFERENCES users (id)
        )
    """)

    # Create document_shares table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS document_shares (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            uuid VARCHAR(36) UNIQUE NOT NULL,
            document_id INTEGER NOT NULL,
            share_token VARCHAR(100) UNIQUE NOT NULL,
            share_name VARCHAR(100),
            share_type VARCHAR(20) DEFAULT 'internal',
            allow_download BOOLEAN DEFAULT 1,
            allow_preview BOOLEAN DEFAULT 1,
            allow_comment BOOLEAN DEFAULT 0,
            require_password BOOLEAN DEFAULT 0,
            password_hash VARCHAR(100),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME,
            accessed_at DATETIME,
            access_count INTEGER DEFAULT 0,
            max_access_count INTEGER,
            created_by INTEGER NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            revoked_at DATETIME,
            revoked_by INTEGER,
            FOREIGN KEY (document_id) REFERENCES documents (id),
            FOREIGN KEY (created_by) REFERENCES users (id)
        )
    """)

    # Insert test user
    cursor.execute("""
        INSERT OR REPLACE INTO users (id, username, email, password_hash, is_active, is_verified, role)
        VALUES (1, 'testuser', 'test@example.com', 'hashed_password', 1, 1, 'user')
    """)

    # Insert test document
    cursor.execute("""
        INSERT OR REPLACE INTO documents (id, name, description, owner_id, created_by, storage_path, mime_type, file_size)
        VALUES (1, 'Test Document.pdf', 'Test document for sharing', 1, 1, '/fake/path/document.pdf', 'application/pdf', 1024)
    """)

    conn.commit()
    conn.close()

    print("SUCCESS: SQLite database setup complete!")

def test_share_creation(token: str) -> Optional[str]:
    """Test share creation with the token."""
    print("\nTesting Share Creation...")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    share_data = {
        "share_name": "Test External Share",
        "share_type": "external",
        "allow_preview": True,
        "allow_download": False,
        "require_password": False
    }

    try:
        response = requests.post(
            f"{API_BASE}/shares/?document_id=1",
            json=share_data,
            headers=headers,
            timeout=10
        )

        print(f"Status: {response.status_code}")

        if response.status_code == 201:
            result = response.json()
            print("SUCCESS: Share created successfully!")
            print(f"   Share Token: {result['share']['shareToken']}")
            print(f"   Share URL: {result['shareUrl']}")
            print(f"   Permissions: {result['share']['permissions']}")
            return result['share']['shareToken']
        elif response.status_code == 401:
            print("FAILED: Authentication failed")
            print(f"   Response: {response.text}")
        elif response.status_code == 422:
            print("FAILED: Validation error")
            print(f"   Response: {response.text}")
        else:
            print(f"FAILED: Unexpected status: {response.status_code}")
            print(f"   Response: {response.text}")

    except requests.exceptions.RequestException as e:
        print(f"FAILED: Request failed: {e}")

    return None

def test_share_access(share_token: str) -> bool:
    """Test accessing a shared document."""
    print(f"\n🔓 Testing Share Access...")

    try:
        # Test getting share details (no auth required for external shares)
        response = requests.get(f"{API_BASE}/shares/{share_token}", timeout=10)

        print(f"📊 Share details status: {response.status_code}")

        if response.status_code == 200:
            share_info = response.json()
            print("✅ Share details retrieved!")
            print(f"   Share Name: {share_info['shareName']}")
            print(f"   Share Type: {share_info['shareType']}")
            print(f"   Permissions: {share_info['permissions']}")

            # Test document access
            print("\n🔍 Testing document access...")
            access_response = requests.post(
                f"{API_BASE}/shares/{share_token}/access",
                json={"password": None},
                headers={"Content-Type": "application/json"},
                timeout=10
            )

            print(f"📊 Document access status: {access_response.status_code}")

            if access_response.status_code == 200:
                doc_info = access_response.json()
                print("✅ Document access granted!")
                print(f"   Document: {doc_info['document']['name']}")
                print(f"   Permissions: {doc_info['permissions']}")
                return True
            else:
                print(f"❌ Document access failed: {access_response.text}")

        else:
            print(f"❌ Share details failed: {response.text}")

    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")

    return False

def test_permission_enforcement(share_token: str) -> bool:
    """Test permission enforcement (view-only should block download)."""
    print(f"\n🔒 Testing Permission Enforcement...")

    try:
        # Try to download (should fail for view-only share)
        response = requests.post(
            f"{API_BASE}/shares/{share_token}/download",
            json={"password": None},
            headers={"Content-Type": "application/json"},
            timeout=10
        )

        print(f"📊 Download attempt status: {response.status_code}")

        if response.status_code == 403:
            print("✅ Permission enforcement working! Download correctly blocked.")
            return True
        elif response.status_code == 200:
            print("❌ Permission enforcement failed! Download was allowed.")
        else:
            print(f"ℹ️  Unexpected response: {response.status_code} - {response.text}")

    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")

    return False

def test_internal_share_auth(token: str) -> bool:
    """Test that internal shares require authentication."""
    print(f"\n👥 Testing Internal Share Authentication...")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    share_data = {
        "share_name": "Test Internal Share",
        "share_type": "internal",
        "allow_preview": True,
        "allow_download": True,
        "require_password": False
    }

    try:
        # Create internal share
        response = requests.post(
            f"{API_BASE}/shares/?document_id=1",
            json=share_data,
            headers=headers,
            timeout=10
        )

        if response.status_code == 201:
            result = response.json()
            internal_token = result['share']['shareToken']
            print(f"✅ Internal share created: {internal_token}")

            # Try to access without auth (should fail)
            access_response = requests.post(
                f"{API_BASE}/shares/{internal_token}/access",
                json={"password": None},
                headers={"Content-Type": "application/json"},
                timeout=10
            )

            print(f"📊 Unauthenticated access status: {access_response.status_code}")

            if access_response.status_code == 401:
                print("✅ Internal share authentication working!")
                return True
            else:
                print(f"❌ Internal share auth failed: {access_response.text}")

    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")

    return False

def run_comprehensive_test():
    """Run complete test suite for Share functionality."""
    print("Share Document Functionality - 100% Test Suite")
    print("=" * 60)

    # Step 1: Setup
    setup_sqlite_database()

    # Step 2: Generate token
    print("\nGenerating JWT Token...")
    token = create_jwt_token()
    print(f"SUCCESS: Token generated: {token[:50]}...")

    # Step 3: Test share creation
    share_token = test_share_creation(token)

    if not share_token:
        print("\nCRITICAL: Share creation failed. Cannot continue tests.")
        return False

    # Step 4: Test share access
    access_success = test_share_access(share_token)

    # Step 5: Test permission enforcement
    permission_success = test_permission_enforcement(share_token)

    # Step 6: Test internal share authentication
    internal_success = test_internal_share_auth(token)

    # Results
    print("\n" + "=" * 60)
    print("📋 TEST RESULTS SUMMARY")
    print("=" * 60)

    results = [
        ("Share Creation", share_token is not None),
        ("Share Access", access_success),
        ("Permission Enforcement", permission_success),
        ("Internal Share Auth", internal_success)
    ]

    total_tests = len(results)
    passed_tests = sum(1 for _, result in results if result)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:25} {status}")

    success_percentage = (passed_tests / total_tests) * 100

    print("-" * 60)
    print(f"OVERALL SUCCESS: {passed_tests}/{total_tests} tests passed ({success_percentage:.0f}%)")

    if success_percentage == 100:
        print("🎉 100% SUCCESS! Share Document functionality is fully working!")
    elif success_percentage >= 75:
        print("⚠️  Mostly working - minor issues to resolve")
    else:
        print("❌ Major issues detected - needs significant fixes")

    print("\n" + "=" * 60)
    print("AUTHENTICATION DETAILS FOR MANUAL TESTING:")
    print("-" * 60)
    print(f"JWT Token: {token}")
    print(f"Test User: testuser@example.com")
    print(f"Document ID: 1")

    if share_token:
        print(f"External Share Token: {share_token}")
        print(f"Share URL: http://localhost:3000/share/{share_token}")

    return success_percentage == 100

if __name__ == "__main__":
    success = run_comprehensive_test()
    sys.exit(0 if success else 1)