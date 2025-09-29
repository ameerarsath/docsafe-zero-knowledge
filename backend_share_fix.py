from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import HTMLResponse
import os

router = APIRouter()

@router.get("/share/{share_token}")
async def access_shared_document(share_token: str):
    try:
        # 1. Validate share
        share = await get_share_by_token(share_token)
        if not share:
            raise HTTPException(404, "Share not found")
        
        # 2. Get document and file
        document = await get_document(share.document_id)
        file_data = await read_file(document.storage_path)
        
        # 3. Smart detection
        is_encrypted = detect_actual_encryption(document, file_data)
        
        # 4. Process content
        if is_encrypted:
            if not share.encryption_password:
                return HTMLResponse("<h1>Password Required</h1>")
            content = await decrypt_content(file_data, share.encryption_password)
        else:
            content = file_data
        
        # 5. Serve content
        return Response(
            content=content,
            media_type=document.mime_type or "application/octet-stream",
            headers={"Content-Disposition": f"inline; filename={document.name}"}
        )
        
    except Exception as e:
        raise HTTPException(500, f"Share access failed: {str(e)}")

def detect_actual_encryption(document, file_data: bytes) -> bool:
    # Check metadata first
    if document.encrypted_dek or document.encryption_key_id:
        return True
    
    # Check file signature
    header = file_data[:8]
    if (header.startswith(b'%PDF') or           # PDF
        header.startswith(b'PK\x03\x04') or    # ZIP/DOCX  
        header.startswith(b'\xFF\xD8')):       # JPEG
        return False
    
    return document.is_encrypted