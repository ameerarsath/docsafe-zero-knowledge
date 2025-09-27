#!/usr/bin/env python3
"""
Create an external share directly in the database
"""
import os
import sys
import secrets
import string
from datetime import datetime

# Add the backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from app.core.database import get_db
    from app.models.document import Document, DocumentShare
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import create_engine

    # Use the same database URL as the app
    DATABASE_URL = "postgresql://securevault_user:securevault_password@localhost:5430/securevault"

    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)

    def create_external_share():
        """Create an external share directly in the database"""

        db = SessionLocal()

        try:
            # Check what documents exist
            print("Looking for documents...")
            documents = db.query(Document).limit(10).all()

            if not documents:
                print("No documents found!")
                return None

            print(f"Found {len(documents)} documents:")
            for doc in documents:
                print(f"  ID: {doc.id}, Name: {doc.name}, Owner: {doc.owner_id}")

            # Use the first document
            document = documents[0]

            # Generate a unique share token
            def generate_share_token():
                return ''.join(secrets.choice(string.ascii_letters + string.digits + '_-') for _ in range(43))

            share_token = generate_share_token()

            # Create the external share
            share = DocumentShare(
                document_id=document.id,
                created_by=document.owner_id,  # Owner of the document
                share_token=share_token,
                share_name=f"External Share for {document.name}",
                share_type="external",  # KEY: external = no auth required
                allow_download=True,
                allow_preview=True,
                allow_comment=False,
                require_password=False,
                expires_at=None,
                max_access_count=None,
                access_restrictions={}
            )

            db.add(share)
            db.commit()

            print(f"SUCCESS: External share created!")
            print(f"Document: {document.name}")
            print(f"Share Token: {share_token}")
            print(f"Frontend URL: http://localhost:3005/share/{share_token}")
            print(f"API Test URL: http://localhost:8002/api/v1/shares/{share_token}/access")

            # Test the share access
            print("\nTesting external share access...")
            import requests

            test_response = requests.post(
                f"http://localhost:8002/api/v1/shares/{share_token}/access",
                json={}
            )

            print(f"Access status: {test_response.status_code}")

            if test_response.status_code == 200:
                print("SUCCESS: External share works without auth!")
                access_data = test_response.json()
                print(f"Document: {access_data['document']['name']}")
                print(f"Permissions: {access_data['permissions']}")
            else:
                print(f"ISSUE: {test_response.status_code} - {test_response.text}")

            return share_token

        except Exception as e:
            db.rollback()
            print(f"Database error: {e}")
            return None
        finally:
            db.close()

    if __name__ == "__main__":
        create_external_share()

except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure the backend dependencies are available")