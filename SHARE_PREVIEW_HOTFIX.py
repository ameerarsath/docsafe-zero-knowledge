# HOTFIX: Backend Share Preview Endpoint
# Add this to your shares.py or equivalent backend file

@router.get("/{share_token}/preview")
async def preview_shared_document(
    share_token: str,
    password: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Fixed preview endpoint that detects and handles encryption properly."""
    
    # ... existing validation code ...
    
    # CRITICAL FIX: Detect actual file encryption
    with open(document.storage_path, "rb") as f:
        file_data = f.read()
    
    # Check file signatures to determine if actually encrypted
    header = file_data[:8]
    is_actually_encrypted = not (
        header.startswith(b'%PDF') or          # PDF
        header.startswith(b'PK\x03\x04') or   # ZIP/DOCX
        header.startswith(b'\xff\xd8') or     # JPEG
        header.startswith(b'\x89PNG')         # PNG
    )
    
    if is_actually_encrypted:
        # File is encrypted - return with decryption header
        return Response(
            content=file_data,
            media_type="application/octet-stream",
            headers={
                "X-Requires-Decryption": "true",
                "X-Original-Mime-Type": document.mime_type
            }
        )
    else:
        # File is plain - serve directly with correct MIME type
        return Response(
            content=file_data,
            media_type=document.mime_type,
            headers={
                "X-Requires-Decryption": "false",
                "Content-Length": str(len(file_data))
            }
        )