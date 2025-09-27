#!/usr/bin/env python3
"""Test share creation payload directly to identify 422 validation issues"""
import sys
import asyncio
sys.path.append('backend')

from backend.app.api.v1.shares import create_share
from backend.app.schemas.document import DocumentShareCreate
from backend.app.models.user import User
from backend.app.core.database import SessionLocal
from fastapi import HTTPException

async def test_share_payload():
    """Test different share payload variations to find the exact validation issue"""

    db = SessionLocal()

    # Get the rahumana user
    user = db.query(User).filter(User.username == 'rahumana').first()
    if not user:
        print("ERROR: User rahumana not found")
        return

    print(f"Testing with user: {user.username} (ID: {user.id})")

    # Test different payload variations
    test_cases = [
        {
            "name": "Complete payload",
            "data": {
                "share_name": "Test External Share",
                "share_type": "external",
                "allow_download": False,
                "allow_preview": True,
                "allow_comment": False,
                "require_password": False,
                "password": None,
                "expires_at": None,
                "max_access_count": None,
                "access_restrictions": {}
            }
        },
        {
            "name": "Minimal payload",
            "data": {
                "share_name": "Test Share",
                "share_type": "external"
            }
        },
        {
            "name": "Default permissions payload",
            "data": {
                "share_name": "Test Share",
                "share_type": "external",
                "allow_download": True,
                "allow_preview": True,
                "allow_comment": False
            }
        }
    ]

    for test_case in test_cases:
        print(f"\n--- Testing: {test_case['name']} ---")
        try:
            # Create the Pydantic model
            share_data = DocumentShareCreate(**test_case['data'])
            print(f"✓ Pydantic validation passed")
            print(f"  Data: {share_data.dict()}")

            # Test the actual endpoint function
            try:
                result = await create_share(
                    share_data=share_data,
                    document_id=47,
                    current_user=user,
                    db=db
                )
                print(f"✓ Share creation succeeded!")
                print(f"  Result type: {type(result)}")
                break  # Success - stop testing

            except HTTPException as e:
                print(f"✗ HTTP Exception: {e.status_code} - {e.detail}")
            except Exception as e:
                print(f"✗ Unexpected error: {e}")
                import traceback
                traceback.print_exc()

        except Exception as e:
            print(f"✗ Pydantic validation failed: {e}")

    db.close()

if __name__ == "__main__":
    asyncio.run(test_share_payload())