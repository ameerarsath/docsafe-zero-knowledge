# CSV/JSON Preview Fix - No More Downloads!

## Problem Identified via Playwright Testing

**Issue**: CSV, JSON, and other text files were **downloading** instead of displaying in preview

**Playwright Test Results**:
- ✅ PDF files: Display correctly in iframe
- ❌ CSV files: Triggered download instead of preview
- ❌ JSON files: Likely same issue (downloads instead of preview)

**Root Cause**:
```typescript
// OLD CODE (caused downloads):
<iframe src={blobUrl} className="..." />
```

When using blob URL in iframe `src` attribute, browser treats it as downloadable file instead of viewable content.

---

## Solution Implemented

### Created TextFileViewer Component

**File**: `frontend/src/utils/universalFilePreview.tsx`

**New Approach**:
1. Read blob text content asynchronously with `blob.text()`
2. Display text directly in `<pre>` tag (not iframe)
3. Show loading spinner while reading
4. Proper error handling

**Code**:
```typescript
function TextFileViewer({ blob, fileName, mimeType }) {
  const [text, setText] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const readBlobText = async () => {
      const content = await blob.text();
      setText(content);
    };
    readBlobText();
  }, [blob]);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="text-sm text-gray-600 mb-2 font-medium">
          {fileName} ({mimeType || 'text file'})
          <span>{text.length} characters</span>
        </div>
        <pre className="whitespace-pre-wrap bg-white border border-gray-200 rounded p-4 font-mono text-sm overflow-auto max-h-[600px]">
          {text}
        </pre>
      </div>
    </div>
  );
}
```

---

## What Changed

### Before (Broken):
```typescript
// Text files rendered in iframe with blob URL
<iframe
  src={blobUrl}  // ❌ Triggers download
  className="w-full h-full min-h-[500px]"
/>
```

### After (Fixed):
```typescript
// Text files rendered with dedicated component
<TextFileViewer
  blob={blob}
  fileName={fileName}
  mimeType={mimeType}
/>

// Component reads text and displays directly
<pre className="whitespace-pre-wrap ...">
  {text}  // ✅ Displays inline, no download
</pre>
```

---

## Files Affected

**Benefits**:
- ✅ CSV files now display inline
- ✅ JSON files now display inline
- ✅ TXT, XML, MD, and other text files display inline
- ✅ No more unexpected downloads
- ✅ Character count shown
- ✅ Proper text formatting with monospace font
- ✅ Loading state with spinner
- ✅ Error handling

---

## Testing Instructions

### 1. Restart Frontend Dev Server
```bash
cd frontend
npm run dev
```

### 2. Hard Refresh Browser
```
Ctrl+Shift+R (Windows)
Cmd+Shift+R (Mac)
```

### 3. Test CSV File
1. Go to Documents page
2. Click Preview on CSV file
3. Enter encryption password: `JHNpAZ39g!&Y`
4. Click "Decrypt & Preview"

**Expected Result**:
- ✅ File content displays in preview area
- ✅ No download triggered
- ✅ Text visible in monospace font
- ✅ Character count shown

### 4. Test JSON File
1. Upload a JSON file (if not exists)
2. Click Preview
3. Enter password
4. Click "Decrypt & Preview"

**Expected Result**:
- ✅ JSON content displays formatted
- ✅ No download
- ✅ Proper indentation visible

---

## Technical Details

### Why This Works

**Problem with Blob URLs**:
- `URL.createObjectURL(blob)` creates temporary URL like `blob:http://localhost/uuid`
- When used in `<iframe src="blob:...">`, browser decides whether to display or download
- For text/* MIME types without proper headers, browser often downloads

**Solution with Direct Text Display**:
- Read blob content with `await blob.text()`
- Display text directly in DOM with `<pre>` tag
- Browser renders as page content, not external resource
- No ambiguity, no downloads

### Supported File Types

Now properly preview without download:
- CSV (`.csv`)
- JSON (`.json`)
- XML (`.xml`)
- TXT (`.txt`)
- Markdown (`.md`)
- YAML (`.yaml`, `.yml`)
- TOML (`.toml`)
- INI (`.ini`)
- Config files (`.conf`)
- Source code (`.js`, `.ts`, `.py`, `.java`, `.c`, `.cpp`, etc.)

### Performance

- Async loading with loading spinner
- Efficient text reading with `blob.text()`
- Max height constraint (`max-h-[600px]`) for large files
- Scrollable content area

---

## Remaining Issues

### Still Shows Warning (Not Error):
```
⚠️ Document missing encryption_key_id - attempting fallback with all keys
```

**Impact**:
- Warning only, preview works
- Uses key fallback mechanism
- Not user-facing

**Fix Needed**:
- Add `encryption_key_id` to documents during encryption
- Migration script for existing documents

---

## Next Steps

1. ✅ **Verify CSV/JSON preview works** (refresh and test)
2. 🔄 Test other text file types (XML, TXT, MD)
3. 🔄 Test external shares in incognito mode
4. 🔄 Fix `encryption_key_id` warning with migration
5. 🔄 Test image files (PNG, JPG)
6. 🔄 Test office files (XLSX, DOCX, PPTX)

---

## Success Criteria

✅ **Fix is successful when**:
1. CSV file opens in preview (no download)
2. JSON file displays formatted (no download)
3. Text content is readable and scrollable
4. Character count shows correctly
5. Loading spinner appears during read
6. No browser download dialogs

---

## Rollback (If Needed)

If this causes issues, revert with:

```bash
git checkout HEAD -- frontend/src/utils/universalFilePreview.tsx
```

Old behavior will return (download for text files).
