# Manual Decryption Testing Guide

## Objective
Verify that zero-knowledge encryption and decryption work end-to-end with proper parameter matching.

## Prerequisites
- Frontend running on `http://localhost:3005`
- Backend running on `http://localhost:8002`
- User account with encryption key configured
- Browser with developer console open (F12)

## Test Procedure

### Test 1: Upload and Immediate Decryption

#### Step 1: Prepare Test File
Create a simple text file named `test-decrypt.txt` with content:
```
This is a test document for zero-knowledge encryption verification.
Test timestamp: [current time]
```

#### Step 2: Upload with Encryption
1. Navigate to `http://localhost:3005/documents`
2. Open browser console (F12 → Console tab)
3. Click "Upload Document" button
4. Select `test-decrypt.txt`
5. Enter encryption password: `JHNpAZ39g!&Y`
6. Click "Encrypt & Upload"

#### Step 3: Monitor Encryption Console Output
**Look for these console messages:**
```
[ENCRYPT] Starting zero-knowledge encryption for file: test-decrypt.txt
[ENCRYPT] ========== ENCRYPTION PARAMETERS (DEBUG) ==========
[ENCRYPT] Encryption Key Details: {
  keyId: "key_xxxxxxxxx",
  algorithm: "aes-256-gcm",
  iterations: 200000,
  saltLength: 24,
  saltPreview: "abcdefghijklmnopqrst...",
  isActive: true
}
[ENCRYPT] Password length: 13
[ENCRYPT] Zero-knowledge encryption completed successfully
```

**RECORD THE FOLLOWING:**
- ✏️ Encryption Key ID: `_________________`
- ✏️ Salt Preview (first 20 chars): `_________________`
- ✏️ Iterations: `_________________`
- ✏️ Password Length: `_________________`

#### Step 4: Immediate Decryption Test
1. Find the just-uploaded document in the list
2. Click on it to open preview
3. Enter the SAME password: `JHNpAZ39g!&Y`
4. Click "Decrypt"

#### Step 5: Monitor Decryption Console Output
**Look for these console messages:**
```
🔑 Looking for encryption key: key_xxxxxxxxx
✅ Found encryption key salt for decryption

🔍 ========== DECRYPTION PARAMETERS (DEBUG) ==========
🔍 Document Info: {
  id: X,
  name: "test-decrypt.txt",
  encryption_key_id: "key_xxxxxxxxx",
  has_encrypted_dek: true,
  encrypted_dek_length: XXX
}
🔍 Using Encryption Key: {
  keyId: "key_xxxxxxxxx",
  algorithm: "aes-256-gcm",
  iterations: 200000,
  saltLength: 24,
  saltPreview: "abcdefghijklmnopqrst...",
  isActive: true
}
🔍 Password length: 13

🔑 ========== UNWRAPPING DEK (DEBUG MODE) ==========
🔍 Input Parameters: {
  passwordLength: 13,
  saltLength: 24,
  iterations: 200000,
  encryptedDekStringLength: XXX
}
📋 Parsed DEK Info: {
  algorithm: "AES-256-GCM",
  ciphertextLength: XX,
  ivLength: XX,
  authTagLength: XX
}
🔍 KEK Derivation Parameters: {
  passwordLength: 13,
  saltBase64: "abcdefghijklmnopqrst...",
  iterations: 200000
}
✅ KEK derived successfully
✅ DEK decrypted successfully
✅ Document decrypted successfully
```

#### Step 6: Verify Parameter Match
Compare encryption vs decryption parameters:

| Parameter | Encryption | Decryption | Match? |
|-----------|-----------|------------|--------|
| Key ID | `_______` | `_______` | ☐ YES ☐ NO |
| Salt Preview | `_______` | `_______` | ☐ YES ☐ NO |
| Iterations | `_______` | `_______` | ☐ YES ☐ NO |
| Password Length | `_______` | `_______` | ☐ YES ☐ NO |

**✅ Test 1 PASSED if all parameters match and decryption succeeds**

---

### Test 2: Multi-Key Fallback (Legacy Documents)

#### Step 1: Simulate Legacy Document
```sql
-- In database, set encryption_key_id to NULL for test document
UPDATE documents
SET encryption_key_id = NULL
WHERE name = 'test-decrypt.txt';
```

#### Step 2: Attempt Decryption
1. Refresh the documents page
2. Click on the test document
3. Enter password: `JHNpAZ39g!&Y`
4. Click "Decrypt"

#### Step 3: Monitor Fallback Console Output
**Look for these console messages:**
```
⚠️ Document missing encryption_key_id - attempting fallback with all keys
🔄 Attempting decryption with X available keys...

🔑 Trying key: key_xxxxxxxxx
🔍 Key Details: {
  keyId: "key_xxxxxxxxx",
  iterations: 200000,
  saltLength: 24,
  saltPreview: "abcdefghijklmnopqrst...",
  isActive: true
}

✅ Successfully decrypted with key: key_xxxxxxxxx
```

**✅ Test 2 PASSED if fallback finds correct key and decryption succeeds**

---

### Test 3: Wrong Password Error

#### Step 1: Attempt Decryption with Wrong Password
1. Click on any encrypted document
2. Enter WRONG password: `WrongPassword123!`
3. Click "Decrypt"

#### Step 2: Monitor Error Console Output
**Look for these console messages:**
```
🔑 ========== UNWRAPPING DEK (DEBUG MODE) ==========
...
❌ Error in unwrapDEK: OperationError: Failed to decrypt DEK
```

**Look for user-visible error message:**
```
🔑 Decryption failed. Please check:
• Your password is correct
• You have access to the encryption key used for this document
• The document hasn't been corrupted
```

**✅ Test 3 PASSED if user sees clear error message**

---

### Test 4: Database Verification

#### Step 1: Check Document Record
```sql
SELECT
  id,
  name,
  encryption_key_id,
  LENGTH(encrypted_dek) as dek_length,
  encryption_iv,
  encryption_auth_tag,
  is_encrypted
FROM documents
WHERE name = 'test-decrypt.txt';
```

**Verify:**
- ☐ `encryption_key_id` is NOT NULL
- ☐ `encrypted_dek` has content (length > 0)
- ☐ `encryption_iv` has content
- ☐ `encryption_auth_tag` has content
- ☐ `is_encrypted` is TRUE

#### Step 2: Check Key Match
```sql
SELECT
  d.name,
  d.encryption_key_id as doc_key_id,
  ek.key_id as actual_key_id,
  ek.iterations,
  LENGTH(ek.salt) as salt_length,
  ek.is_active,
  CASE
    WHEN d.encryption_key_id = ek.key_id THEN 'MATCH'
    ELSE 'MISMATCH'
  END as status
FROM documents d
LEFT JOIN encryption_keys ek ON d.encryption_key_id = ek.key_id
WHERE d.name = 'test-decrypt.txt';
```

**Verify:**
- ☐ Status shows `MATCH`
- ☐ Iterations matches what was logged
- ☐ Salt length is > 0

**✅ Test 4 PASSED if database shows correct encryption metadata**

---

## Troubleshooting

### Issue: "encryption_key_id is null"
**Cause**: Backend not saving encryption_key_id
**Solution**:
1. Check backend API endpoint accepts `encryption_key_id`
2. Verify database schema has `encryption_key_id` column
3. Check backend doesn't strip this field from request

### Issue: Parameters Don't Match
**Cause**: Using wrong encryption key for decryption
**Solution**:
1. Verify `encryption_key_id` from upload matches preview
2. Check document record in database
3. Ensure correct key is being selected in `DocumentPreview.tsx`

### Issue: "All keys failed"
**Cause**: Password mismatch or corrupted DEK
**Solution**:
1. Verify same password used for encryption and decryption
2. Check encrypted_dek is not corrupted in database
3. Try re-uploading document with fresh encryption

---

## Success Criteria

✅ **ALL of the following must be true:**
1. Upload logs show correct encryption parameters
2. encryption_key_id is saved to database
3. Decryption uses same parameters as encryption
4. Decryption succeeds on first attempt
5. Multi-key fallback works for legacy documents
6. Wrong password shows clear error message
7. Database shows correct encryption metadata

---

## Report Template

### Test Results Summary

**Date:** `_______________`
**Tester:** `_______________`
**Environment:** `_______________`

| Test | Status | Notes |
|------|--------|-------|
| Test 1: Upload & Decrypt | ☐ PASS ☐ FAIL | |
| Test 2: Multi-Key Fallback | ☐ PASS ☐ FAIL | |
| Test 3: Wrong Password | ☐ PASS ☐ FAIL | |
| Test 4: Database Verification | ☐ PASS ☐ FAIL | |

**Overall Result:** ☐ ALL TESTS PASSED ☐ SOME FAILURES

**Issues Found:**
```
[List any issues discovered during testing]
```

**Console Logs:**
```
[Paste relevant console output showing parameter mismatch or errors]
```
