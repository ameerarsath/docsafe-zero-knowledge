# Complete Preview Error Analysis

## 🚨 **ROOT CAUSE: BROKEN ENCRYPTION ARCHITECTURE**

### Multiple Critical Issues Identified:

## 1. **ENCRYPTION MODEL MISMATCH**
```
Document uses: encryption_key_id = "key_1755163793032_ufxl12dkh"
Decrypt method expects: encrypted_dek (user-specific encryption)
Result: Method fails - checks wrong encryption model
```

## 2. **MISSING MASTER KEY**
```
Document references: key_1755163793032_ufxl12dkh
Master keys table: EMPTY
Result: Key doesn't exist - decryption impossible
```

## 3. **USER ENCRYPTION SETUP INCOMPLETE**
```
Admin user: No encryption_salt
Rahumana user: Has encryption_salt but no user_encryption_keys
Result: Neither user can decrypt documents
```

## 4. **DOCUMENT SERVICE BUG**
The `decrypt_document_content` method in `document_service.py` only handles `encrypted_dek` model:

```python
# Current broken implementation
if not document.encrypted_dek:
    raise ValueError(f"Document {document_id} missing encryption key data")
```

But doesn't handle `encryption_key_id` model used by this document.

## 📋 **ERROR FLOW**
```
1. User clicks preview → Frontend calls GET /preview
2. Backend returns: "requires_password" (correct)
3. User enters password → Frontend calls POST /preview/encrypted  
4. Backend calls decrypt_document_content()
5. decrypt_document_content() checks for encrypted_dek (missing)
6. Method fails: "Document missing encryption key data"
7. API returns: "Wrong password or decryption failed"
8. Frontend shows: "Preview Unavailable"
```

## 🔧 **REQUIRED FIXES**

### Fix 1: Update Document Service
Add support for encryption_key_id model in decrypt method.

### Fix 2: Create Missing Master Key
Generate the missing master key for the document.

### Fix 3: Set Up User Encryption  
Configure admin user with proper encryption setup.

### Fix 4: Test Complete Workflow
Verify end-to-end preview functionality works.