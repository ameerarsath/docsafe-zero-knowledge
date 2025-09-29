from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session
import os

router = APIRouter()

@router.get("/documents/{doc_id}/validate-encryption")
async def validate_encryption(doc_id: int, db: Session):
    """Validate document encryption status"""
    
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    
    # Check metadata
    has_encryption_data = bool(doc.encrypted_dek or doc.encryption_key_id)
    
    # Check file if exists
    file_appears_encrypted = None
    if doc.storage_path and os.path.exists(doc.storage_path):
        with open(doc.storage_path, 'rb') as f:
            header = f.read(8)
        
        # Check for PDF signature
        is_pdf = header.startswith(b'%PDF')
        file_appears_encrypted = not is_pdf  # Simple heuristic
    
    # Determine correct status
    should_be_encrypted = has_encryption_data
    
    return {
        "document_id": doc_id,
        "current_flag": doc.is_encrypted,
        "should_be_encrypted": should_be_encrypted,
        "has_encryption_metadata": has_encryption_data,
        "file_appears_encrypted": file_appears_encrypted,
        "needs_fix": doc.is_encrypted != should_be_encrypted
    }