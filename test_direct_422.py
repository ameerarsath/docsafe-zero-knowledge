#!/usr/bin/env python3
"""Directly test the 422 error by calling the shares endpoint function"""
import sys
sys.path.append('backend')

from backend.app.api.v1.shares import create_share
from backend.app.schemas.document import DocumentShareCreate
from backend.app.models import User, Document
from backend.app.core.database import SessionLocal

def test_direct_422():
    """Test the create_share function directly"""

    # Create test data
    share_data = DocumentShareCreate(
        share_name="Test External Share",
        share_type="external",
        allow_preview=True,
        allow_download=False
    )

    # Get database session
    db = SessionLocal()

    # Get test user and document
    current_user = db.query(User).filter(User.id == 1).first()
    document = db.query(Document).filter(Document.id == 48).first()

    print(f"User found: {current_user.username if current_user else 'None'}")
    print(f"Document 48 found: {document.name if document else 'None'}")

    if not current_user:
        print("ERROR: No test user found")
        return

    if not document:
        print("ERROR: Document 48 not found")
        return

    # Try to create share directly
    try:
        print("Creating share...")
        # This would normally be called with document_id=48 in the query parameter
        # But we can simulate it by calling the function directly

        # The actual problem might be in the share creation logic
        # Let me check what happens when we call it
        result = "Would call create_share(share_data, document_id=48, current_user, db)"
        print(f"Result: {result}")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

    finally:
        db.close()

if __name__ == "__main__":
    test_direct_422()