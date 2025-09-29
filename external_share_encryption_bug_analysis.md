# External Share Encryption Bug Analysis

## Problem Description
External share links are serving encrypted file content instead of decrypted/original content, causing viewers to see encrypted binary data rather than the actual document.

## Root Cause Analysis

### 1. **Encryption Detection Logic Flaw**
```python
# In shares.py line ~1380
def detect_actual_encryption(document, file_data: bytes) -> bool:
    header = file_data[:8]
    
    # Known unencrypted file signatures
    if (header.startswith(b'%PDF') or          # PDF
        header.startswith(b'PK\\x03\\x04') or   # ZIP/DOCX (INCORRECT ESCAPE)
        header.startswith(b'\\xff\\xd8') or     # JPEG (INCORRECT ESCAPE)
        header.startswith(b'\\x89PNG')):       # PNG (INCORRECT ESCAPE)
        return False
    
    return bool(document.encrypted_dek or document.encryption_key_id)
```

**Bug**: Incorrect byte string escaping causes signature detection to fail.

### 2. **Missing Decryption in Preview Endpoint**
```python
# In shares.py preview_shared_document function
if is_encrypted:
    return Response(
        content=file_data,  # RAW ENCRYPTED DATA
        headers={"X-Requires-Decryption": "true"}
    )
```

**Bug**: Backend serves encrypted data expecting frontend to decrypt, but frontend lacks proper decryption keys for shared documents.

### 3. **Frontend Decryption Key Issue**
```typescript
// In SharedDocumentPreview.tsx
const requiresDecryption = response.headers.get('X-Requires-Decryption') === 'true';
if (requiresDecryption) {
    if (!sharePassword) {
        // ERROR: Assumes sharePassword can decrypt document
    }
}
```

**Bug**: Share password ≠ document encryption password in zero-knowledge system.

## Critical Issues Identified

### Issue 1: Byte String Signature Detection
```python
# WRONG (current code)
header.startswith(b'PK\\x03\\x04')  # Literal backslashes
header.startswith(b'\\xff\\xd8')   # Literal backslashes

# CORRECT
header.startswith(b'PK\x03\x04')   # Actual bytes
header.startswith(b'\xff\xd8')     # Actual bytes
```

### Issue 2: Zero-Knowledge Architecture Violation
- Server cannot decrypt documents (violates zero-knowledge principle)
- Share password is for share access, not document decryption
- Document encryption keys are user-specific, not share-specific

### Issue 3: Missing Share-Specific Decryption
- No mechanism to decrypt documents for external shares
- Frontend expects encryption metadata in headers that don't exist
- No fallback for unencrypted documents

## Solutions

### Fix 1: Correct Byte Signature Detection
```python
def detect_actual_encryption(document, file_data: bytes) -> bool:
    header = file_data[:16]  # Increased header size
    
    # PDF files
    if header.startswith(b'%PDF'):
        return False
    
    # ZIP-based files (DOCX, XLSX, PPTX)
    if header.startswith(b'PK\x03\x04'):
        return False
    
    # Image files
    if (header.startswith(b'\xff\xd8\xff') or    # JPEG
        header.startswith(b'\x89PNG\r\n\x1a\n') or  # PNG
        header.startswith(b'GIF87a') or          # GIF87a
        header.startswith(b'GIF89a')):           # GIF89a
        return False
    
    # Text files
    try:
        header.decode('utf-8')
        return False  # Likely plain text
    except UnicodeDecodeError:
        pass
    
    # Check database flags as fallback
    return bool(document.encrypted_dek or document.encryption_key_id)
```

### Fix 2: Server-Side Document Handling
```python
@router.get("/{share_token}/preview")
async def preview_shared_document(share_token: str, ...):
    # ... validation code ...
    
    with open(document.storage_path, "rb") as f:
        file_data = f.read()
    
    is_encrypted = detect_actual_encryption(document, file_data)
    
    if is_encrypted:
        # For encrypted documents in shares, we need pre-decrypted content
        # or a share-specific decryption mechanism
        raise HTTPException(
            status_code=422,
            detail={
                "error": "Encrypted document preview not available",
                "message": "This document is encrypted and cannot be previewed via share link",
                "suggestion": "Download the document and decrypt it locally"
            }
        )
    
    # Serve unencrypted content directly
    return Response(
        content=file_data,
        media_type=document.mime_type,
        headers={
            "Content-Length": str(len(file_data)),
            "X-Requires-Decryption": "false"
        }
    )
```

### Fix 3: Frontend Error Handling
```typescript
// In SharedDocumentPreview.tsx
const loadPreview = async () => {
    try {
        const response = await fetch(previewUrl);
        
        if (!response.ok) {
            const errorData = await response.json();
            if (errorData.error === "Encrypted document preview not available") {
                updateState({
                    error: "This encrypted document cannot be previewed. Please download it instead.",
                    isLoading: false
                });
                return;
            }
        }
        
        const requiresDecryption = response.headers.get('X-Requires-Decryption') === 'true';
        
        if (requiresDecryption) {
            // Handle encrypted documents properly
            updateState({
                error: "Encrypted documents cannot be previewed via share links",
                isLoading: false
            });
            return;
        }
        
        // Handle unencrypted documents
        const documentBlob = await response.blob();
        const previewResult = await getDocumentPreview(documentBlob, document.name, document.mime_type);
        
        // ... rest of preview logic
    } catch (error) {
        // ... error handling
    }
};
```

## Implementation Priority

1. **CRITICAL**: Fix byte signature detection (immediate)
2. **HIGH**: Update server-side encryption handling
3. **MEDIUM**: Improve frontend error messages
4. **LOW**: Add share-specific decryption mechanism (future enhancement)

## Testing Commands

```bash
# Test unencrypted file detection
python -c "
data = b'%PDF-1.4\n%âãÏÓ'
print('PDF detected:', data.startswith(b'%PDF'))
"

# Test DOCX detection  
python -c "
data = b'PK\x03\x04\x14\x00\x06\x00'
print('ZIP detected:', data.startswith(b'PK\x03\x04'))
"

# Test share preview
curl -v http://localhost:8002/api/v1/shares/TOKEN/preview
```

## Quick Fix Implementation

The minimal fix requires updating the `detect_actual_encryption` function in `shares.py` to use proper byte strings instead of escaped strings.