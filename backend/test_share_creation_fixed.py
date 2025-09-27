#!/usr/bin/env python3
"""
Test script to reproduce the share creation 500 error - Fixed version
"""

import sys
import requests
import json
from datetime import datetime, timedelta, timezone

# Add the backend directory to the Python path
sys.path.append('.')

from app.core.security import create_access_token
from app.core.database import SessionLocal
from app.models.user import User
from app.models.document import Document


def test_share_creation():
    """Test share creation with the exact same data as frontend"""
    print("Testing Share Creation...")

    db = SessionLocal()
    try:
        # Find the rahumana user (from the error logs)
        user = db.query(User).filter(User.username == "rahumana").first()
        if not user:
            print("User 'rahumana' not found, trying first user...")
            user = db.query(User).first()
            if not user:
                print("No users found in database")
                return False

        print(f"Found user: {user.username} (ID: {user.id})")

        # Find document with ID 54 (from the error)
        document = db.query(Document).filter(Document.id == 54).first()
        if not document:
            print("Document 54 not found, trying first document...")
            document = db.query(Document).first()
            if not document:
                print("No documents found in database")
                return False

        print(f"Found document: {document.name} (ID: {document.id})")

        # Create a valid token with CORRECT payload structure
        token_data = {
            'sub': str(user.id),
            'user_id': user.id,  # This is what get_current_user expects!
            'username': user.username,
            'role': user.role
        }
        access_token = create_access_token(data=token_data, expires_delta=timedelta(minutes=15))

        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

        # Create share data similar to what frontend sends
        share_data = {
            "document_id": document.id,
            "share_name": "Test Share",
            "share_type": "external",
            "allow_preview": True,
            "allow_download": True,
            "allow_comment": False,
            "require_password": False,
            "password": None,
            "expires_at": None,
            "max_access_count": None,
            "access_restrictions": {},
            "encryption_password": "testpass123"  # Default encryption password
        }

        base_url = 'http://localhost:8002'
        url = f'{base_url}/api/v1/shares/?document_id={document.id}'

        print(f"\nTesting POST {url}")
        print(f"Share data: {json.dumps(share_data, indent=2)}")

        try:
            response = requests.post(url, headers=headers, json=share_data, timeout=10)
            print(f"Status: {response.status_code}")
            print(f"Response time: {response.elapsed.total_seconds():.3f}s")

            if response.status_code == 201:
                data = response.json()
                print(f"Success: Share created with ID {data.get('share', {}).get('id')}")
                return True
            else:
                print(f"Error response: {response.text}")
                try:
                    error_data = response.json()
                    print(f"Error details: {json.dumps(error_data, indent=2)}")
                except:
                    pass
                return False

        except requests.exceptions.Timeout:
            print("Request timed out")
            return False
        except requests.exceptions.ConnectionError:
            print("Connection error - is the server running?")
            return False
        except Exception as e:
            print(f"Unexpected error: {e}")
            return False

    finally:
        db.close()


if __name__ == "__main__":
    print("Share Creation Test - Fixed")
    print("=" * 50)
    
    success = test_share_creation()
    
    print("\n" + "=" * 50)
    if success:
        print("Test completed successfully!")
    else:
        print("Test failed")
        sys.exit(1)