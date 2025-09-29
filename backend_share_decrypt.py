# Fix for backend share route - decrypt before serving
@app.get("/api/v1/shares/{share_token}/download")
async def download_shared_document(share_token: str):
    try:
        # 1. Get share and document
        share = await get_share_by_token(share_token)
        document = await get_document(share.document_id)
        
        # 2. Read file data
        file_data = await read_file(document.storage_path)
        
        # 3. Check if encrypted
        is_encrypted = detect_encryption(document, file_data)
        
        if is_encrypted:
            # 4. Decrypt with share password
            if not share.encryption_password:
                raise HTTPException(401, "Password required")
            
            decrypted_data = await decrypt_document(
                file_data, 
                share.encryption_password, 
                document
            )
            content = decrypted_data
        else:
            content = file_data
        
        # 5. Serve decrypted content
        return Response(
            content=content,
            media_type=document.mime_type,
            headers={
                "Content-Disposition": f"inline; filename={document.name}",
                "Content-Length": str(len(content))
            }
        )
        
    except Exception as e:
        raise HTTPException(500, f"Share download failed: {str(e)}")

def detect_encryption(document, file_data: bytes) -> bool:
    # Check if file has valid format signature
    header = file_data[:4]
    if header == b'%PDF' or header == b'PK\x03\x04':  # PDF or ZIP/DOCX
        return False
    
    # Check if document has encryption metadata
    return bool(document.encrypted_dek or document.encryption_key_id)