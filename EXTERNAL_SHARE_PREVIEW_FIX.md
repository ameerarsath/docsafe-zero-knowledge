# External Share Preview Fix

**Date**: 2025-10-04
**Status**: ✅ PARTIAL FIX - 500 Error Resolved, Encryption Issue Identified

---

## Issues Fixed

### ✅ 1. Backend 500 Internal Server Error
**Problem**: External share preview endpoint crashed with 500 error
**Root Cause**: Backend tried to set HTTP headers with `None` values when `encryption_salt` or `encryption_iv` were missing from document metadata
**Error**: `TypeError: Cannot set header with None value`

**Solution**: Add null checks before setting encryption metadata headers

**File Modified**: `backend/app/api/v1/shares.py` (lines 1021-1045)

```python
# BEFORE (caused 500 error):
headers = {
    "X-Encryption-Salt": document.encryption_salt,  # Could be None
    "X-Encryption-IV": document.encryption_iv,      # Could be None
    ...
}

# AFTER (fixed):
headers = {
    "X-Encryption-Algorithm": document.encryption_algorithm or "aes-256-gcm",
    "X-Encryption-Iterations": "500000",
    ...
}

# Only add encryption metadata headers if they exist
if document.encryption_salt:
    headers["X-Encryption-Salt"] = document.encryption_salt
if document.encryption_iv:
    headers["X-Encryption-IV"] = document.encryption_iv
```

---

## Remaining Issue

### ⚠️ 2. External Share Preview Stuck on "Loading preview..."
**Problem**: After fixing 500 error, preview gets stuck loading indefinitely
**Root Cause**: Document encryption metadata (salt/IV) is missing from database

**Why This Happens**:
- Document has `is_encrypted=True` in database
- Document has encrypted content (ciphertext)
- Document is **MISSING** `encryption_salt` and `encryption_iv` fields
- Frontend receives encrypted data but has no salt/IV to derive decryption key
- Client-side decryption cannot proceed without these fields

**Affected Documents**:
- Documents uploaded with older encryption method
- Documents where encryption metadata was not stored properly
- Documents where `encryption_key_id` was used instead of individual salt/IV

**Frontend Behavior**:
```javascript
// SharedDocumentPreview.tsx line 157-162
const salt = response.headers.get('X-Encryption-Salt');  // null
const iv = response.headers.get('X-Encryption-IV');      // null

if (!salt || !iv) {
  throw new Error('Missing encryption metadata in response headers.');
}
```

---

## Solutions

### Option 1: Server-Side Decryption (Requires Share Password)
**Best for**: External shares where user provides encryption password

**Implementation**: Already partially implemented in backend
- Share must have `encryption_password` stored
- Backend attempts server-side decryption first
- If successful, returns decrypted content

**Current Gap**: Share doesn't have encryption password stored

### Option 2: Migration Script (Recommended)
**Best for**: Fixing existing documents

**Implementation**:
1. Create migration script to populate missing `encryption_salt` and `encryption_iv`
2. Derive from `encryption_key_id` or stored keys
3. Update all documents with missing metadata

### Option 3: Frontend Fallback Handler
**Best for**: Graceful error handling

**Implementation**: Show user-friendly error message when metadata missing
```javascript
if (!salt || !iv) {
  updateState({
    error: 'This document uses legacy encryption. Please contact administrator.',
    needsPassword: true
  });
  return;
}
```

---

## Testing

### Test Case 1: External Share with Missing Metadata
**URL**: `http://localhost:3005/share/39qgEmDHWCy897FLUNovW2pOaSOIV5lW-Tew1uxcfg4`
**Document**: `ameer aia infosys[1].pdf`
**Share Token**: `39qgEmDHWCy897FLUNovW2pOaSOIV5lW-Tew1uxcfg4`

**Backend Response**:
```
Status: 200 OK (✅ 500 error fixed)
Headers:
  X-Requires-Decryption: true
  X-Encryption-Algorithm: aes-256-gcm
  X-Encryption-Iterations: 500000
  X-Encryption-Salt: <missing>  # Document has None in database
  X-Encryption-IV: <missing>    # Document has None in database
```

**Frontend Behavior**:
- ✅ No 500 error
- ❌ Stuck on "Loading preview..."
- ❌ Cannot decrypt without salt/IV

---

## Related Fixes (This Session)

### ✅ ModernOfficePlugin Interface Compliance
**Problem**: Plugin failed to register due to interface mismatch
**Fix**: Added `supportedMimeTypes` and `supportedExtensions` directly on plugin class

**Files Modified**:
- `frontend/src/services/documentPreview/plugins/modernOfficePlugin.ts`

**Result**: Plugin now registers successfully (23/23 plugins registered)

### ✅ PowerPoint Preview Routing
**Problem**: PPTX showed download instead of slide viewer
**Fix**: Removed PowerPoint from ModernOfficePlugin to allow AdvancedPowerPointPreviewPlugin to handle

**Files Modified**:
- `frontend/src/services/documentPreview/plugins/modernOfficePlugin.ts`

**Result**: AdvancedPowerPointPreviewPlugin now handles PPTX with full slide viewer

### ✅ HTML Preview Sandbox Restrictions
**Problem**: HTML files showed "Preview not available"
**Fix**: Removed sandbox attribute from HTML iframe

**Files Modified**:
- `frontend/src/utils/universalFilePreview.tsx` (lines 376-390)

**Result**: HTML renders with full functionality (forms, scripts, CSS)

---

## Recommendations

### Immediate Actions:
1. ✅ **Backend 500 Error Fixed** - No action needed
2. ⚠️ **Encryption Metadata Missing** - Choose solution:
   - Run migration script to populate salt/IV from encryption keys
   - Implement better error messaging for legacy documents
   - Store encryption password in share for server-side decryption

### Long-Term Improvements:
1. **Encryption Consistency Check**: Validate all encrypted documents have required metadata
2. **Share Creation Validation**: Ensure external shares have encryption password when needed
3. **Migration Path**: Provide upgrade path for legacy encrypted documents
4. **Error Messaging**: Clear user feedback when preview fails due to encryption issues

---

## Console Logs

### Backend Logs (Expected):
```
🔍 Document 123 encryption status:
   database is_encrypted: True
   has encryption_key: True
   has encryption_salt: False  # ⚠️ Missing
   has encryption_iv: False    # ⚠️ Missing
   inconsistent state: True
   actual is_encrypted: True

📦 Serving encrypted content for document 123 with decryption metadata
🔍 Headers: salt=False, iv=False  # ⚠️ Missing metadata
```

### Frontend Logs (Expected):
```
📄 Fetching shared document from preview endpoint...
🔗 Using API URL: http://localhost:8002
❌ Missing encryption metadata in response headers.
🔄 Stuck on "Loading preview..."
```

---

## Status Summary

| Issue | Status | Impact |
|-------|--------|--------|
| Backend 500 error | ✅ FIXED | External shares no longer crash |
| ModernOfficePlugin registration | ✅ FIXED | All plugins register correctly |
| PowerPoint preview routing | ✅ FIXED | PPTX shows slide viewer |
| HTML preview restrictions | ✅ FIXED | HTML renders fully |
| Encryption metadata missing | ⚠️ IDENTIFIED | Preview stuck loading (needs migration) |

---

## Next Steps

**For User**:
1. Test PPTX preview with slide navigation (hard refresh: Ctrl+Shift+R)
2. Test HTML preview with forms/scripts
3. Review encryption metadata issue and choose solution approach

**For Development**:
1. Create migration script for missing encryption metadata
2. Update share creation to store encryption password for external shares
3. Implement graceful error handling for legacy documents
4. Add encryption consistency validation on upload
