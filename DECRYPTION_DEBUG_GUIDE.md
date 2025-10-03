# Zero-Knowledge Decryption Debug Guide

## Current Issue Analysis

### Symptoms
- Document decryption fails with "Failed to decrypt DEK - incorrect password or corrupted data"
- Occurs even with correct password
- Multi-key fallback also fails

### Root Causes (Potential)

#### 1. **Password Mismatch**
- User entering different password than used during encryption
- Password encoding issues (UTF-8 vs other encodings)
- Whitespace or special characters being handled differently

#### 2. **Salt Mismatch**
- Encryption uses one salt, decryption uses different salt
- Salt from wrong encryption key being used
- Salt encoding/decoding issues (base64)

#### 3. **Iterations Mismatch**
- Encryption uses X iterations
- Decryption uses Y iterations (default 100000)
- PBKDF2 produces different KEK

#### 4. **Encrypted DEK Format Issues**
- DEK stored in wrong format
- Base64 encoding/decoding issues
- JSON structure corruption

### Debug Logging Added

#### documentDecryption.ts `unwrapDEK()`:
```typescript
console.log('🔑 ========== UNWRAPPING DEK (DEBUG MODE) ==========');
console.log('🔍 Input Parameters:', {
  passwordLength,
  saltLength,
  iterations,
  encryptedDekStringLength
});

console.log('📋 Parsed DEK Info:', {
  algorithm,
  ciphertextLength,
  ivLength,
  authTagLength
});

console.log('🔍 KEK Derivation Parameters:', {
  passwordLength,
  saltBase64: salt.substring(0, 20) + '...',
  saltBytesLength,
  iterations
});
```

## Testing Checklist

### 1. Verify Encryption Parameters
```javascript
// During UPLOAD, check console for:
console.log('[ENCRYPT] Encryption Parameters:', {
  keyId: keyToUse.keyId,
  salt: keyToUse.salt,
  iterations: keyToUse.iterations,
  password: '<hidden>',
  passwordLength: password.length
});
```

### 2. Verify Decryption Parameters
```javascript
// During PREVIEW, check console for:
console.log('🔍 Decryption Parameters:', {
  encryptionKeyId: document.encryption_key_id,
  salt: keyData.salt,
  iterations: keyData.iterations,
  password: '<hidden>',
  passwordLength: password.length
});
```

### 3. Parameter Comparison
| Parameter | Encryption Value | Decryption Value | Match? |
|-----------|------------------|------------------|--------|
| Password | `<user input>` | `<user input>` | ??? |
| Salt | `keyToUse.salt` | `keyData.salt` | ??? |
| Iterations | `keyToUse.iterations` | `keyData.iterations` | ??? |
| Key ID | `keyToUse.keyId` | `document.encryption_key_id` | ??? |

## Common Issues & Solutions

### Issue 1: encryption_key_id Not Saved
**Symptom**: `document.encryption_key_id` is null/undefined

**Solution**:
- Verify backend saves `encryption_key_id` field
- Check database column exists
- Verify API response includes `encryption_key_id`

### Issue 2: Wrong Key Used
**Symptom**: Key ID doesn't match

**Solution**:
- Use document.encryption_key_id to find correct key
- Fallback: try all available keys
- Log which key succeeded

### Issue 3: Password Not Matching
**Symptom**: Same user, different password

**Solution**:
- User may have changed encryption password
- Document encrypted with old password
- Need password vault or key rotation

### Issue 4: Salt/Iterations Mismatch
**Symptom**: Same password, different KEK

**Solution**:
- Store iterations with document metadata
- Always use key that matches encryption_key_id
- Log salt and iterations during both encrypt/decrypt

## Manual Testing Steps

### Step 1: Upload Test Document
1. Open browser console (F12)
2. Navigate to Documents page
3. Upload a test file with encryption
4. **RECORD** the following from console:
   - `keyId` used for encryption
   - `salt` value (first 20 chars)
   - `iterations` value
   - Password length

### Step 2: Immediate Decryption Test
1. Click on just-uploaded document
2. Enter SAME password used for upload
3. **VERIFY** console shows:
   - Same `keyId` found
   - Same `salt` value
   - Same `iterations` value
   - DEK decrypts successfully

### Step 3: Multi-Key Fallback Test
1. Create a document without encryption_key_id (use migration)
2. Attempt to preview
3. **VERIFY** fallback tries multiple keys
4. **VERIFY** one key succeeds

## Debugging Commands

### Check Document in Database
```sql
SELECT
  id,
  name,
  encryption_key_id,
  LENGTH(encrypted_dek) as encrypted_dek_length,
  encryption_iv,
  is_encrypted
FROM documents
WHERE id = <document_id>;
```

### Check User's Encryption Keys
```sql
SELECT
  key_id,
  algorithm,
  iterations,
  LENGTH(salt) as salt_length,
  is_active,
  created_at
FROM encryption_keys
WHERE user_id = <user_id>
ORDER BY created_at DESC;
```

### Check Encryption Key Match
```sql
SELECT
  d.id,
  d.name,
  d.encryption_key_id,
  ek.key_id,
  ek.is_active,
  CASE
    WHEN d.encryption_key_id = ek.key_id THEN 'MATCH'
    ELSE 'MISMATCH'
  END as key_match_status
FROM documents d
LEFT JOIN encryption_keys ek ON d.encryption_key_id = ek.key_id
WHERE d.id = <document_id>;
```

## Next Steps

1. ✅ Add debug logging (DONE)
2. ⏳ Upload test document with logging enabled
3. ⏳ Verify encryption_key_id is saved to database
4. ⏳ Attempt decryption and compare parameters
5. ⏳ Identify exact parameter mismatch
6. ⏳ Fix root cause
7. ⏳ Re-test with 100% success rate

## Expected Console Output (Success Case)

### During Upload:
```
[ENCRYPT] Starting zero-knowledge encryption...
[ENCRYPT] Using encryption key: key_abc123
[ENCRYPT] Parameters: { keyId: "key_abc123", salt: "dGVzdHNhbHQ=...", iterations: 200000 }
[ENCRYPT] DEK generated: 32 bytes
[ENCRYPT] DEK encrypted with KEK
[ENCRYPT] Zero-knowledge encryption completed successfully
```

### During Preview:
```
🔑 Looking for encryption key: key_abc123
✅ Found encryption key salt for decryption
🔑 ========== UNWRAPPING DEK (DEBUG MODE) ==========
🔍 Input Parameters: { passwordLength: 13, saltLength: 24, iterations: 200000 }
📋 Parsed DEK Info: { algorithm: "AES-256-GCM", ciphertextLength: 44 }
🔍 KEK Derivation Parameters: { salt: "dGVzdHNhbHQ=...", iterations: 200000 }
✅ KEK derived successfully
✅ DEK decrypted successfully
✅ Document decrypted successfully
```
