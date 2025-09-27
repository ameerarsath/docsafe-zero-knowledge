#!/usr/bin/env python3
"""
Script to add the new encryption data endpoint to documents.py
"""

# Read the original file
with open('app/api/v1/documents.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the insertion point (before "# Search and Filter Endpoints")
insertion_point = content.find("# Search and Filter Endpoints")
if insertion_point == -1:
    print("ERROR: Could not find insertion point")
    exit(1)

# Split content
before = content[:insertion_point]
after = content[insertion_point:]

# Define the new endpoint
new_endpoint = '''
@router.get("/{document_id}/encryption-data")
async def get_document_encryption_data(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get document encryption data for client-side decryption."""
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    # Check read permission
    if not document.can_user_access(current_user, "read"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient privileges to access this document"
        )

    # Check if it's a document (not folder)
    if document.document_type != DocumentType.DOCUMENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot get encryption data for a folder"
        )

    if not document.is_encrypted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document is not encrypted"
        )

    # Validate required encryption fields
    if not document.ciphertext:
        # If ciphertext is missing, try to read from file and populate it
        if document.storage_path and os.path.exists(document.storage_path):
            try:
                import base64
                with open(document.storage_path, 'rb') as file:
                    file_content = file.read()
                    document.ciphertext = base64.b64encode(file_content).decode('utf-8')
                    db.commit()
                    print(f"MIGRATION: Populated ciphertext for document {document.id} from file")
            except Exception as e:
                print(f"ERROR: Failed to read file content for document {document.id}: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to retrieve document content"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document ciphertext not found and file is missing"
            )

    if not document.encryption_iv or not document.encryption_auth_tag:
        # Check for encryption data truncation
        iv_length = len(document.encryption_iv) if document.encryption_iv else 0
        tag_length = len(document.encryption_auth_tag) if document.encryption_auth_tag else 0

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"TRUNCATION_DETECTED: Encryption data incomplete (IV: {iv_length}B, AuthTag: {tag_length}B)"
        )

    # Log access
    access_log = DocumentAccessLog(
        document_id=document.id,
        user_id=current_user.id,
        action="read",
        access_method="api",
        success=True,
        details={"endpoint": "encryption-data"}
    )
    db.add(access_log)
    db.commit()

    # Update last accessed time
    document.accessed_at = datetime.now()
    db.commit()

    # Return encryption data for client-side decryption
    return {
        "id": document.id,
        "name": document.name,
        "mime_type": document.mime_type,
        "file_size": document.file_size,
        "ciphertext": document.ciphertext,
        "encryption_iv": document.encryption_iv,
        "encryption_auth_tag": document.encryption_auth_tag,
        "encryption_algorithm": document.encryption_algorithm,
        "encrypted_dek": document.encrypted_dek,
        "is_encrypted": document.is_encrypted
    }


'''

# Combine the content
new_content = before + new_endpoint + after

# Write the updated content
with open('app/api/v1/documents.py', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Encryption data endpoint added successfully!")