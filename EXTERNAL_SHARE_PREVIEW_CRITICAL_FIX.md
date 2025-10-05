# External Share Preview - Critical Fix

## Issue Summary
External share preview was using the WRONG preview system, causing multiple errors:
- PNG images: "Failed to process image: Failed to load image"
- DOCX files: "Invalid DOCX format - missing ZIP signature"
- PDF files: Triggered download instead of inline preview
- CSV files: Displayed encrypted data instead of decrypted content

## Root Cause
The `SharedDocumentPreview.tsx` component had a logic error in determining which preview system to use:

**Line 89 (BEFORE):**
```tsx
const shouldUseStreaming = !keys && sharePassword;
```

This meant:
- External shares WITHOUT a password would NOT use streaming/UniversalFileViewer
- Would fall through to plugin-based preview system (UniversalFormattedPreviewPlugin, etc.)
- Plugin system is designed for AUTHENTICATED users with client-side decryption
- Plugin system expects user keys and DEK, which external shares don't have

## Fix Applied
**SharedDocumentPreview.tsx:frontend/src/components/documents/SharedDocumentPreview.tsx:89**
```tsx
const shouldUseStreaming = !keys; // ALWAYS use for external shares
```

Now:
- External shares (when `!keys`) ALWAYS use UniversalFileViewer
- UniversalFileViewer fetches from `/api/v1/shares/{token}/preview` endpoint
- Backend handles server-side decryption
- `Content-Disposition: inline` header prevents downloads
- All file types display correctly

## Technical Details

### Preview System Architecture

**Plugin-Based Preview (Internal Shares)**
- For authenticated users with user keys loaded
- Client-side decryption using DEK
- Components: UniversalFormattedPreviewPlugin, DefaultPDFPlugin, etc.
- Requires user encryption keys and DEK

**UniversalFileViewer (External Shares)**
- For unauthenticated external users
- Server-side decryption using share password
- Direct preview from backend endpoint
- Works without user keys

### Code Flow

#### BEFORE Fix:
```
External Share → SharedDocumentPreview
  ↓
  !keys && sharePassword? → No (no password provided)
  ↓
  useStreaming = false
  ↓
  Falls through to plugin-based preview
  ↓
  getDocumentPreview() → UniversalFormattedPreviewPlugin
  ↓
  ❌ ERROR: Plugin expects DEK and user keys
```

#### AFTER Fix:
```
External Share → SharedDocumentPreview
  ↓
  !keys? → Yes (external share has no keys)
  ↓
  useStreaming = true
  ↓
  Renders UniversalFileViewer
  ↓
  Fetches from /api/v1/shares/{token}/preview
  ↓
  ✅ SUCCESS: Backend decrypts and serves with inline header
```

## Files Changed

### frontend/src/components/documents/SharedDocumentPreview.tsx
- **Line 89**: Changed condition from `!keys && sharePassword` to `!keys`
- **Line 91**: Removed `sharePassword` from useEffect dependency array (no longer used)
- **Line 88**: Added comment explaining the logic

## Testing

### Manual Test Steps:
1. Login to application (http://localhost:3011)
2. Upload test files: PNG, DOCX, PDF, CSV
3. Click Share → External
4. Create external share and copy link
5. Open link in incognito browser
6. **Expected Result**: All files display inline (NO downloads)

### Verified File Types:
- ✅ PNG images: Display correctly
- ✅ DOCX files: Preview via Google Docs Viewer
- ✅ PDF files: Display in iframe (no download)
- ✅ CSV files: Display decrypted content
- ✅ TXT files: Display plain text content
- ✅ Excel files: Preview via Google Docs Viewer
- ✅ PowerPoint files: Preview via Google Docs Viewer

## Backend Implementation (Already Complete)

### Content-Disposition Header
All 3 response locations in `backend/app/api/v1/shares.py` include:
```python
headers = {
    "Content-Disposition": f'inline; filename="{document.name}"',  # ✅ Prevents download
    ...
}
```

### Server-Side Decryption
- Decrypted files: `X-Decrypted: true` header
- Encrypted files: Server decrypts before sending
- Unencrypted files: Sent directly with inline header

## Related Commits

1. **d1a286a**: Fixed encryption_salt base64 encoding
2. **8898387**: Complete rewrite of UniversalFileViewer with correct endpoint
3. **54d0d90**: Added Content-Disposition inline header to backend
4. **[THIS COMMIT]**: Fixed SharedDocumentPreview to use UniversalFileViewer for external shares

## Impact

### What This Fixes:
- ❌ Plugin errors → ✅ Correct preview system
- ❌ File downloads → ✅ Inline display
- ❌ Encrypted content shown → ✅ Decrypted content
- ❌ Missing ZIP signatures → ✅ Proper file handling
- ❌ Image load failures → ✅ Correct image display

### What Remains Unchanged:
- ✅ Internal share preview (authenticated users) still uses plugin system
- ✅ Backend encryption/decryption logic unchanged
- ✅ Security model maintained (zero-knowledge for authenticated, server-decrypt for external)
- ✅ All existing functionality preserved

## Conclusion

**Status**: ✅ **CRITICAL FIX COMPLETE**

External share preview now works correctly for ALL file types by:
1. Using the correct preview component (UniversalFileViewer)
2. Fetching from the correct endpoint (/api/v1/shares/{token}/preview)
3. Leveraging server-side decryption for external shares
4. Displaying files inline with `Content-Disposition: inline` header

The fix is a simple 2-line change that corrects the logic for determining which preview system to use based on the presence of user encryption keys.
