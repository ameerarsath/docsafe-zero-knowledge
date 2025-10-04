#!/usr/bin/env python3
"""
Test script to validate DocumentUpload schema can handle salt field
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.schemas.document import DocumentUpload

def test_document_upload_with_salt():
    """Test that DocumentUpload schema accepts salt field"""

    # Test data from upload_data.log
    test_data = {
        "name": "Gemini_Generated_Image_uzpslguzpslguzps.png",
        "parent_id": None,
        "description": "",
        "tags": [],
        "doc_metadata": {},
        "is_sensitive": False,
        "salt": "3xWLT5khq/PlkfPVnav7vGJ0yo8uf/QqxL5j/4c8hzg=",
        "encryption_key_id": "key_3_77465b09a42608277d25dc593bfac3af",
        "encryption_iv": "vA9/zo7oHbQbB47d",
        "encryption_auth_tag": "PEmWs+JwbiDRH9PTz2NNlw==",
        "encrypted_dek": "eyJjaXBoZXJ0ZXh0IjoiUk9VbndveWZ1b1EvVEdXUEtEaUZ4cS9zWFczM0twdGdLTE9VeUtNRUhadz0iLCJpdiI6ImNrYlFDN2NScXhEdXNzZ0IiLCJhdXRoVGFnIjoiems0KzVaWThCZ01HV25YYzVvT3VjZz09IiwiYWxnb3JpdGhtIjoiQUVTLTI1Ni1HQ00ifQ==",
        "encryption_algorithm": "AES-256-GCM",
        "original_filename": "Gemini_Generated_Image_uzpslguzpslguzps.png",
        "original_size": 761175,
        "file_size": 761175,
        "file_hash": "9ea7d4d2e065e62ab2bdb712fb0faabded80e7c70ab199392e76aba8aed75dca",
        "mime_type": "image/png"
    }

    print("Testing DocumentUpload schema with salt field...")
    print(f"Test data keys: {list(test_data.keys())}")

    try:
        # Try to create DocumentUpload instance
        doc_upload = DocumentUpload(**test_data)
        print(f"✅ DocumentUpload created successfully!")
        print(f"   Name: {doc_upload.name}")
        print(f"   Salt: {doc_upload.salt}")
        print(f"   Encrypted DEK: {doc_upload.encrypted_dek[:50]}..." if doc_upload.encrypted_dek else "   Encrypted DEK: None")
        print(f"   File size: {doc_upload.file_size}")
        print(f"   MIME type: {doc_upload.mime_type}")
        return True

    except Exception as e:
        print(f"❌ Error creating DocumentUpload: {e}")
        print(f"   Error type: {type(e).__name__}")

        # Check if salt attribute exists
        try:
            print(f"   DocumentUpload fields: {DocumentUpload.__fields__.keys()}")
        except:
            try:
                print(f"   DocumentUpload model_fields: {DocumentUpload.model_fields.keys()}")
            except:
                print("   Could not retrieve model fields")

        return False

if __name__ == "__main__":
    success = test_document_upload_with_salt()
    sys.exit(0 if success else 1)