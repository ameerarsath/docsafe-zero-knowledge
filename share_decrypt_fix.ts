// Fix for SharedDocumentPreview.tsx - add decryption before processing
const loadSharedDocument = async () => {
  try {
    // 1. Download the shared document
    const blob = await sharePreviewService.downloadSharedDocument(shareToken);
    
    // 2. Check if file needs decryption
    const buffer = await blob.arrayBuffer();
    const isEncrypted = !isValidDocxFile(buffer);
    
    let processedBlob = blob;
    
    if (isEncrypted) {
      console.log('🔐 Document is encrypted, attempting decryption...');
      
      // Get encryption password from share or prompt user
      const password = await getEncryptionPassword();
      
      // Decrypt the content
      const decryptedBuffer = await decryptSharedDocument(buffer, password);
      processedBlob = new Blob([decryptedBuffer], { type: blob.type });
    }
    
    // 3. Process with preview plugins
    const preview = await getDocumentPreview(processedBlob, fileName, mimeType);
    setPreviewData(preview);
    
  } catch (error) {
    console.error('Share preview failed:', error);
  }
};

// Check if buffer is valid DOCX (ZIP format)
function isValidDocxFile(buffer: ArrayBuffer): boolean {
  const header = new Uint8Array(buffer.slice(0, 4));
  return header[0] === 0x50 && header[1] === 0x4B; // ZIP signature "PK"
}

// Decrypt shared document content
async function decryptSharedDocument(buffer: ArrayBuffer, password: string): Promise<ArrayBuffer> {
  // Use your existing decryption logic here
  const { decrypt, deriveKey, base64ToUint8Array } = await import('../utils/encryption');
  
  // Convert buffer to base64 string (assuming it's stored as base64)
  const base64Data = arrayBufferToBase64(buffer);
  
  // Extract IV and auth tag (adjust based on your storage format)
  const { ciphertext, iv, authTag } = parseEncryptedData(base64Data);
  
  // Derive key from password
  const salt = new Uint8Array(32); // Use proper salt from document metadata
  const key = await deriveKey({ password, salt, iterations: 100000 });
  
  // Decrypt
  return await decrypt({ ciphertext, iv, authTag, key });
}