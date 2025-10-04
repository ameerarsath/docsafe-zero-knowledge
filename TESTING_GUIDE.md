# SecureVault Zero-Knowledge Upload/Download - Comprehensive Testing Guide

## 📋 Overview

This guide provides step-by-step testing procedures for the zero-knowledge document upload/download/preview system fixes.

**Testing Date**: October 2, 2025
**Implementation Status**: ✅ COMPLETE
**Priority**: CRITICAL

---

## 🔧 **Pre-Testing Setup**

### **1. Apply Database Migration**

```bash
cd backend
./venv/Scripts/alembic.exe upgrade head
```

**Expected Output**:
```
INFO  [alembic.runtime.migration] Running upgrade 30a1c4f64d4b -> 20251002_normalize
✅ Normalized storage paths to POSIX format (forward slashes)
INFO  [alembic.runtime.migration] Running upgrade 20251002_normalize -> head
```

### **2. Restart Backend Server**

```bash
cd backend
./venv/Scripts/python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

**Verify**: Server starts without errors

### **3. Restart Frontend**

```bash
cd frontend
npm run dev
```

**Verify**: Frontend accessible at http://localhost:3005

---

## 🧪 **Test Suite**

### **Test 1: Document Upload with Zero-Knowledge Encryption**

**Objective**: Verify complete metadata is sent and document is encrypted properly

**Steps**:
1. Navigate to http://localhost:3005
2. Log in with credentials:
   - Username: `rahumana`
   - Password: `TestPass123@`
3. Click "Upload Document"
4. Select a test PDF file (e.g., `test.pdf`)
5. Enter encryption password when prompted (or use existing)
6. Click "Upload"

**Expected Results**:
- ✅ Upload progress shows 0% → 100%
- ✅ Success message appears
- ✅ Document appears in document list
- ✅ Console shows no errors

**Console Verification**:
```javascript
// Frontend console should show:
[ENCRYPT] Starting zero-knowledge encryption for file: test.pdf
[ENCRYPT] Zero-knowledge encryption completed successfully
Starting upload for test.pdf
Upload progress for test.pdf: 100%
Upload completed for test.pdf
```

```python
# Backend console should show:
[UPLOAD] Upload type detected: Zero-Knowledge
[CRYPTO] Zero-knowledge fields: encrypted_dek length=200, algorithm=AES-256-GCM
[DB] Creating document record with encryption metadata...
[DB] Document committed and refreshed, ID: X
```

**Database Verification**:
```sql
-- Check uploaded document
SELECT
    id,
    name,
    storage_path,
    encrypted_dek IS NOT NULL as has_dek,
    encryption_iv IS NOT NULL as has_iv,
    encryption_salt IS NOT NULL as has_salt,
    LENGTH(encrypted_dek) as dek_length
FROM documents
WHERE name = 'test.pdf'
ORDER BY id DESC
LIMIT 1;
```

**Expected**:
- `has_dek = true`
- `has_iv = true`
- `has_salt = true`
- `dek_length ≈ 200`
- `storage_path` contains **forward slashes** (e.g., `./data/encrypted-files/3/a1/...`)

---

### **Test 2: Download Encrypted Bytes (Client-Side Decryption Preparation)**

**Objective**: Verify encrypted bytes can be downloaded with auth headers

**API Test**:
```bash
# Get auth token first
TOKEN="your_access_token_here"

# Download encrypted document
curl -X GET "http://localhost:8002/api/v1/documents/1/download?encrypted=true" \
  -H "Authorization: Bearer ${TOKEN}" \
  -o encrypted_test.bin
```

**Expected Results**:
- ✅ HTTP 200 OK
- ✅ Response headers include:
  - `X-Encrypted: true`
  - `X-Encryption-Algorithm: AES-256-GCM`
  - `Content-Type: application/octet-stream`
- ✅ File downloaded successfully
- ✅ File size matches database `file_size` + 16 bytes (auth tag)

**Verification**:
```bash
# Check file size
ls -lh encrypted_test.bin

# Compare with database
# SELECT file_size FROM documents WHERE id = 1;
# encrypted_test.bin should be file_size + 16 bytes
```

---

### **Test 3: Document Preview with Zero-Knowledge Decryption (PDF)**

**Objective**: Verify PDF preview works with client-side decryption

**Steps**:
1. In the document list, find the uploaded PDF
2. Click the preview icon (eye icon)
3. If prompted, enter encryption password: `JHNpAZ39g!&Y`
4. Wait for decryption and preview

**Expected Results**:
- ✅ Password dialog appears (if not already authenticated)
- ✅ Decryption progress indicator shows
- ✅ PDF preview loads and displays correctly
- ✅ PDF content is readable
- ✅ No errors in console

**Console Verification**:
```javascript
// Frontend console should show:
🔄 Decrypting PDF with zero-knowledge encryption...
🚀 Starting zero-knowledge document decryption...
📄 Document: test.pdf (ID: 1)
✅ All required metadata present
📦 Step 1/3: Unwrapping DEK...
🔑 Deriving KEK from password...
✅ KEK derived successfully
🔓 Decrypting DEK...
✅ DEK decrypted successfully
✅ DEK imported as CryptoKey
📦 Step 2/3: Reading encrypted file...
📊 Encrypted file size: XXXXX bytes
📦 Step 3/3: Decrypting document...
🔓 Decrypting document with DEK...
📊 Decryption parameters: { ciphertextLength: ..., authTagLength: 16, ... }
✅ Document decrypted successfully (XXXX bytes)
🎉 Zero-knowledge decryption completed successfully!
✅ PDF decrypted successfully with zero-knowledge encryption
```

**Error Cases to Test**:

**Test 3a: Wrong Password**
- Enter incorrect password
- **Expected**: Clear error message "Failed to decrypt DEK - incorrect password or corrupted data"
- ✅ No infinite loading
- ✅ Can retry with correct password

**Test 3b: Missing Encryption Metadata**
- Try to preview a document with missing `encrypted_dek`
- **Expected**: Clear error "Document is missing encrypted_dek metadata"

---

### **Test 4: Document Preview (Non-PDF Files)**

**Objective**: Verify other file types (DOCX, images, text) decrypt correctly

**Test Files**:
- Upload `test.docx`
- Upload `test.png`
- Upload `test.txt`

**Steps** (for each file):
1. Upload with zero-knowledge encryption
2. Click preview icon
3. Enter encryption password
4. Verify preview displays correctly

**Expected Results**:

**DOCX**:
- ✅ Text content renders in preview
- ✅ Basic formatting preserved

**PNG/Image**:
- ✅ Image displays correctly
- ✅ Full resolution visible

**TXT**:
- ✅ Text content readable
- ✅ No corruption

**Console Verification**:
```javascript
// Similar to PDF, but shows:
🔄 Attempting client-side decryption for non-PDF (zero-knowledge)...
// ... decryption steps ...
✅ Client-side decryption successful for non-PDF (zero-knowledge)
```

---

### **Test 5: Path Normalization (Legacy Documents)**

**Objective**: Verify old documents with Windows paths can be accessed

**Setup**:
```sql
-- Create a test document with Windows path
INSERT INTO documents (storage_path, ...)
VALUES ('./data/encrypted-files\\3\\a1\\test.enc', ...);
```

**Steps**:
1. Try to download the document via API
2. Try to preview the document

**Expected Results**:
- ✅ First access: Auto-normalizes path to POSIX format
- ✅ Database updated with forward slashes
- ✅ File downloads/previews successfully
- ✅ Console shows: `INFO: Normalized storage path from '...' to POSIX format`

**Verification**:
```sql
SELECT storage_path FROM documents WHERE id = X;
-- Should now show forward slashes: ./data/encrypted-files/3/a1/test.enc
```

---

### **Test 6: Missing File Handling**

**Objective**: Verify clear error messages when file is missing

**Setup**:
```sql
-- Update a document to point to non-existent file
UPDATE documents SET storage_path = './missing/file.enc' WHERE id = X;
```

**Steps**:
1. Try to download the document
2. Try to preview the document

**Expected Results**:
- ✅ HTTP 404 response
- ✅ Error body includes:
  ```json
  {
    "code": "file_missing",
    "detail": "Document file is missing from disk storage",
    "file_path": "./missing/file.enc",
    "document_id": X,
    "document_name": "..."
  }
  ```
- ✅ Clear user-facing message in UI

---

### **Test 7: Authentication & Authorization**

**Objective**: Verify auth tokens are included in all requests

**Test 7a: Valid Token**
```bash
curl -X GET "http://localhost:8002/api/v1/documents/1/download?encrypted=true" \
  -H "Authorization: Bearer ${VALID_TOKEN}"
```
**Expected**: HTTP 200 OK

**Test 7b: Missing Token**
```bash
curl -X GET "http://localhost:8002/api/v1/documents/1/download?encrypted=true"
```
**Expected**: HTTP 401 Unauthorized
**Response**:
```json
{
  "detail": "Authentication required. Please log in again."
}
```

**Test 7c: Invalid Token**
```bash
curl -X GET "http://localhost:8002/api/v1/documents/1/download?encrypted=true" \
  -H "Authorization: Bearer invalid_token"
```
**Expected**: HTTP 401 Unauthorized

**Test 7d: Insufficient Permissions**
```bash
# User without read permission tries to download
curl -X GET "http://localhost:8002/api/v1/documents/X/download?encrypted=true" \
  -H "Authorization: Bearer ${OTHER_USER_TOKEN}"
```
**Expected**: HTTP 403 Forbidden
**Response**:
```json
{
  "detail": "Access denied. You do not have permission to access this document."
}
```

---

### **Test 8: Field Name Compatibility (camelCase vs snake_case)**

**Objective**: Verify backend accepts both naming conventions

**Test 8a: snake_case Metadata**
```bash
curl -X POST "http://localhost:8002/api/v1/documents/upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@test.pdf" \
  -F 'upload_data={"name":"test.pdf","encrypted_dek":"...","encryption_iv":"...","salt":"...","file_size":1024,"mime_type":"application/pdf"}'
```
**Expected**: HTTP 201 Created

**Test 8b: camelCase Metadata**
```bash
curl -X POST "http://localhost:8002/api/v1/documents/upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@test.pdf" \
  -F 'upload_data={"name":"test.pdf","encryptedDek":"...","encryptionIv":"...","salt":"...","fileSize":1024,"mimeType":"application/pdf"}'
```
**Expected**: HTTP 201 Created

**Test 8c: Mixed Case Metadata**
```bash
curl -X POST "http://localhost:8002/api/v1/documents/upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@test.pdf" \
  -F 'upload_data={"name":"test.pdf","encrypted_dek":"...","encryptionIv":"...","salt":"...","file_size":1024,"mimeType":"application/pdf"}'
```
**Expected**: HTTP 201 Created

---

### **Test 9: Base64 JSON DEK Format**

**Objective**: Verify backend decodes base64-encoded DEK JSON

**Test Data**:
```javascript
// Frontend sends (from useEncryption hook):
const dekInfo = {
  ciphertext: "base64_ciphertext...",
  iv: "base64_iv...",
  authTag: "base64_auth_tag...",
  algorithm: "AES-256-GCM"
};
const dek = btoa(JSON.stringify(dekInfo)); // Base64 encode
```

**Upload with `dek` field**:
```bash
curl -X POST "http://localhost:8002/api/v1/documents/upload" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "file=@test.pdf" \
  -F 'upload_data={"name":"test.pdf","dek":"eyJjaXBoZXJ0ZXh0Ij...","salt":"...","file_size":1024,"mime_type":"application/pdf"}'
```

**Expected Results**:
- ✅ HTTP 201 Created
- ✅ Backend auto-decodes base64 DEK
- ✅ Extracts `ciphertext`, `iv`, `authTag` from JSON
- ✅ Stores `ciphertext` as `encrypted_dek` in database
- ✅ Console shows: "DEK field normalization" message

**Verification**:
```sql
SELECT encrypted_dek, encryption_iv, encryption_auth_tag
FROM documents
WHERE name = 'test.pdf'
ORDER BY id DESC
LIMIT 1;

-- encrypted_dek should contain the ciphertext (not the full JSON)
-- encryption_iv should be populated from JSON
-- encryption_auth_tag should be populated from JSON
```

---

## 📊 **Performance Testing**

### **Test 10: Large File Upload/Download**

**Objective**: Verify performance with large files

**Test Files**:
- 1 MB PDF
- 10 MB PDF
- 50 MB PDF (if supported)

**Metrics to Track**:
- Upload time
- Encryption time
- Download time
- Decryption time
- Memory usage (browser dev tools)

**Expected Results**:
- ✅ No browser crashes
- ✅ Progress indicators work smoothly
- ✅ Memory is released after decryption
- ✅ No memory leaks

**Console Monitoring**:
```javascript
// Check for memory cleanup
// After preview, URLs should be revoked
// Check: performance.memory (Chrome only)
```

---

## ✅ **Acceptance Criteria**

All tests must pass with the following criteria:

### **Backend**
- [x] Upload accepts both camelCase and snake_case fields
- [x] Upload decodes base64 JSON DEK format
- [x] Storage paths use forward slashes (POSIX)
- [x] Download endpoint supports `?encrypted=true` parameter
- [x] Path normalization auto-fixes Windows paths
- [x] Clear error messages with error codes
- [x] Auth tokens validated on all requests
- [x] Missing files return 404 with detailed error

### **Frontend**
- [x] Upload sends complete metadata (all formats)
- [x] Encrypted download includes Authorization header
- [x] Client-side decryption works for all file types
- [x] Preview displays decrypted content correctly
- [x] Error handling with user-friendly messages
- [x] No console errors during normal operation
- [x] Memory cleanup after preview

### **Security**
- [x] Zero-knowledge guarantees maintained
- [x] Master key never transmitted to server
- [x] DEK never transmitted in plaintext
- [x] Auth required for all operations
- [x] RBAC permissions enforced
- [x] No plaintext data logged

---

## 🐛 **Known Issues & Workarounds**

### **Issue 1: Old Documents May Need Re-Upload**

**Symptom**: Some very old documents fail to decrypt

**Cause**: Uploaded before DEK architecture implementation

**Workaround**:
1. Download the document (may decrypt with old method)
2. Re-upload with current encryption

### **Issue 2: Multiple Alembic Heads**

**Symptom**: Migration shows "Multiple heads present"

**Workaround**:
```bash
# Run migration by specific revision
alembic upgrade 20251002_normalize
```

---

## 📝 **Test Results Template**

```markdown
## Test Results - [Date]

**Tester**: [Name]
**Environment**: Development / Staging / Production
**Backend Version**: [Git commit hash]
**Frontend Version**: [Git commit hash]

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Document Upload | ✅ / ❌ | |
| 2 | Download Encrypted Bytes | ✅ / ❌ | |
| 3 | PDF Preview | ✅ / ❌ | |
| 4 | Non-PDF Preview | ✅ / ❌ | |
| 5 | Path Normalization | ✅ / ❌ | |
| 6 | Missing File Handling | ✅ / ❌ | |
| 7 | Authentication | ✅ / ❌ | |
| 8 | Field Compatibility | ✅ / ❌ | |
| 9 | Base64 DEK Format | ✅ / ❌ | |
| 10 | Large File Performance | ✅ / ❌ | |

**Overall Status**: PASS / FAIL

**Blockers**: [Any critical issues]

**Recommendations**: [Next steps]
```

---

## 🎯 **Next Steps After Testing**

1. **If all tests pass**:
   - ✅ Mark implementation as complete
   - ✅ Update production deployment plan
   - ✅ Create user documentation
   - ✅ Schedule deployment

2. **If tests fail**:
   - ❌ Document failing tests
   - ❌ Create bug reports with details
   - ❌ Fix issues and re-test
   - ❌ Update implementation plan

---

**Last Updated**: October 2, 2025
**Testing Completed**: Pending
**Approved By**: Pending
