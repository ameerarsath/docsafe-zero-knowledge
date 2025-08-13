/**
 * Document Encryption Key (DEK) Management Utilities
 * 
 * This module implements the DEK-per-document architecture for zero-knowledge encryption:
 * - Each document has its own unique encryption key (DEK)
 * - DEKs are encrypted with the user's master key before storage
 * - Only the user can decrypt their document DEKs
 * - Provides secure key rotation and sharing capabilities
 */

import {
  generateRandomBytes,
  encrypt,
  decrypt,
  encryptText,
  decryptText,
  uint8ArrayToBase64,
  base64ToUint8Array,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  isWebCryptoSupported,
  EncryptionError,
  DecryptionError,
  ENCRYPTION_CONFIG
} from './encryption';

// DEK configuration
export const DEK_CONFIG = {
  KEY_LENGTH: 32, // 256 bits
  ALGORITHM: 'AES-GCM',
  DEK_IDENTIFIER_PREFIX: 'dek:',
  VERSION: 1
} as const;

// Type definitions
export interface DEKInfo {
  dekId: string;
  encryptedDek: string; // Base64 encoded encrypted DEK
  dekIv: string; // Base64 encoded IV used to encrypt the DEK
  dekAuthTag: string; // Base64 encoded auth tag for DEK encryption
  algorithm: string;
  keyLength: number;
  version: number;
  createdAt: string;
}

export interface DocumentEncryptionData {
  ciphertext: string; // Base64 encoded
  iv: string; // Base64 encoded
  authTag: string; // Base64 encoded
  dekInfo: DEKInfo;
}

export interface DEKDecryptionResult {
  dek: CryptoKey;
  dekId: string;
}

/**
 * Error classes for DEK operations
 */
export class DEKError extends EncryptionError {
  constructor(message: string) {
    super(message, 'DEK_ERROR');
  }
}

export class DEKGenerationError extends DEKError {
  constructor(message: string) {
    super(`DEK generation failed: ${message}`);
  }
}

export class DEKDecryptionError extends DEKError {
  constructor(message: string) {
    super(`DEK decryption failed: ${message}`);
  }
}

/**
 * Generate a unique DEK identifier
 */
export function generateDEKId(): string {
  const timestamp = Date.now().toString(36);
  const randomBytes = generateRandomBytes(8);
  const randomString = uint8ArrayToBase64(randomBytes).replace(/[+/=]/g, '').substring(0, 12);
  return `${DEK_CONFIG.DEK_IDENTIFIER_PREFIX}${timestamp}_${randomString}`;
}

/**
 * Generate a new Document Encryption Key (DEK)
 */
export async function generateDEK(): Promise<CryptoKey> {
  if (!isWebCryptoSupported()) {
    throw new DEKGenerationError('Web Crypto API not supported');
  }

  try {
    // Generate a new AES-256-GCM key for document encryption
    const dek = await window.crypto.subtle.generateKey(
      {
        name: DEK_CONFIG.ALGORITHM,
        length: DEK_CONFIG.KEY_LENGTH * 8 // Convert bytes to bits
      },
      true, // extractable for encryption with master key
      ['encrypt', 'decrypt']
    );

    return dek;
  } catch (error) {
    throw new DEKGenerationError(`Failed to generate DEK: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Encrypt a DEK with the user's master key
 */
export async function encryptDEK(
  dek: CryptoKey,
  masterKey: CryptoKey,
  dekId?: string
): Promise<DEKInfo> {
  if (!isWebCryptoSupported()) {
    throw new DEKError('Web Crypto API not supported');
  }

  try {
    // Export the DEK as raw bytes
    const dekBytes = await window.crypto.subtle.exportKey('raw', dek);
    
    // Encrypt the DEK with the master key
    const encryptionResult = await encrypt(dekBytes, masterKey);
    
    // Generate DEK identifier if not provided
    const finalDekId = dekId || generateDEKId();
    
    return {
      dekId: finalDekId,
      encryptedDek: encryptionResult.ciphertext,
      dekIv: encryptionResult.iv,
      dekAuthTag: encryptionResult.authTag,
      algorithm: DEK_CONFIG.ALGORITHM,
      keyLength: DEK_CONFIG.KEY_LENGTH,
      version: DEK_CONFIG.VERSION,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    throw new DEKError(`Failed to encrypt DEK: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt a DEK with the user's master key
 */
export async function decryptDEK(
  dekInfo: DEKInfo,
  masterKey: CryptoKey
): Promise<DEKDecryptionResult> {
  if (!isWebCryptoSupported()) {
    throw new DEKDecryptionError('Web Crypto API not supported');
  }

  try {
    // Decrypt the DEK bytes
    const dekBytes = await decrypt({
      ciphertext: dekInfo.encryptedDek,
      iv: dekInfo.dekIv,
      authTag: dekInfo.dekAuthTag,
      key: masterKey
    });

    // Import the decrypted bytes as a CryptoKey
    const dek = await window.crypto.subtle.importKey(
      'raw',
      dekBytes,
      {
        name: dekInfo.algorithm,
        length: dekInfo.keyLength * 8
      },
      false, // not extractable for security
      ['encrypt', 'decrypt']
    );

    return {
      dek,
      dekId: dekInfo.dekId
    };
  } catch (error) {
    throw new DEKDecryptionError(`Failed to decrypt DEK: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse DEK info from stored JSON string with enhanced validation
 */
export function parseDEKInfo(dekInfoString: string): DEKInfo {
  try {
    console.log('🔧 Parsing DEK info:', {
      stringLength: dekInfoString?.length,
      stringStart: dekInfoString?.substring(0, 100) + '...'
    });
    
    // Validate input
    if (!dekInfoString || typeof dekInfoString !== 'string') {
      throw new Error('DEK info string is empty or invalid');
    }
    
    // Parse JSON with error handling
    let dekInfo: any;
    try {
      dekInfo = JSON.parse(dekInfoString);
    } catch (jsonError) {
      throw new Error(`Invalid JSON format: ${jsonError instanceof Error ? jsonError.message : 'Unknown JSON error'}`);
    }
    
    if (!dekInfo || typeof dekInfo !== 'object') {
      throw new Error('Parsed DEK info is not a valid object');
    }
    
    // Validate required fields with detailed reporting
    const requiredFields = ['dekId', 'encryptedDek', 'dekIv', 'dekAuthTag', 'algorithm'];
    const missingFields: string[] = [];
    const invalidFields: string[] = [];
    
    for (const field of requiredFields) {
      if (!dekInfo[field]) {
        missingFields.push(field);
      } else if (typeof dekInfo[field] !== 'string') {
        invalidFields.push(`${field} (type: ${typeof dekInfo[field]})`);
      }
    }
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    if (invalidFields.length > 0) {
      throw new Error(`Invalid field types: ${invalidFields.join(', ')}`);
    }
    
    // Validate base64 fields
    const base64Fields = ['encryptedDek', 'dekIv', 'dekAuthTag'];
    for (const field of base64Fields) {
      const value = dekInfo[field];
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
        throw new Error(`Field ${field} contains invalid base64 data`);
      }
    }
    
    console.log('✅ DEK info parsed successfully:', {
      dekId: dekInfo.dekId,
      algorithm: dekInfo.algorithm,
      version: dekInfo.version,
      createdAt: dekInfo.createdAt
    });
    
    return dekInfo as DEKInfo;
  } catch (error) {
    console.error('❌ DEK parsing failed:', error);
    throw new DEKError(`Failed to parse DEK info: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
  }
}

/**
 * Serialize DEK info to JSON string for storage
 */
export function serializeDEKInfo(dekInfo: DEKInfo): string {
  return JSON.stringify(dekInfo);
}

/**
 * Encrypt document data with a DEK
 */
export async function encryptDocumentWithDEK(
  documentData: ArrayBuffer,
  dek: CryptoKey,
  dekInfo: DEKInfo
): Promise<DocumentEncryptionData> {
  try {
    const encryptionResult = await encrypt(documentData, dek);
    
    return {
      ciphertext: encryptionResult.ciphertext,
      iv: encryptionResult.iv,
      authTag: encryptionResult.authTag,
      dekInfo
    };
  } catch (error) {
    throw new EncryptionError(
      `Failed to encrypt document with DEK: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'DOCUMENT_ENCRYPTION_FAILED'
    );
  }
}

/**
 * Decrypt document data with a DEK
 */
export async function decryptDocumentWithDEK(
  encryptionData: {
    ciphertext: string;
    iv: string;
    authTag: string;
  },
  dek: CryptoKey
): Promise<ArrayBuffer> {
  try {
    return await decrypt({
      ciphertext: encryptionData.ciphertext,
      iv: encryptionData.iv,
      authTag: encryptionData.authTag,
      key: dek
    });
  } catch (error) {
    throw new DecryptionError(
      `Failed to decrypt document with DEK: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Create a new document encryption setup (generate DEK and encrypt with master key)
 */
export async function createDocumentEncryption(
  documentData: ArrayBuffer,
  masterKey: CryptoKey,
  dekId?: string
): Promise<{
  encryptedDocument: DocumentEncryptionData;
  dekInfo: DEKInfo;
}> {
  try {
    // Generate new DEK
    const dek = await generateDEK();
    
    // Encrypt DEK with master key
    const dekInfo = await encryptDEK(dek, masterKey, dekId);
    
    // Encrypt document with DEK
    const encryptedDocument = await encryptDocumentWithDEK(documentData, dek, dekInfo);
    
    return {
      encryptedDocument,
      dekInfo
    };
  } catch (error) {
    throw new DEKError(
      `Failed to create document encryption: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Decrypt a document using stored DEK info and master key
 */
export async function decryptDocumentWithMasterKey(
  encryptionData: {
    ciphertext: string;
    iv: string;
    authTag: string;
  },
  dekInfoString: string,
  masterKey: CryptoKey
): Promise<ArrayBuffer> {
  try {
    // Parse DEK info
    const dekInfo = parseDEKInfo(dekInfoString);
    
    // Decrypt DEK with master key
    const { dek } = await decryptDEK(dekInfo, masterKey);
    
    // Decrypt document with DEK
    return await decryptDocumentWithDEK(encryptionData, dek);
  } catch (error) {
    throw new DecryptionError(
      `Failed to decrypt document: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Re-encrypt a DEK with a new master key (for key rotation)
 */
export async function reencryptDEK(
  dekInfo: DEKInfo,
  oldMasterKey: CryptoKey,
  newMasterKey: CryptoKey
): Promise<DEKInfo> {
  try {
    // Decrypt DEK with old master key
    const { dek } = await decryptDEK(dekInfo, oldMasterKey);
    
    // Encrypt DEK with new master key
    const newDekInfo = await encryptDEK(dek, newMasterKey, dekInfo.dekId);
    
    // Preserve original metadata
    return {
      ...newDekInfo,
      createdAt: dekInfo.createdAt, // Keep original creation time
      version: dekInfo.version + 1 // Increment version
    };
  } catch (error) {
    throw new DEKError(
      `Failed to re-encrypt DEK: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validate DEK info structure and data
 */
export function validateDEKInfo(dekInfo: DEKInfo): string[] {
  const errors: string[] = [];
  
  if (!dekInfo.dekId || !dekInfo.dekId.startsWith(DEK_CONFIG.DEK_IDENTIFIER_PREFIX)) {
    errors.push('Invalid DEK ID format');
  }
  
  if (!dekInfo.encryptedDek) {
    errors.push('Missing encrypted DEK data');
  }
  
  if (!dekInfo.dekIv || !dekInfo.dekAuthTag) {
    errors.push('Missing DEK encryption parameters');
  }
  
  if (dekInfo.algorithm !== DEK_CONFIG.ALGORITHM) {
    errors.push(`Unsupported algorithm: ${dekInfo.algorithm}`);
  }
  
  if (dekInfo.keyLength !== DEK_CONFIG.KEY_LENGTH) {
    errors.push(`Invalid key length: ${dekInfo.keyLength}`);
  }
  
  try {
    // Validate base64 encoding
    base64ToUint8Array(dekInfo.encryptedDek);
    base64ToUint8Array(dekInfo.dekIv);
    base64ToUint8Array(dekInfo.dekAuthTag);
  } catch {
    errors.push('Invalid base64 encoding in DEK data');
  }
  
  return errors;
}

/**
 * Get DEK statistics for debugging/monitoring
 */
export function getDEKStats(dekInfo: DEKInfo): {
  dekId: string;
  algorithm: string;
  keyLength: number;
  version: number;
  createdAt: string;
  encryptedSize: number;
} {
  return {
    dekId: dekInfo.dekId,
    algorithm: dekInfo.algorithm,
    keyLength: dekInfo.keyLength,
    version: dekInfo.version,
    createdAt: dekInfo.createdAt,
    encryptedSize: base64ToUint8Array(dekInfo.encryptedDek).length
  };
}

/**
 * Test DEK functionality
 */
export async function testDEKFunctionality(): Promise<boolean> {
  try {
    if (!isWebCryptoSupported()) {
      return false;
    }
    
    // Generate a master key for testing
    const masterKey = await window.crypto.subtle.generateKey(
      {
        name: ENCRYPTION_CONFIG.ALGORITHM,
        length: ENCRYPTION_CONFIG.KEY_LENGTH
      },
      false,
      ['encrypt', 'decrypt']
    );
    
    // Test document data
    const testData = new TextEncoder().encode('Test document content for DEK testing');
    
    // Create document encryption
    const { encryptedDocument, dekInfo } = await createDocumentEncryption(
      testData.buffer,
      masterKey
    );
    
    // Decrypt document
    const decryptedData = await decryptDocumentWithMasterKey(
      {
        ciphertext: encryptedDocument.ciphertext,
        iv: encryptedDocument.iv,
        authTag: encryptedDocument.authTag
      },
      serializeDEKInfo(dekInfo),
      masterKey
    );
    
    // Verify decrypted data matches original
    const decryptedText = new TextDecoder().decode(decryptedData);
    return decryptedText === 'Test document content for DEK testing';
  } catch {
    return false;
  }
}