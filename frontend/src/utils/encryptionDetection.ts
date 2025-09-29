/**
 * Encryption Detection Utilities for SecureVault
 * 
 * Provides robust detection of document encryption status to prevent
 * attempting decryption on unencrypted files or vice versa.
 */

import { Document } from '../services/api/documents';

export interface EncryptionDetectionResult {
  isEncrypted: boolean;
  encryptionType: 'zero-knowledge' | 'legacy' | 'none';
  confidence: number; // 0.0 to 1.0
  reason: string;
  metadata: {
    hasDEK: boolean;
    hasLegacyKeys: boolean;
    fileSignature?: string;
    entropy?: number;
  };
}

export interface FileAnalysisResult {
  isKnownFormat: boolean;
  format?: string;
  entropy: number;
  likelyEncrypted: boolean;
  confidence: number;
}

/**
 * Detect encryption status of a document using multiple methods
 */
export async function detectEncryptionStatus(
  document: Document,
  fileData?: ArrayBuffer
): Promise<EncryptionDetectionResult> {
  
  console.log('🔍 Starting encryption detection for document:', document.id);
  
  // Method 1: Check for zero-knowledge encryption metadata (highest confidence)
  if (document.encrypted_dek && document.encryption_iv) {
    console.log('✅ Zero-knowledge encryption detected via DEK metadata');
    return {
      isEncrypted: true,
      encryptionType: 'zero-knowledge',
      confidence: 1.0,
      reason: 'Document has DEK and IV metadata (zero-knowledge encryption)',
      metadata: {
        hasDEK: true,
        hasLegacyKeys: false
      }
    };
  }
  
  // Method 2: Check for legacy encryption metadata (high confidence)
  if (document.encryption_key_id && document.encryption_iv && document.encryption_auth_tag) {
    console.log('✅ Legacy encryption detected via metadata');
    return {
      isEncrypted: true,
      encryptionType: 'legacy',
      confidence: 0.95,
      reason: 'Document has legacy encryption metadata (key_id, IV, auth_tag)',
      metadata: {
        hasDEK: false,
        hasLegacyKeys: true
      }
    };
  }
  
  // Method 3: Analyze file content if available (medium confidence)
  if (fileData) {
    console.log('🔍 Analyzing file content for encryption signatures');
    const contentAnalysis = analyzeFileContent(fileData, document.mime_type);
    
    if (contentAnalysis.isKnownFormat) {
      console.log(`✅ Detected unencrypted ${contentAnalysis.format} file`);
      return {
        isEncrypted: false,
        encryptionType: 'none',
        confidence: contentAnalysis.confidence,
        reason: `Detected ${contentAnalysis.format} file signature - file is unencrypted`,
        metadata: {
          hasDEK: false,
          hasLegacyKeys: false,
          fileSignature: contentAnalysis.format,
          entropy: contentAnalysis.entropy
        }
      };
    }
    
    if (contentAnalysis.likelyEncrypted) {
      console.log('🔐 File content analysis suggests encryption');
      return {
        isEncrypted: true,
        encryptionType: 'legacy', // Assume legacy if no DEK
        confidence: contentAnalysis.confidence,
        reason: `File content analysis suggests encryption (entropy: ${contentAnalysis.entropy.toFixed(2)})`,
        metadata: {
          hasDEK: false,
          hasLegacyKeys: false,
          entropy: contentAnalysis.entropy
        }
      };
    }
  }
  
  // Method 4: Check database flag with low confidence (fallback)
  const dbEncrypted = document.is_encrypted || false;
  console.log(`⚠️ Falling back to database flag: ${dbEncrypted}`);
  
  return {
    isEncrypted: dbEncrypted,
    encryptionType: dbEncrypted ? 'legacy' : 'none',
    confidence: 0.3, // Low confidence - database flags can be wrong
    reason: `Based on database flag (unreliable) - is_encrypted: ${dbEncrypted}`,
    metadata: {
      hasDEK: false,
      hasLegacyKeys: false
    }
  };
}

/**
 * Analyze file content to determine if it's encrypted or a known format
 */
export function analyzeFileContent(data: ArrayBuffer, mimeType?: string): FileAnalysisResult {
  const header = new Uint8Array(data.slice(0, 2048)); // Analyze first 2KB
  
  console.log('🔍 Analyzing file header:', {
    size: data.byteLength,
    headerLength: header.length,
    mimeType,
    firstBytes: Array.from(header.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')
  });
  
  // Check for file signatures (unencrypted files)
  const signatures = {
    'PDF': [0x25, 0x50, 0x44, 0x46], // %PDF
    'ZIP/Office': [0x50, 0x4B, 0x03, 0x04], // ZIP (DOCX, XLSX, etc.)
    'OLE2/Office': [0xD0, 0xCF, 0x11, 0xE0], // OLE2 (DOC, XLS, etc.)
    'JPEG': [0xFF, 0xD8, 0xFF],
    'PNG': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    'GIF87a': [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    'GIF89a': [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
    'BMP': [0x42, 0x4D],
    'TIFF': [0x49, 0x49, 0x2A, 0x00],
    'RTF': [0x7B, 0x5C, 0x72, 0x74, 0x66], // {\rtf
  };
  
  // Check for known file signatures
  for (const [format, signature] of Object.entries(signatures)) {
    if (header.length >= signature.length && 
        signature.every((byte, i) => header[i] === byte)) {
      console.log(`✅ Detected ${format} signature`);
      return { 
        isKnownFormat: true, 
        format, 
        entropy: 0, // Don't need to calculate for known formats
        likelyEncrypted: false,
        confidence: 0.95
      };
    }
  }
  
  // Check for text content (unencrypted)
  if (isLikelyText(header)) {
    console.log('✅ Detected text content');
    return {
      isKnownFormat: true,
      format: 'Text',
      entropy: 0,
      likelyEncrypted: false,
      confidence: 0.9
    };
  }
  
  // Calculate entropy for encrypted data detection
  const entropy = calculateEntropy(header);
  console.log(`📊 Calculated entropy: ${entropy.toFixed(2)}`);
  
  // High entropy suggests encryption
  const likelyEncrypted = entropy > 7.5;
  const confidence = entropy > 7.8 ? 0.9 : entropy > 7.5 ? 0.7 : entropy < 5.0 ? 0.8 : 0.4;
  
  return { 
    isKnownFormat: false, 
    entropy,
    likelyEncrypted,
    confidence
  };
}

/**
 * Check if data appears to be readable text
 */
function isLikelyText(data: Uint8Array): boolean {
  if (data.length < 50) return false;
  
  // Check for common text patterns
  let printableCount = 0;
  let whitespaceCount = 0;
  
  for (let i = 0; i < Math.min(data.length, 500); i++) {
    const byte = data[i];
    
    // Printable ASCII characters
    if ((byte >= 32 && byte <= 126) || byte === 9 || byte === 10 || byte === 13) {
      printableCount++;
      if (byte === 9 || byte === 10 || byte === 13 || byte === 32) {
        whitespaceCount++;
      }
    }
  }
  
  const printableRatio = printableCount / Math.min(data.length, 500);
  const whitespaceRatio = whitespaceCount / printableCount;
  
  // Text should be mostly printable with reasonable whitespace
  return printableRatio > 0.8 && whitespaceRatio > 0.05 && whitespaceRatio < 0.5;
}

/**
 * Calculate Shannon entropy of data
 */
function calculateEntropy(data: Uint8Array): number {
  if (data.length === 0) return 0;
  
  const counts = new Array(256).fill(0);
  for (const byte of data) {
    counts[byte]++;
  }
  
  const length = data.length;
  let entropy = 0;
  
  for (const count of counts) {
    if (count > 0) {
      const p = count / length;
      entropy -= p * Math.log2(p);
    }
  }
  
  return entropy;
}

/**
 * Validate that a document can be safely decrypted
 */
export function validateDecryptionPossible(
  document: Document,
  detectionResult: EncryptionDetectionResult
): { canDecrypt: boolean; reason: string } {
  
  if (!detectionResult.isEncrypted) {
    return {
      canDecrypt: false,
      reason: 'Document is not encrypted - no decryption needed'
    };
  }
  
  if (detectionResult.encryptionType === 'zero-knowledge' && !document.encrypted_dek) {
    return {
      canDecrypt: false,
      reason: 'Zero-knowledge document missing DEK data'
    };
  }
  
  if (detectionResult.encryptionType === 'legacy' && 
      (!document.encryption_key_id || !document.encryption_iv || !document.encryption_auth_tag)) {
    return {
      canDecrypt: false,
      reason: 'Legacy encrypted document missing required metadata'
    };
  }
  
  if (detectionResult.confidence < 0.5) {
    return {
      canDecrypt: false,
      reason: `Low confidence in encryption detection (${(detectionResult.confidence * 100).toFixed(0)}%)`
    };
  }
  
  return {
    canDecrypt: true,
    reason: `Document can be decrypted using ${detectionResult.encryptionType} method`
  };
}

/**
 * Get user-friendly description of encryption status
 */
export function getEncryptionStatusDescription(result: EncryptionDetectionResult): string {
  if (!result.isEncrypted) {
    return `📄 Unencrypted document (${result.reason})`;
  }
  
  const confidencePercent = Math.round(result.confidence * 100);
  const typeDescription = result.encryptionType === 'zero-knowledge' 
    ? 'Zero-Knowledge Encrypted' 
    : 'Legacy Encrypted';
  
  return `🔐 ${typeDescription} (${confidencePercent}% confidence)`;
}

/**
 * Debug function to analyze a document's encryption status
 */
export async function debugDocumentEncryption(
  document: Document,
  fileData?: ArrayBuffer
): Promise<void> {
  console.group(`🔍 Encryption Debug: Document ${document.id}`);
  
  console.log('📄 Document Info:', {
    id: document.id,
    name: document.name,
    mimeType: document.mime_type,
    fileSize: document.file_size
  });
  
  console.log('🏷️ Database Flags:', {
    is_encrypted: document.is_encrypted,
    encrypted_dek: !!document.encrypted_dek,
    encryption_iv: !!document.encryption_iv,
    encryption_key_id: !!document.encryption_key_id,
    encryption_auth_tag: !!document.encryption_auth_tag
  });
  
  if (fileData) {
    console.log('📊 File Analysis:');
    const analysis = analyzeFileContent(fileData, document.mime_type);
    console.log(analysis);
  }
  
  const detection = await detectEncryptionStatus(document, fileData);
  console.log('🎯 Detection Result:', detection);
  
  const validation = validateDecryptionPossible(document, detection);
  console.log('✅ Decryption Validation:', validation);
  
  console.log('📝 Summary:', getEncryptionStatusDescription(detection));
  
  console.groupEnd();
}

// Make debug function available globally for console debugging
if (typeof window !== 'undefined') {
  (window as any).debugDocumentEncryption = debugDocumentEncryption;
}