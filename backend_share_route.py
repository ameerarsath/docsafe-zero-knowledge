from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import HTMLResponse

@app.get("/share/{token}")
async def share_document(token: str):
    share = await get_share(token)
    if not share:
        raise HTTPException(404, "Share not found")
    
    document = await get_document(share.document_id)
    file_data = await read_file(document.storage_path)
    
    # Detect plain files by signature
    is_plain = detect_plain_file(file_data)
    has_encryption = bool(document.encrypted_dek or document.encryption_key_id)
    
    if is_plain or not has_encryption:
        content = file_data  # Serve plain file as-is
    else:
        content = await decrypt_file(file_data, share.password)
    
    return Response(
        content=content,
        media_type=document.mime_type,
        headers={"Content-Disposition": f"inline; filename={document.name}"}
    )

def detect_plain_file(data: bytes) -> bool:
    header = data[:8]
    return (
        header.startswith(b'%PDF') or      # PDF
        header.startswith(b'PK\x03\x04')  # ZIP/DOCX
    )