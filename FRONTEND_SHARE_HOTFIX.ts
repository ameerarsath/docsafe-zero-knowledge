// HOTFIX: Frontend Share Preview Component
// Add this to SharedDocumentPreview.tsx

const loadPreview = useCallback(async () => {
  // ... existing code ...
  
  // Use server-side preview endpoint
  const previewResponse = await fetch(previewUrl, {
    method: 'GET',
    headers: { 'Accept': 'application/octet-stream, */*' }
  });

  if (previewResponse.ok) {
    const requiresDecryption = previewResponse.headers.get('X-Requires-Decryption') === 'true';
    
    if (!requiresDecryption) {
      // CRITICAL FIX: Process unencrypted files through plugin system
      const blob = await previewResponse.blob();
      const originalMimeType = previewResponse.headers.get('X-Original-Mime-Type') || document.mime_type;
      
      // Use plugin system for proper preview
      const previewResult = await getDocumentPreview(
        blob, 
        document.name, 
        originalMimeType,
        { metadata: { isSharedDocument: true } }
      );
      
      updateState({
        pluginResult: previewResult,
        isLoading: false,
        error: null
      });
      return;
    }
    
    // Handle encrypted files (existing logic)
    // ...
  }
}, [/* dependencies */]);