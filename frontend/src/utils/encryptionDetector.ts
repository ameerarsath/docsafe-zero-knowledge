// Minimal encryption detection
export function isActuallyEncrypted(document: any, fileData?: ArrayBuffer): boolean {
  // Method 1: Check metadata (most reliable)
  if (document.encrypted_dek || document.encryption_key_id) return true;
  
  // Method 2: Check file signature if data available
  if (fileData) {
    const header = new Uint8Array(fileData.slice(0, 8));
    // PDF signature: %PDF
    if (header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46) {
      return false; // Plain PDF
    }
  }
  
  // Fallback to DB flag (unreliable)
  return document.is_encrypted || false;
}

export function safeBase64Decode(str: string): Uint8Array {
  try {
    const binary = atob(str.trim());
    return new Uint8Array(binary.length).map((_, i) => binary.charCodeAt(i));
  } catch {
    throw new Error('Invalid base64 data');
  }
}