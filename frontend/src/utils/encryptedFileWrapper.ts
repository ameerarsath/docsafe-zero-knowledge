/**
 * Encrypted File Wrapper Utility
 * 
 * Creates password-protected encrypted files that can only be opened with 
 * the correct decryption password, similar to encrypted ZIP files or password-protected PDFs.
 * 
 * The encrypted file format includes:
 * - Header with metadata and encryption parameters
 * - Salt for password-based key derivation
 * - IV for encryption
 * - Encrypted file content
 * - Authentication tag for integrity verification
 */

import { arrayBufferToBase64, base64ToArrayBuffer } from './encryption';

// File format constants
export const ENCRYPTED_FILE_HEADER = {
  SIGNATURE: 'DOCSAFE_ENC',
  VERSION: 1,
  EXTENSION: '.docsafe'
} as const;

export const ENCRYPTION_CONFIG = {
  ALGORITHM: 'AES-GCM',
  KEY_LENGTH: 256, // bits
  IV_LENGTH: 12, // bytes (96 bits for GCM)
  SALT_LENGTH: 32, // bytes (256 bits)
  TAG_LENGTH: 16, // bytes (128 bits for GCM)
  PBKDF2_ITERATIONS: 100000
} as const;

export interface EncryptedFileHeader {
  signature: string;
  version: number;
  originalFilename: string;
  originalMimeType: string;
  originalSize: number;
  encryptedSize: number;
  salt: Uint8Array;
  iv: Uint8Array;
  createdAt: string;
}

export interface EncryptedFileWrapper {
  header: EncryptedFileHeader;
  encryptedContent: Uint8Array;
  authTag: Uint8Array;
  wrappedData: Uint8Array; // Complete encrypted file data
}

/**
 * Derive encryption key from password using PBKDF2
 */
async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Import password as key material
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Derive AES key using PBKDF2
  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: ENCRYPTION_CONFIG.PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    {
      name: ENCRYPTION_CONFIG.ALGORITHM,
      length: ENCRYPTION_CONFIG.KEY_LENGTH
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Create encrypted file wrapper with password protection
 */
export async function createEncryptedFileWrapper(
  fileData: ArrayBuffer,
  originalFilename: string,
  originalMimeType: string,
  password: string
): Promise<EncryptedFileWrapper> {
  try {
    // Generate random salt and IV
    const salt = window.crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.SALT_LENGTH));
    const iv = window.crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.IV_LENGTH));
    
    // Derive encryption key from password
    const encryptionKey = await deriveKeyFromPassword(password, salt);
    
    // Encrypt the file content
    const encryptedResult = await window.crypto.subtle.encrypt(
      {
        name: ENCRYPTION_CONFIG.ALGORITHM,
        iv: iv,
        tagLength: ENCRYPTION_CONFIG.TAG_LENGTH * 8 // Convert to bits
      },
      encryptionKey,
      fileData
    );
    
    // Split encrypted result into content and auth tag
    const encryptedContent = new Uint8Array(encryptedResult.slice(0, -ENCRYPTION_CONFIG.TAG_LENGTH));
    const authTag = new Uint8Array(encryptedResult.slice(-ENCRYPTION_CONFIG.TAG_LENGTH));
    
    // Create header
    const header: EncryptedFileHeader = {
      signature: ENCRYPTED_FILE_HEADER.SIGNATURE,
      version: ENCRYPTED_FILE_HEADER.VERSION,
      originalFilename,
      originalMimeType,
      originalSize: fileData.byteLength,
      encryptedSize: encryptedContent.length,
      salt,
      iv,
      createdAt: new Date().toISOString()
    };
    
    // Serialize header to JSON
    const headerJson = JSON.stringify({
      signature: header.signature,
      version: header.version,
      originalFilename: header.originalFilename,
      originalMimeType: header.originalMimeType,
      originalSize: header.originalSize,
      encryptedSize: header.encryptedSize,
      salt: arrayBufferToBase64(salt.buffer),
      iv: arrayBufferToBase64(iv.buffer),
      createdAt: header.createdAt
    });
    
    const headerBytes = new TextEncoder().encode(headerJson);
    const headerLength = headerBytes.length;
    
    // Create the wrapped data structure:
    // [4 bytes: header length][header JSON][encrypted content][auth tag]
    const wrappedData = new Uint8Array(
      4 + // header length (uint32)
      headerLength + // header JSON
      encryptedContent.length + // encrypted content
      authTag.length // auth tag
    );
    
    let offset = 0;
    
    // Write header length (little-endian uint32)
    new DataView(wrappedData.buffer).setUint32(offset, headerLength, true);
    offset += 4;
    
    // Write header
    wrappedData.set(headerBytes, offset);
    offset += headerLength;
    
    // Write encrypted content
    wrappedData.set(encryptedContent, offset);
    offset += encryptedContent.length;
    
    // Write auth tag
    wrappedData.set(authTag, offset);
    
    return {
      header,
      encryptedContent,
      authTag,
      wrappedData
    };
    
  } catch (error) {
    throw new Error(`Failed to create encrypted file wrapper: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse encrypted file wrapper
 */
export function parseEncryptedFileWrapper(wrappedData: Uint8Array): {
  header: EncryptedFileHeader;
  encryptedContent: Uint8Array;
  authTag: Uint8Array;
} {
  try {
    if (wrappedData.length < 4) {
      throw new Error('Invalid encrypted file: too short');
    }
    
    let offset = 0;
    
    // Read header length
    const headerLength = new DataView(wrappedData.buffer, wrappedData.byteOffset).getUint32(offset, true);
    offset += 4;
    
    if (offset + headerLength > wrappedData.length) {
      throw new Error('Invalid encrypted file: header extends beyond file');
    }
    
    // Read and parse header
    const headerBytes = wrappedData.slice(offset, offset + headerLength);
    const headerJson = new TextDecoder().decode(headerBytes);
    const parsedHeader = JSON.parse(headerJson);
    
    // Validate signature
    if (parsedHeader.signature !== ENCRYPTED_FILE_HEADER.SIGNATURE) {
      throw new Error('Invalid encrypted file: unrecognized signature');
    }
    
    // Reconstruct header with proper types
    const header: EncryptedFileHeader = {
      signature: parsedHeader.signature,
      version: parsedHeader.version,
      originalFilename: parsedHeader.originalFilename,
      originalMimeType: parsedHeader.originalMimeType,
      originalSize: parsedHeader.originalSize,
      encryptedSize: parsedHeader.encryptedSize,
      salt: new Uint8Array(base64ToArrayBuffer(parsedHeader.salt)),
      iv: new Uint8Array(base64ToArrayBuffer(parsedHeader.iv)),
      createdAt: parsedHeader.createdAt
    };
    
    offset += headerLength;
    
    // Calculate expected content and tag lengths
    const expectedContentLength = header.encryptedSize;
    const expectedTagLength = ENCRYPTION_CONFIG.TAG_LENGTH;
    const expectedTotalLength = offset + expectedContentLength + expectedTagLength;
    
    if (wrappedData.length !== expectedTotalLength) {
      throw new Error(`Invalid encrypted file: expected ${expectedTotalLength} bytes, got ${wrappedData.length}`);
    }
    
    // Extract encrypted content and auth tag
    const encryptedContent = wrappedData.slice(offset, offset + expectedContentLength);
    const authTag = wrappedData.slice(offset + expectedContentLength);
    
    return {
      header,
      encryptedContent,
      authTag
    };
    
  } catch (error) {
    throw new Error(`Failed to parse encrypted file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt encrypted file wrapper with password
 */
export async function decryptEncryptedFileWrapper(
  wrappedData: Uint8Array,
  password: string
): Promise<{
  decryptedData: ArrayBuffer;
  originalFilename: string;
  originalMimeType: string;
}> {
  try {
    // Parse the wrapped file
    const { header, encryptedContent, authTag } = parseEncryptedFileWrapper(wrappedData);
    
    // Derive decryption key from password
    const decryptionKey = await deriveKeyFromPassword(password, header.salt);
    
    // Reconstruct the encrypted data for Web Crypto API (content + tag)
    const encryptedDataWithTag = new Uint8Array(encryptedContent.length + authTag.length);
    encryptedDataWithTag.set(encryptedContent);
    encryptedDataWithTag.set(authTag, encryptedContent.length);
    
    // Decrypt the content
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: ENCRYPTION_CONFIG.ALGORITHM,
        iv: header.iv,
        tagLength: ENCRYPTION_CONFIG.TAG_LENGTH * 8 // Convert to bits
      },
      decryptionKey,
      encryptedDataWithTag.buffer
    );
    
    // Verify decrypted size matches expected size
    if (decryptedData.byteLength !== header.originalSize) {
      throw new Error(`Decrypted size mismatch: expected ${header.originalSize}, got ${decryptedData.byteLength}`);
    }
    
    return {
      decryptedData,
      originalFilename: header.originalFilename,
      originalMimeType: header.originalMimeType
    };
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('OperationError')) {
      throw new Error('Incorrect password or corrupted file');
    }
    throw new Error(`Failed to decrypt file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if a file is an encrypted DocSafe file
 */
export function isEncryptedDocSafeFile(data: Uint8Array): boolean {
  try {
    if (data.length < 4) return false;
    
    // Read header length
    const headerLength = new DataView(data.buffer, data.byteOffset).getUint32(0, true);
    if (headerLength > data.length - 4) return false;
    
    // Read header
    const headerBytes = data.slice(4, 4 + headerLength);
    const headerJson = new TextDecoder().decode(headerBytes);
    const parsedHeader = JSON.parse(headerJson);
    
    return parsedHeader.signature === ENCRYPTED_FILE_HEADER.SIGNATURE;
  } catch {
    return false;
  }
}

/**
 * Get encrypted file info without decrypting
 */
export function getEncryptedFileInfo(wrappedData: Uint8Array): {
  originalFilename: string;
  originalMimeType: string;
  originalSize: number;
  createdAt: string;
} {
  const { header } = parseEncryptedFileWrapper(wrappedData);
  return {
    originalFilename: header.originalFilename,
    originalMimeType: header.originalMimeType,
    originalSize: header.originalSize,
    createdAt: header.createdAt
  };
}