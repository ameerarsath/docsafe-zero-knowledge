# Diagnostic Guide for Universal File Preview Issues

## Current Status Analysis

Based on code inspection, the implementation appears **correct** but you're reporting errors. Here's what I found:

### ✅ Code is Correctly Implemented

1. **`createUniversalFilePreview` function** (universalFilePreview.tsx)
   - ✅ Properly handles 50+ file types
   - ✅ Creates blob URLs correctly
   - ✅ Returns appropriate React elements

2. **Integration in DocumentPreview.tsx**
   - ✅ Line 1190: Calls `createUniversalFilePreview` when `decryptedBlob` is available
   - ✅ Line 1277: Fallback to universal handler if plugin fails
   - ✅ Dependencies in useCallback (line 1569) include `state` and `currentDocument`

3. **Decryption Flow**
   - ✅ documentDecryption.ts returns `{ decryptedBlob, originalFilename, mimeType }`
   - ✅ Multiple locations set `decryptedBlob` in state (lines 494, 563, 761, 851)

### 🔍 What Might Be Wrong

The error "Document preview failed: Error: [object Object]" suggests:

1. **Error object not being serialized properly**
2. **Plugin system might be interferring**
3. **State not updating correctly**

## Manual Diagnostic Steps

### Step 1: Check Browser Console

Open browser console (F12) and look for these log messages:

```
Expected logs after decryption:
✅ "🎯 Decrypted blob available, using UNIVERSAL file handler (bypasses plugins)"
✅ "🌐 Creating universal file preview for: { mimeType, fileName, blobUrl }"

If you DON'T see these logs, the decryptedBlob state isn't being set.
If you DO see these logs but still get errors, the React rendering is failing.
```

### Step 2: Check State in React DevTools

1. Install React DevTools extension
2. Find `DocumentPreview` component
3. Check state object for:
   - `decryptedBlob`: should be a Blob object
   - `decryptedDocumentId`: should match `currentDocument.id`
   - `pluginResult`: should be `null` for universal handler to activate

### Step 3: Verify Decryption Success

Add temporary logging in `documentDecryption.ts` line 361:

```typescript
return {
  decryptedBlob,
  originalFilename: document.name,
  mimeType: document.mime_type || 'application/octet-stream'
};

// ADD THIS:
console.log('🔍 DIAGNOSTIC: Decryption result:', {
  blobType: decryptedBlob.type,
  blobSize: decryptedBlob.size,
  filename: document.name,
  mimeType: document.mime_type
});
```

### Step 4: Check If Plugin System Is Running

The universal handler only runs if `!state.pluginResult`. Check console for:

```
If you see:
"🎯 Calling enhanced getDocumentPreview with client-side processing..."

The plugin system is running FIRST. This is expected, but plugin might be failing
and NOT clearing its result, preventing universal handler from running.
```

## Specific Error Fixes

### Error 1: "Document preview failed: Error: [object Object]"

**Root Cause**: Plugin system error not properly caught/displayed

**Fix**: Ensure errors are serialized in DocumentPreview.tsx catch block (line 1036):

```typescript
} catch (error) {
  console.error('❌ Document preview failed:', error);

  // ENSURE ERROR IS PROPERLY SERIALIZED
  let errorMessage = 'Failed to load document preview';

  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null) {
    // FIX: Serialize object errors
    errorMessage = error.message || JSON.stringify(error);
  }

  updateState({
    error: errorMessage,
    // ... rest
  });
}
```

### Error 2: External share password prompt

**Status**: Already implemented correctly at line 184-258 of DocumentShareDialog.tsx

The code shows:
- Line 188: `encryptionPassword = prompt('Enter encryption password...')`
- Line 266: `encryptionPassword: (isEncrypted && state.settings.shareType === 'external') ? encryptionPassword : undefined`
- Line 269: Password sent to `ShareService.createShare`

**If this is still failing**, check:
1. Is `EncryptedShareService.requiresDecryption(document)` returning true?
2. Is `state.settings.shareType === 'external'` true?
3. Check browser console for the prompt() call

### Error 3: Public share links don't display

**Status**: PublicSharePreview.tsx created at line 1-450

**Route added**: App.tsx line 82: `/external-share/:shareToken`

**Backend endpoint**: external_shares.py line 26: `/metadata` endpoint added

**If still failing**, verify:
1. Backend route is registered in main.py
2. Share link format is `/external-share/{token}` not `/share/{token}`
3. Check network tab for failed API calls

## Quick Test Script

Create this test file: `frontend/test-universal-preview.html`

```html
<!DOCTYPE html>
<html>
<body>
  <h1>Universal File Preview Test</h1>
  <input type="file" id="fileInput" />
  <div id="preview"></div>

  <script>
    document.getElementById('fileInput').addEventListener('change', (e) => {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);

      const ext = file.name.split('.').pop().toLowerCase();
      let preview = '';

      if (['png','jpg','jpeg','gif','svg','webp'].includes(ext)) {
        preview = `<img src="${url}" style="max-width:100%">`;
      } else if (ext === 'pdf') {
        preview = `<iframe src="${url}" style="width:100%;height:600px"></iframe>`;
      } else if (['html','txt','json','xml'].includes(ext)) {
        preview = `<iframe src="${url}" style="width:100%;height:600px"></iframe>`;
      } else {
        preview = `<a href="${url}" download="${file.name}">Download ${file.name}</a>`;
      }

      document.getElementById('preview').innerHTML = preview;
      console.log('Preview created for:', file.name, 'Type:', file.type, 'URL:', url);
    });
  </script>
</body>
</html>
```

Open this file in browser and test if blob URL rendering works at all.

## Next Steps

1. **Open the app in browser** (http://localhost:3005)
2. **Open console** (F12)
3. **Upload and decrypt a file**
4. **Copy ALL console output** and send it to me
5. **Take screenshot** of the error shown in UI

Then I can provide targeted fixes based on actual runtime behavior.
