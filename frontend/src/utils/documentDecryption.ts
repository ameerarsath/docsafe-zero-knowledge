/**
 * Document Decryption Utilities for Zero-Knowledge Architecture
 *
 * Provides Web Crypto API implementations for client-side document decryption:
 * - KEK derivation from password
 * - DEK unwrapping using KEK
 * - Document decryption using DEK
 * - Support for both base64 JSON and direct encrypted_dek formats
 */

import { deriveKey, base64ToUint8Array, base64ToArrayBuffer } from './encryption';

// Types
export interface Document {
  id: number;
  name: string;
  mime_type?: string;
  file_size?: number;
  encrypted_dek?: string;
  encryption_iv?: string;
  encryption_auth_tag?: string;
  encryption_salt?: string;
  encryption_algorithm?: string;
}

export interface DecryptionParams {
  encryptedBlob: Blob;
  document: Document;
  encryptionPassword: string;
  userSalt?: string; // User's encryption key salt (if not in document)
  iterations?: number; // PBKDF2 iterations (CRITICAL: must match encryption!)
}

export interface DecryptionResult {
  decryptedBlob: Blob;
  originalFilename: string;
  mimeType: string;
}

/**
 * Error class for decryption failures
 */
export class DocumentDecryptionError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DocumentDecryptionError';
  }
}

/**
 * Parse and validate encrypted DEK metadata
 * Handles both formats:
 * 1. Base64-encoded JSON: "eyJjaXBoZXJ0ZXh0Ij..." (from useEncryption hook)
 * 2. Direct ciphertext string: "abc123..." (from database)
 */
function parseEncryptedDEK(encryptedDekString: string): {
  ciphertext: string;
  iv: string;
  authTag: string;
  algorithm: string;
} {
  try {
    // Check if it's base64-encoded JSON
    if (/^[A-Za-z0-9+/]+=*$/.test(encryptedDekString)) {
      console.log('🔍 DEK appears to be base64-encoded JSON, decoding...');
      try {
        const decoded = atob(encryptedDekString);
        const dekInfo = JSON.parse(decoded);

        if (dekInfo.ciphertext && dekInfo.iv && dekInfo.authTag) {
          console.log('✅ Successfully parsed base64 JSON DEK format');
          return {
            ciphertext: dekInfo.ciphertext,
            iv: dekInfo.iv,
            authTag: dekInfo.authTag,
            algorithm: dekInfo.algorithm || 'AES-256-GCM'
          };
        }
      } catch (e) {
        console.warn('⚠️ Base64 decode failed, treating as direct ciphertext');
      }
    }

    // If not JSON or decode failed, treat as direct ciphertext
    // In this case, IV and auth tag should be in document fields
    throw new DocumentDecryptionError(
      'DEK is direct ciphertext format, but IV/authTag must be provided separately',
      'DEK_PARSE_DIRECT_FORMAT'
    );
  } catch (error) {
    throw new DocumentDecryptionError(
      `Failed to parse encrypted DEK: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'DEK_PARSE_FAILED'
    );
  }
}

/**
 * Derive KEK (Key Encryption Key) from password and decrypt DEK
 */
async function unwrapDEK(
  encryptedDekString: string,
  password: string,
  salt: string,
  iterations: number = 100000
): Promise<CryptoKey> {
  console.log('🔑 ========== UNWRAPPING DEK (DEBUG MODE) ==========');
  console.log('🔍 Input Parameters:', {
    passwordLength: password?.length,
    saltLength: salt?.length,
    iterations,
    encryptedDekStringLength: encryptedDekString?.length
  });

  try {
    // Parse encrypted DEK metadata
    const dekInfo = parseEncryptedDEK(encryptedDekString);
    console.log('📋 Parsed DEK Info:', {
      algorithm: dekInfo.algorithm,
      ciphertextLength: dekInfo.ciphertext?.length,
      ivLength: dekInfo.iv?.length,
      authTagLength: dekInfo.authTag?.length
    });

    // Derive KEK from password
    console.log('🔑 Deriving KEK from password...');
    console.log('🔍 KEK Derivation Parameters:', {
      passwordLength: password.length,
      saltBase64: salt.substring(0, 20) + '...',
      saltBytesLength: 'calculating...',
      iterations
    });

    const saltBytes = base64ToUint8Array(salt);
    console.log('🔍 Salt bytes length:', saltBytes.length);

    const kek = await deriveKey({ password, salt: saltBytes, iterations });
    console.log('✅ KEK derived successfully');

    // Prepare DEK ciphertext and auth tag
    const dekCiphertext = base64ToUint8Array(dekInfo.ciphertext);
    const dekIv = base64ToUint8Array(dekInfo.iv);
    const dekAuthTag = base64ToUint8Array(dekInfo.authTag);

    // WebCrypto expects ciphertext + auth tag appended
    const encryptedDekData = new Uint8Array(dekCiphertext.length + dekAuthTag.length);
    encryptedDekData.set(dekCiphertext);
    encryptedDekData.set(dekAuthTag, dekCiphertext.length);

    console.log(`🔓 Decrypting DEK (${encryptedDekData.length} bytes)...`);

    // Decrypt DEK using KEK
    const dekBytes = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: dekIv },
      kek,
      encryptedDekData
    );

    console.log('✅ DEK decrypted successfully');

    // Import DEK as CryptoKey
    const dek = await window.crypto.subtle.importKey(
      'raw',
      dekBytes,
      'AES-GCM',
      false,
      ['decrypt']
    );

    console.log('✅ DEK imported as CryptoKey');
    return dek;

  } catch (error) {
    if (error instanceof DOMException && error.name === 'OperationError') {
      throw new DocumentDecryptionError(
        'Failed to decrypt DEK - incorrect password or corrupted data',
        'DEK_DECRYPT_FAILED'
      );
    }
    throw new DocumentDecryptionError(
      `DEK unwrap failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'DEK_UNWRAP_FAILED'
    );
  }
}

/**
 * Decrypt document content using DEK
 */
async function decryptDocumentWithDEK(
  encryptedData: ArrayBuffer,
  dek: CryptoKey,
  iv: string,
  authTag?: string,
  originalSize?: number
): Promise<ArrayBuffer> {
  console.log('🔓 Decrypting document with DEK...');

  try {
    const encryptedArray = new Uint8Array(encryptedData);
    const ivBytes = base64ToUint8Array(iv);

    // Handle auth tag: separate field or appended
    let ciphertext: Uint8Array;
    let authTagBytes: Uint8Array;

    if (authTag) {
      // Auth tag provided separately in metadata
      console.log('📋 Using separate auth tag from metadata');
      authTagBytes = base64ToUint8Array(authTag);

      // CRITICAL FIX: The encrypted file still has the auth tag appended!
      // We need to strip it off before using metadata auth tag
      const authTagLength = authTagBytes.length;  // Should be 16 bytes
      if (encryptedArray.length > authTagLength) {
        console.log(`🔧 Stripping ${authTagLength}-byte auth tag from encrypted data`);
        ciphertext = encryptedArray.slice(0, encryptedArray.length - authTagLength);
      } else {
        console.warn('⚠️ Encrypted data too small to contain embedded auth tag, using as-is');
        ciphertext = encryptedArray;
      }
    } else {
      // Auth tag appended to ciphertext (last 16 bytes for AES-GCM)
      const authTagLength = 16;

      // Try to use original size to calculate split point
      if (originalSize && originalSize > 0) {
        const calculatedAuthTagLength = encryptedArray.length - originalSize;
        if (calculatedAuthTagLength >= 12 && calculatedAuthTagLength <= 32) {
          console.log(`📋 Using calculated auth tag length: ${calculatedAuthTagLength} bytes`);
          ciphertext = encryptedArray.slice(0, originalSize);
          authTagBytes = encryptedArray.slice(originalSize);
        } else {
          console.log('⚠️ Calculated auth tag length invalid, using standard 16 bytes');
          ciphertext = encryptedArray.slice(0, -authTagLength);
          authTagBytes = encryptedArray.slice(-authTagLength);
        }
      } else {
        console.log('📋 Using standard auth tag length (16 bytes)');
        ciphertext = encryptedArray.slice(0, -authTagLength);
        authTagBytes = encryptedArray.slice(-authTagLength);
      }
    }

    console.log(`📊 Decryption parameters:`, {
      ciphertextLength: ciphertext.length,
      authTagLength: authTagBytes.length,
      ivLength: ivBytes.length,
      totalEncryptedSize: encryptedArray.length
    });

    // Recombine for WebCrypto (expects ciphertext + auth tag)
    const ciphertextWithTag = new Uint8Array(ciphertext.length + authTagBytes.length);
    ciphertextWithTag.set(ciphertext);
    ciphertextWithTag.set(authTagBytes, ciphertext.length);

    // Decrypt
    const decryptedData = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      dek,
      ciphertextWithTag
    );

    console.log(`✅ Document decrypted successfully (${decryptedData.byteLength} bytes)`);
    return decryptedData;

  } catch (error) {
    if (error instanceof DOMException && error.name === 'OperationError') {
      throw new DocumentDecryptionError(
        'Document decryption failed - data may be corrupted or tampered',
        'DOCUMENT_DECRYPT_FAILED'
      );
    }
    throw new DocumentDecryptionError(
      `Document decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'DOCUMENT_DECRYPT_ERROR'
    );
  }
}

/**
 * Main function: Decrypt zero-knowledge encrypted document
 *
 * Complete flow:
 * 1. Derive KEK from password
 * 2. Unwrap DEK using KEK
 * 3. Decrypt document using DEK
 * 4. Return decrypted blob
 */
export async function decryptDocumentZeroKnowledge(
  params: DecryptionParams
): Promise<DecryptionResult> {
  const { encryptedBlob, document, encryptionPassword, userSalt, iterations } = params;

  console.log('🚀 Starting zero-knowledge document decryption...');
  console.log(`📄 Document: ${document.name} (ID: ${document.id})`);

  try {
    // Validate required fields
    if (!document.encrypted_dek) {
      throw new DocumentDecryptionError(
        'Document is missing encrypted_dek metadata',
        'MISSING_ENCRYPTED_DEK'
      );
    }

    if (!document.encryption_iv) {
      throw new DocumentDecryptionError(
        'Document is missing encryption_iv metadata',
        'MISSING_ENCRYPTION_IV'
      );
    }

    // Get salt (from document or user encryption key)
    const salt = document.encryption_salt || userSalt;
    if (!salt) {
      throw new DocumentDecryptionError(
        'Cannot derive KEK: salt not available in document or user encryption key',
        'MISSING_SALT'
      );
    }

    // Use provided iterations or default to 100000
    // CRITICAL: This must match the iterations used during encryption!
    const kekIterations = iterations || 100000;
    console.log(`🔑 Using ${kekIterations} PBKDF2 iterations for KEK derivation`);

    console.log('✅ All required metadata present');

    // Step 1: Unwrap DEK
    console.log('📦 Step 1/3: Unwrapping DEK...');
    const dek = await unwrapDEK(
      document.encrypted_dek,
      encryptionPassword,
      salt,
      kekIterations  // CRITICAL FIX: Pass iterations!
    );

    // Step 2: Read encrypted file
    console.log('📦 Step 2/3: Reading encrypted file...');
    const encryptedData = await encryptedBlob.arrayBuffer();
    console.log(`📊 Encrypted file size: ${encryptedData.byteLength} bytes`);

    // Step 3: Decrypt document
    console.log('📦 Step 3/3: Decrypting document...');
    const decryptedData = await decryptDocumentWithDEK(
      encryptedData,
      dek,
      document.encryption_iv,
      document.encryption_auth_tag,
      document.file_size
    );

    // Create decrypted blob
    const decryptedBlob = new Blob([decryptedData], {
      type: document.mime_type || 'application/octet-stream'
    });

    console.log('🎉 Zero-knowledge decryption completed successfully!');

    return {
      decryptedBlob,
      originalFilename: document.name,
      mimeType: document.mime_type || 'application/octet-stream'
    };

  } catch (error) {
    console.error('❌ Zero-knowledge decryption failed:', error);

    if (error instanceof DocumentDecryptionError) {
      throw error;
    }

    throw new DocumentDecryptionError(
      `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'DECRYPTION_FAILED'
    );
  }
}

/**
 * Helper: Download decrypted blob as file
 */
export function downloadDecryptedFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Helper: Create object URL for preview
 */
export function createPreviewURL(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Helper: Revoke object URL to free memory
 */
export function revokePreviewURL(url: string): void {
  URL.revokeObjectURL(url);
}
