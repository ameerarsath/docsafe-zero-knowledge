# DOCX Preview Issue Analysis and Solution

## Problem Analysis

### **Symptoms**
- Shared DOCX file shows unreadable binary text instead of document content
- Example: `sYH7!(^#v^S=skTEHHla=1%kc?`K+X$m^\Sn)e6A3G)#~q\)D)J7[LFCo...`
- File metadata shows valid DOCX MIME type and ~395KB size
- JSZip fails to extract the DOCX content

### **Root Cause Analysis**

#### **1. Why JSZip Fails**
The binary text `sYH7!(^#v^S=skTEHHla=1%kc?`K+X$m^\Sn)e6A3G)...` indicates:

**❌ Encrypted Content:**
- The content is AES-GCM encrypted binary data
- JSZip expects a valid ZIP file with signature `0x04034b50` (`PK\x03\x04`)
- Encrypted data doesn't have ZIP structure, causing JSZip extraction failure

**❌ Missing DOCX Magic Bytes:**
- Valid DOCX files start with `PK\x03\x04` (ZIP signature)
- Binary encrypted content starts with random-looking bytes
- No ZIP structure for JSZip to parse

#### **2. Share Endpoint Behavior**
From `shares.py:907-967`:

```python
# For encrypted documents
if is_encrypted:
    # If decryption failed or no password available, provide encrypted data with metadata
    headers = {
        "X-Requires-Decryption": "true",
        "X-Encryption-Salt": document.salt,
        "X-Encryption-IV": document.encryption_iv,
    }
    return Response(content=file_data, media_type="application/octet-stream")
```

**The Issue:** The endpoint is serving encrypted binary data as `application/octet-stream` instead of decrypted DOCX content.

#### **3. Frontend Plugin Expectations**
The `RobustDocxPlugin` expects:
1. Valid ZIP file structure
2. DOCX magic bytes (`PK\x03\x04`)
3. Extractable `word/document.xml` file
4. Proper MIME type (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`)

**Reality:** Receives encrypted binary data that JSZip cannot parse.

## Solution Implementation

### **Option 1: Force Server-Side Decryption (Recommended)**
Modify the share endpoint to always attempt server-side decryption for preview:

```python
# In shares.py, modify the preview endpoint
if is_encrypted:
    if encryption_password:
        try:
            decrypted_data = decrypt_document_for_sharing(document, encrypted_data, encryption_password)
            if decrypted_data:
                # Validate decrypted content is actually a DOCX
                if decrypted_data.startswith(b'PK'):
                    return Response(
                        content=decrypted_data,
                        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        headers={"X-Decrypted": "true"}
                    )
                else:
                    print(f"Decryption succeeded but content is not DOCX format")
        except Exception as e:
            print(f"Server-side decryption failed: {e}")

    # Fallback to encrypted data with proper headers
    return Response(
        content=encrypted_data,
        media_type="application/octet-stream",
        headers={"X-Requires-Decryption": "true"}
    )
```

### **Option 2: Enhanced Frontend Handling**
Add proper validation in the `RobustDocxPlugin`:

```typescript
// In robustDocxPlugin.ts, add validation
async preview(blob: Blob, fileName: string, mimeType: string): Promise<PreviewResult> {
  // Check if content is encrypted
  const arrayBuffer = await blob.arrayBuffer();
  const firstBytes = new Uint8Array(arrayBuffer.slice(0, 4));

  // Check for ZIP signature
  const isZip = firstBytes[0] === 0x50 && firstBytes[1] === 0x4B &&
                firstBytes[2] === 0x03 && firstBytes[3] === 0x04;

  if (!isZip) {
    // Check if encrypted
    const requiresDecryption = this.getRequiresDecryption();
    if (requiresDecryption) {
      throw new Error('Content is encrypted and requires client-side decryption');
    }

    // Not a valid DOCX
    throw new Error('Invalid DOCX format - missing ZIP signature');
  }

  // Proceed with normal DOCX processing
  // ... existing code
}
```

### **Option 3: Comprehensive Fix (Recommended)**
Implement both server-side and client-side improvements:

#### **Backend Changes:**
1. Always attempt server-side decryption for preview
2. Validate decrypted content format
3. Provide proper error messages and fallbacks

#### **Frontend Changes:**
1. Add content validation before JSZip processing
2. Handle encrypted content gracefully
3. Provide clear error messages to users

## Debugging Steps

### **1. Verify Content Type**
```bash
# Check what the share endpoint actually returns
curl -I "http://localhost:8000/api/v1/shares/{token}/preview"
```

### **2. Check Magic Bytes**
```python
# Analyze the first few bytes
content = requests.get(share_url).content
print(f"First 4 bytes: {content[:4].hex()}")
print(f"Expected ZIP signature: 504b0304")
```

### **3. Verify Database Encryption Status**
```python
# Check if document is marked as encrypted
document = db.query(Document).filter(Document.id == doc_id).first()
print(f"is_encrypted: {document.is_encrypted}")
print(f"has ciphertext: {bool(document.ciphertext)}")
print(f"has salt: {bool(document.salt)}")
```

## Implementation Priority

### **High Priority (Immediate Fix)**
1. **Server-side decryption attempt** - Always try to decrypt for preview
2. **Content validation** - Verify decrypted content is actually DOCX
3. **Proper error handling** - Clear error messages when decryption fails

### **Medium Priority**
1. **Frontend validation** - Add ZIP signature check before JSZip
2. **Fallback mechanisms** - Better error handling and user feedback
3. **Logging** - Enhanced debugging information

### **Low Priority**
1. **UI improvements** - Better loading states and error displays
2. **Performance optimization** - Caching decrypted content
3. **Advanced features** - Multiple format support

## Testing Steps

### **1. Test with Different Document Types**
- Encrypted DOCX files
- Unencrypted DOCX files
- Password-protected shares
- Public shares

### **2. Validate Fix**
- Verify DOCX content displays correctly
- Confirm JSZip can extract content
- Check MIME types are correct
- Ensure decryption works end-to-end

### **3. Error Scenarios**
- Invalid passwords
- Corrupted files
- Missing encryption metadata
- Network issues

## Conclusion

The core issue is that encrypted DOCX files are being served as binary data instead of decrypted content. The fix requires:

1. **Backend**: Attempt server-side decryption for preview
2. **Content Validation**: Ensure decrypted content is valid DOCX
3. **Frontend**: Add proper validation and error handling
4. **Testing**: Comprehensive testing with various scenarios

This will ensure that shared DOCX files show actual document content instead of unreadable binary text.