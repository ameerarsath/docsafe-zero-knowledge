/**
 * Client-side encryption utilities for SecureVault.
 * 
 * This module provides Web Crypto API integration for:
 * - AES-256-GCM encryption/decryption
 * - PBKDF2 key derivation
 * - Secure random generation
 * - Document encryption workflows
 */

// Encryption configuration constants
export const ENCRYPTION_CONFIG = {
  ALGORITHM: 'AES-GCM',
  KEY_LENGTH: 256, // bits
  IV_LENGTH: 12, // bytes (96 bits for GCM)
  AUTH_TAG_LENGTH: 16, // bytes (128 bits)
  SALT_LENGTH: 32, // bytes
  MIN_ITERATIONS: 100000,
  RECOMMENDED_ITERATIONS: 500000,
  DERIVATION_ALGORITHM: 'PBKDF2'
} as const;

// Type definitions
export interface EncryptionParameters {
  algorithm: string;
  keyDerivation: string;
  iterations: number;
  salt: string;
  keyLength: number;
  ivLength: number;
  authTagLength: number;
}

export interface EncryptionResult {
  ciphertext: string; // base64
  iv: string; // base64
  authTag: string; // base64
  algorithm: string;
}

export interface DecryptionInput {
  ciphertext: string; // base64
  iv: string; // base64
  authTag: string; // base64
  key: CryptoKey;
  aad?: string;
}

export interface KeyDerivationParams {
  password: string;
  salt: Uint8Array;
  iterations: number;
}

export interface ValidationPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
}

/**
 * Error classes for encryption operations
 */
export class EncryptionError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

export class KeyDerivationError extends EncryptionError {
  constructor(message: string) {
    super(message, 'KEY_DERIVATION_ERROR');
  }
}

export class DecryptionError extends EncryptionError {
  constructor(message: string) {
    super(message, 'DECRYPTION_ERROR');
  }
}

/**
 * Check if Web Crypto API is available
 */
export function isWebCryptoSupported(): boolean {
  return typeof window !== 'undefined' && 
         'crypto' in window && 
         'subtle' in window.crypto &&
         typeof window.crypto.subtle.encrypt === 'function';
}

/**
 * Generate cryptographically secure random bytes
 */
export function generateRandomBytes(length: number): Uint8Array {
  if (!isWebCryptoSupported()) {
    throw new EncryptionError('Web Crypto API not supported', 'CRYPTO_NOT_SUPPORTED');
  }
  
  return window.crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(length: number = ENCRYPTION_CONFIG.SALT_LENGTH): Uint8Array {
  return generateRandomBytes(length);
}

/**
 * Generate a random IV for AES-GCM
 */
export function generateIV(): Uint8Array {
  return generateRandomBytes(ENCRYPTION_CONFIG.IV_LENGTH);
}

/**
 * Convert ArrayBuffer to base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  try {
    // Validate and clean base64 string
    if (!base64 || typeof base64 !== 'string') {
      throw new Error('Invalid base64 input: must be a non-empty string');
    }
    
    // Remove any whitespace and validate base64 format
    const cleanBase64 = base64.trim().replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
      throw new Error('Invalid base64 format: contains invalid characters');
    }
    
    const binary = atob(cleanBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (error) {
    if (error instanceof Error) {
      throw new EncryptionError(`Base64 decoding failed: ${error.message}`, 'BASE64_DECODE_ERROR');
    }
    throw new EncryptionError('Base64 decoding failed: Unknown error', 'BASE64_DECODE_ERROR');
  }
}

/**
 * Convert Uint8Array to base64 string
 */
export function uint8ArrayToBase64(array: Uint8Array): string {
  return arrayBufferToBase64(array.buffer);
}

/**
 * Convert base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  return new Uint8Array(base64ToArrayBuffer(base64));
}

/**
 * Derive encryption key from password using PBKDF2
 */
export async function deriveKey(params: KeyDerivationParams): Promise<CryptoKey> {
  if (!isWebCryptoSupported()) {
    throw new KeyDerivationError('Web Crypto API not supported');
  }

  try {
    // Import password as key material
    const passwordKey = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(params.password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // Derive AES key
    const derivedKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: params.salt,
        iterations: params.iterations,
        hash: 'SHA-256'
      },
      passwordKey,
      {
        name: ENCRYPTION_CONFIG.ALGORITHM,
        length: ENCRYPTION_CONFIG.KEY_LENGTH
      },
      false, // not extractable
      ['encrypt', 'decrypt']
    );

    return derivedKey;
  } catch (error) {
    throw new KeyDerivationError(`Key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Export derived key for validation (extractable version)
 */
export async function deriveExtractableKey(params: KeyDerivationParams): Promise<ArrayBuffer> {
  if (!isWebCryptoSupported()) {
    throw new KeyDerivationError('Web Crypto API not supported');
  }

  try {
    // Import password as key material
    const passwordKey = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(params.password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // Derive extractable AES key
    const derivedKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: params.salt,
        iterations: params.iterations,
        hash: 'SHA-256'
      },
      passwordKey,
      {
        name: ENCRYPTION_CONFIG.ALGORITHM,
        length: ENCRYPTION_CONFIG.KEY_LENGTH
      },
      true, // extractable
      ['encrypt', 'decrypt']
    );

    // Export the key as raw bytes
    return await window.crypto.subtle.exportKey('raw', derivedKey);
  } catch (error) {
    throw new KeyDerivationError(`Extractable key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Encrypt data using AES-256-GCM
 */
export async function encrypt(
  data: ArrayBuffer,
  key: CryptoKey,
  iv?: Uint8Array,
  aad?: string
): Promise<EncryptionResult> {
  if (!isWebCryptoSupported()) {
    throw new EncryptionError('Web Crypto API not supported', 'CRYPTO_NOT_SUPPORTED');
  }

  try {
    const actualIV = iv || generateIV();
    
    const encryptParams: AesGcmParams = {
      name: ENCRYPTION_CONFIG.ALGORITHM,
      iv: actualIV
    };
    
    if (aad) {
      encryptParams.additionalData = new TextEncoder().encode(aad);
    }

    const encryptedData = await window.crypto.subtle.encrypt(
      encryptParams,
      key,
      data
    );

    // For AES-GCM, Web Crypto API returns the full encrypted data
    // We need to determine the actual auth tag length from the result
    const encryptedArray = new Uint8Array(encryptedData);

    // Calculate actual auth tag length from the difference
    const actualAuthTagLength = encryptedArray.length - data.byteLength;
    const ciphertext = encryptedArray.slice(0, data.byteLength);
    const authTag = encryptedArray.slice(data.byteLength);

    return {
      ciphertext: uint8ArrayToBase64(ciphertext),
      iv: uint8ArrayToBase64(actualIV),
      authTag: uint8ArrayToBase64(authTag),
      algorithm: ENCRYPTION_CONFIG.ALGORITHM
    };
  } catch (error) {
    throw new EncryptionError(
      `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'ENCRYPTION_FAILED'
    );
  }
}

/**
 * Decrypt data using AES-256-GCM
 */
export async function decrypt(input: DecryptionInput): Promise<ArrayBuffer> {
  if (!isWebCryptoSupported()) {
    throw new DecryptionError('Web Crypto API not supported');
  }

  try {
    // Enhanced validation and logging for debugging
    console.log('🔧 Core decrypt function called with input validation:');
    
    // Validate input parameters
    if (!input.ciphertext || !input.authTag || !input.iv || !input.key) {
      throw new DecryptionError('Missing required decryption parameters');
    }
    
    // Convert base64 data with validation
    let ciphertext: Uint8Array;
    let authTag: Uint8Array;
    let iv: Uint8Array;
    
    try {
      ciphertext = base64ToUint8Array(input.ciphertext);
      authTag = base64ToUint8Array(input.authTag);
      iv = base64ToUint8Array(input.iv);
    } catch (conversionError) {
      throw new DecryptionError(`Base64 conversion failed: ${conversionError instanceof Error ? conversionError.message : 'Unknown error'}`);
    }
    
    console.log('🔧 Decryption data sizes:', {
      ciphertextLength: ciphertext.length,
      authTagLength: authTag.length,
      ivLength: iv.length,
      expectedIvLength: ENCRYPTION_CONFIG.IV_LENGTH
    });
    
    // Validate data sizes
    if (ciphertext.length === 0) {
      throw new DecryptionError('Ciphertext is empty');
    }
    if (authTag.length === 0) {
      throw new DecryptionError('Auth tag is empty');
    }
    if (iv.length !== ENCRYPTION_CONFIG.IV_LENGTH) {
      console.warn(`⚠️ IV length mismatch: expected ${ENCRYPTION_CONFIG.IV_LENGTH}, got ${iv.length}`);
    }
    
    // Combine ciphertext and auth tag for WebCrypto
    const encryptedData = new Uint8Array(ciphertext.length + authTag.length);
    encryptedData.set(ciphertext);
    encryptedData.set(authTag, ciphertext.length);

    console.log('🔧 Combined encrypted data size:', encryptedData.length);

    // Prepare decryption parameters
    const decryptParams: AesGcmParams = {
      name: ENCRYPTION_CONFIG.ALGORITHM,
      iv: iv
    };

    if (input.aad) {
      decryptParams.additionalData = new TextEncoder().encode(input.aad);
      console.log('🔧 Additional data included in decryption');
    }

    console.log('🔧 Calling WebCrypto decrypt...');

    // Perform decryption with enhanced error handling
    let decryptedData: ArrayBuffer;
    try {
      decryptedData = await window.crypto.subtle.decrypt(
        decryptParams,
        input.key,
        encryptedData
      );
    } catch (cryptoError) {
      console.error('❌ WebCrypto decrypt failed:', cryptoError);
      
      // Provide more specific error messages based on common WebCrypto errors
      if (cryptoError instanceof Error) {
        if (cryptoError.name === 'OperationError') {
          throw new DecryptionError('Decryption failed - invalid key or corrupted data. The document may be encrypted with a different key.');
        } else if (cryptoError.message.includes('auth')) {
          throw new DecryptionError('Authentication failed - the document may be corrupted or tampered with.');
        } else {
          throw new DecryptionError(`WebCrypto decryption error: ${cryptoError.message}`);
        }
      } else {
        throw new DecryptionError('Unknown WebCrypto decryption error');
      }
    }

    console.log('✅ WebCrypto decrypt successful, decrypted size:', decryptedData.byteLength);

    // Validate decryption result
    if (decryptedData.byteLength === 0) {
      throw new DecryptionError('Decryption produced empty result');
    }

    return decryptedData;
  } catch (error) {
    // Re-throw DecryptionError instances as-is
    if (error instanceof DecryptionError) {
      throw error;
    }
    
    // Wrap other errors
    throw new DecryptionError(
      `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Encrypt text data
 */
export async function encryptText(
  text: string,
  key: CryptoKey,
  iv?: Uint8Array,
  aad?: string
): Promise<EncryptionResult> {
  const textData = new TextEncoder().encode(text);
  return encrypt(textData, key, iv, aad);
}

/**
 * Decrypt to text
 */
export async function decryptText(input: DecryptionInput): Promise<string> {
  const decryptedData = await decrypt(input);
  return new TextDecoder().decode(decryptedData);
}

/**
 * Create validation payload for key verification
 */
export async function createValidationPayload(
  username: string,
  key: CryptoKey
): Promise<ValidationPayload> {
  const validationText = `validation:${username}`;
  const result = await encryptText(validationText, key);
  
  return {
    ciphertext: result.ciphertext,
    iv: result.iv,
    authTag: result.authTag
  };
}

/**
 * Verify validation payload
 */
export async function verifyValidationPayload(
  username: string,
  payload: ValidationPayload,
  key: CryptoKey
): Promise<boolean> {
  try {
    const decryptedText = await decryptText({
      ciphertext: payload.ciphertext,
      iv: payload.iv,
      authTag: payload.authTag,
      key
    });
    
    return decryptedText === `validation:${username}`;
  } catch {
    return false;
  }
}

/**
 * Generate hash of key material for server validation
 */
export async function hashKeyMaterial(keyBuffer: ArrayBuffer): Promise<string> {
  if (!isWebCryptoSupported()) {
    throw new EncryptionError('Web Crypto API not supported', 'CRYPTO_NOT_SUPPORTED');
  }

  const hashBuffer = await window.crypto.subtle.digest('SHA-256', keyBuffer);
  return arrayBufferToBase64(hashBuffer);
}

/**
 * Encrypt file data for upload
 */
export async function encryptFile(
  file: File,
  key: CryptoKey,
  onProgress?: (progress: number) => void
): Promise<EncryptionResult & { originalSize: number; encryptedSize: number }> {
  const fileData = await file.arrayBuffer();
  
  if (onProgress) {
    onProgress(50); // Reading file complete
  }
  
  const result = await encrypt(fileData, key);
  
  if (onProgress) {
    onProgress(100); // Encryption complete
  }
  
  // Calculate sizes
  const encryptedSize = base64ToUint8Array(result.ciphertext).length + 
                       base64ToUint8Array(result.authTag).length;
  
  return {
    ...result,
    originalSize: file.size,
    encryptedSize
  };
}

/**
 * Decrypt file data
 */
export async function decryptFile(
  input: DecryptionInput,
  filename: string,
  mimeType: string = 'application/octet-stream'
): Promise<File> {
  const decryptedData = await decrypt(input);
  return new File([decryptedData], filename, { type: mimeType });
}

/**
 * Get recommended encryption parameters
 */
export function getEncryptionParameters(): EncryptionParameters {
  return {
    algorithm: ENCRYPTION_CONFIG.ALGORITHM,
    keyDerivation: ENCRYPTION_CONFIG.DERIVATION_ALGORITHM,
    iterations: ENCRYPTION_CONFIG.RECOMMENDED_ITERATIONS,
    salt: uint8ArrayToBase64(generateSalt()),
    keyLength: ENCRYPTION_CONFIG.KEY_LENGTH / 8, // Convert bits to bytes
    ivLength: ENCRYPTION_CONFIG.IV_LENGTH,
    authTagLength: ENCRYPTION_CONFIG.AUTH_TAG_LENGTH
  };
}

/**
 * Validate encryption parameters
 */
export function validateEncryptionParameters(params: Partial<EncryptionParameters>): string[] {
  const errors: string[] = [];
  
  if (params.iterations && params.iterations < ENCRYPTION_CONFIG.MIN_ITERATIONS) {
    errors.push(`Iterations must be at least ${ENCRYPTION_CONFIG.MIN_ITERATIONS}`);
  }
  
  if (params.keyLength && params.keyLength !== ENCRYPTION_CONFIG.KEY_LENGTH / 8) {
    errors.push(`Key length must be ${ENCRYPTION_CONFIG.KEY_LENGTH / 8} bytes`);
  }
  
  if (params.ivLength && params.ivLength !== ENCRYPTION_CONFIG.IV_LENGTH) {
    errors.push(`IV length must be ${ENCRYPTION_CONFIG.IV_LENGTH} bytes`);
  }
  
  if (params.authTagLength && params.authTagLength !== ENCRYPTION_CONFIG.AUTH_TAG_LENGTH) {
    errors.push(`Auth tag length must be ${ENCRYPTION_CONFIG.AUTH_TAG_LENGTH} bytes`);
  }
  
  return errors;
}

/**
 * Verify key validation using stored verification payload (for login)
 */
export async function verifyKeyValidation(
  username: string,
  key: CryptoKey,
  storedPayload: string
): Promise<boolean> {
  try {
    // Parse the stored JSON payload
    const payload: ValidationPayload = JSON.parse(storedPayload);
    return await verifyValidationPayload(username, payload, key);
  } catch {
    return false;
  }
}

/**
 * Test crypto functionality
 */
export async function testCryptoFunctionality(): Promise<boolean> {
  try {
    if (!isWebCryptoSupported()) {
      return false;
    }
    
    // Test key derivation
    const salt = generateSalt();
    const key = await deriveKey({
      password: 'test-password',
      salt,
      iterations: ENCRYPTION_CONFIG.MIN_ITERATIONS
    });
    
    // Test encryption/decryption
    const testData = 'Hello, SecureVault!';
    const encrypted = await encryptText(testData, key);
    const decrypted = await decryptText({
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      key
    });
    
    return decrypted === testData;
  } catch {
    return false;
  }
}