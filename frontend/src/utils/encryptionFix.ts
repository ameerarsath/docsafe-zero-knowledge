/**
 * Enhanced encryption utilities with comprehensive Base64 and decryption fixes.
 *
 * This module addresses:
 * - Base64 encoding/decoding consistency
 * - METHOD_1_FAILED decryption errors
 * - Key derivation consistency
 * - Ciphertext integrity validation
 * - Graceful error handling
 */

import {
  ENCRYPTION_CONFIG,
  DecryptionInput,
  KeyDerivationParams,
  EncryptionError,
  DecryptionError,
  KeyDerivationError
} from './encryption';

// Enhanced Base64 utilities with better error handling
export class Base64Utils {
  /**
   * Convert ArrayBuffer to Base64 with validation
   */
  static arrayBufferToBase64(buffer: ArrayBuffer): string {
    try {
      const bytes = new Uint8Array(buffer);
      let binary = '';

      // Process in chunks to avoid call stack overflow for large files
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.slice(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
      }

      const result = btoa(binary);

      // Validate the result
      if (!result || result.length === 0) {
        throw new Error('Base64 encoding produced empty result');
      }

      return result;
    } catch (error) {
      console.error('Base64 encoding failed:', error);
      throw new EncryptionError(
        `Base64 encoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BASE64_ENCODE_ERROR'
      );
    }
  }

  /**
   * Convert Base64 to ArrayBuffer with comprehensive validation
   */
  static base64ToArrayBuffer(base64: string): ArrayBuffer {
    try {
      // Input validation
      if (!base64 || typeof base64 !== 'string') {
        throw new Error('Invalid base64 input: must be a non-empty string');
      }

      // Remove whitespace and validate format
      let cleanBase64 = base64.trim().replace(/\\s+/g, '');

      // Handle URL-safe base64
      cleanBase64 = cleanBase64.replace(/-/g, '+').replace(/_/g, '/');

      // Add padding if needed
      while (cleanBase64.length % 4 !== 0) {
        cleanBase64 += '=';
      }

      // Validate base64 format
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
        throw new Error(`Invalid base64 format: contains invalid characters. Input: ${base64.substring(0, 50)}...`);
      }

      // Decode with proper validation
      const binary = atob(cleanBase64);
      const bytes = new Uint8Array(binary.length);

      for (let i = 0; i < binary.length; i++) {
        const charCode = binary.charCodeAt(i);
        // Validate that we're getting valid byte values
        if (charCode > 255) {
          throw new Error('Invalid binary data detected during Base64 decode');
        }
        bytes[i] = charCode;
      }

      // Validate result
      if (bytes.length === 0) {
        throw new Error('Base64 decoding produced empty result');
      }

      return bytes.buffer;
    } catch (error) {
      console.error('Base64 decoding failed:', {
        input: base64?.substring(0, 100) + '...',
        inputLength: base64?.length,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new DecryptionError(
        `Base64 decoding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'BASE64_DECODE_ERROR'
      );
    }
  }

  /**
   * Validate Base64 string without decoding
   */
  static isValidBase64(base64: string): boolean {
    try {
      if (!base64 || typeof base64 !== 'string') return false;

      const cleanBase64 = base64.trim()
        .replace(/\\s+/g, '')
        .replace(/-/g, '+')
        .replace(/_/g, '/');

      // Check basic format
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) return false;

      // Try to decode a small portion
      atob(cleanBase64.substring(0, Math.min(100, cleanBase64.length)));
      return true;
    } catch {
      return false;
    }
  }
}

// Enhanced key derivation with consistency checks
export class KeyDerivationUtils {
  /**
   * Derive key with enhanced validation and consistency
   */
  static async deriveKeyEnhanced(params: KeyDerivationParams): Promise<CryptoKey> {
    try {
      // Validate parameters
      if (!params.password || params.password.length < 8) {
        throw new KeyDerivationError('Password must be at least 8 characters');
      }

      if (!params.salt || params.salt.length < 16) {
        throw new KeyDerivationError('Salt must be at least 16 bytes');
      }

      const iterations = params.iterations || ENCRYPTION_CONFIG.RECOMMENDED_ITERATIONS;
      if (iterations < ENCRYPTION_CONFIG.MIN_ITERATIONS) {
        throw new KeyDerivationError(`Iterations must be at least ${ENCRYPTION_CONFIG.MIN_ITERATIONS}`);
      }

      console.log('🔑 Key derivation parameters:', {
        passwordLength: params.password.length,
        saltLength: params.salt.length,
        iterations,
        algorithm: 'PBKDF2'
      });

      // Convert salt if it's base64
      let saltBytes: Uint8Array;
      if (typeof params.salt === 'string') {
        saltBytes = new Uint8Array(Base64Utils.base64ToArrayBuffer(params.salt));
      } else {
        saltBytes = params.salt;
      }

      // Import password as key material
      const passwordKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(params.password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      // Derive the key
      const derivedKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: saltBytes,
          iterations,
          hash: 'SHA-256'
        },
        passwordKey,
        {
          name: 'AES-GCM',
          length: ENCRYPTION_CONFIG.KEY_LENGTH
        },
        false, // not extractable for security
        ['encrypt', 'decrypt']
      );

      console.log('✅ Key derivation successful');
      return derivedKey;

    } catch (error) {
      console.error('Key derivation failed:', error);
      throw new KeyDerivationError(
        `Key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate cryptographically secure salt
   */
  static generateSalt(length: number = ENCRYPTION_CONFIG.SALT_LENGTH): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }
}

// Enhanced decryption with multiple strategies and better error handling
export class DecryptionUtils {
  /**
   * Enhanced decrypt function that handles various ciphertext formats
   */
  static async decryptEnhanced(input: DecryptionInput): Promise<ArrayBuffer> {
    console.group('🔓 ENHANCED DECRYPTION');

    try {
      // Validate inputs
      await this.validateDecryptionInput(input);

      // Convert Base64 inputs with validation
      const ciphertext = new Uint8Array(Base64Utils.base64ToArrayBuffer(input.ciphertext));
      const authTag = new Uint8Array(Base64Utils.base64ToArrayBuffer(input.authTag));
      const iv = new Uint8Array(Base64Utils.base64ToArrayBuffer(input.iv));

      console.log('📊 Decryption input analysis:', {
        ciphertextLength: ciphertext.length,
        authTagLength: authTag.length,
        ivLength: iv.length,
        ciphertextBase64Length: input.ciphertext.length,
        keyType: input.key.type,
        keyUsages: input.key.usages
      });

      // Strategy 1: Ciphertext already includes auth tag (common format)
      try {
        console.log('🔧 Strategy 1: Ciphertext with embedded auth tag');
        const result = await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv,
            tagLength: 128 // 16 bytes * 8 bits
          },
          input.key,
          ciphertext
        );
        console.log('✅ Strategy 1 SUCCESS:', result.byteLength, 'bytes decrypted');
        return result;
      } catch (strategy1Error) {
        console.warn('❌ Strategy 1 failed:', (strategy1Error as Error).name);
      }

      // Strategy 2: Separate ciphertext and auth tag
      try {
        console.log('🔧 Strategy 2: Separate ciphertext + auth tag');
        const combined = new Uint8Array(ciphertext.length + authTag.length);
        combined.set(ciphertext, 0);
        combined.set(authTag, ciphertext.length);

        const result = await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv,
            tagLength: 128
          },
          input.key,
          combined
        );
        console.log('✅ Strategy 2 SUCCESS:', result.byteLength, 'bytes decrypted');
        return result;
      } catch (strategy2Error) {
        console.warn('❌ Strategy 2 failed:', (strategy2Error as Error).name);
      }

      // Strategy 3: Auth tag at the beginning
      try {
        console.log('🔧 Strategy 3: Auth tag + ciphertext');
        const combined = new Uint8Array(authTag.length + ciphertext.length);
        combined.set(authTag, 0);
        combined.set(ciphertext, authTag.length);

        const result = await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv,
            tagLength: 128
          },
          input.key,
          combined
        );
        console.log('✅ Strategy 3 SUCCESS:', result.byteLength, 'bytes decrypted');
        return result;
      } catch (strategy3Error) {
        console.warn('❌ Strategy 3 failed:', (strategy3Error as Error).name);
      }

      // Strategy 4: Try with explicit additionalData
      try {
        console.log('🔧 Strategy 4: With additional data');
        const aad = input.aad ? new TextEncoder().encode(input.aad) : undefined;

        const result = await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv,
            tagLength: 128,
            additionalData: aad
          },
          input.key,
          ciphertext
        );
        console.log('✅ Strategy 4 SUCCESS:', result.byteLength, 'bytes decrypted');
        return result;
      } catch (strategy4Error) {
        console.warn('❌ Strategy 4 failed:', (strategy4Error as Error).name);
      }

      // All strategies failed - provide detailed error info
      throw new DecryptionError(
        'All decryption strategies failed. This may indicate key mismatch, corrupted data, or format incompatibility.',
        'ALL_STRATEGIES_FAILED'
      );

    } catch (error) {
      console.error('💥 Decryption failed completely:', error);

      // Store detailed debugging info
      (window as any).lastDecryptionDebug = {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        inputLengths: {
          ciphertext: input.ciphertext?.length || 0,
          authTag: input.authTag?.length || 0,
          iv: input.iv?.length || 0
        },
        keyInfo: {
          type: input.key?.type,
          usages: input.key?.usages,
          extractable: input.key?.extractable
        },
        base64Validation: {
          ciphertext: Base64Utils.isValidBase64(input.ciphertext),
          authTag: Base64Utils.isValidBase64(input.authTag),
          iv: Base64Utils.isValidBase64(input.iv)
        }
      };

      throw error;
    } finally {
      console.groupEnd();
    }
  }

  /**
   * Validate decryption input with detailed checks
   */
  static async validateDecryptionInput(input: DecryptionInput): Promise<void> {
    const errors: string[] = [];

    // Check required fields
    if (!input.ciphertext) errors.push('Ciphertext is required');
    if (!input.authTag) errors.push('Auth tag is required');
    if (!input.iv) errors.push('IV is required');
    if (!input.key) errors.push('Key is required');

    // Validate Base64 format
    if (input.ciphertext && !Base64Utils.isValidBase64(input.ciphertext)) {
      errors.push('Ciphertext is not valid Base64');
    }
    if (input.authTag && !Base64Utils.isValidBase64(input.authTag)) {
      errors.push('Auth tag is not valid Base64');
    }
    if (input.iv && !Base64Utils.isValidBase64(input.iv)) {
      errors.push('IV is not valid Base64');
    }

    // Validate key
    if (input.key) {
      if (input.key.type !== 'secret') {
        errors.push(`Invalid key type: expected 'secret', got '${input.key.type}'`);
      }
      if (!input.key.usages.includes('decrypt')) {
        errors.push('Key does not have decrypt usage');
      }
    }

    if (errors.length > 0) {
      throw new DecryptionError(`Input validation failed: ${errors.join(', ')}`, 'INVALID_INPUT');
    }
  }
}

// Utility for debugging encryption/decryption issues
export class EncryptionDebugger {
  /**
   * Comprehensive encryption data analysis
   */
  static analyzeEncryptionData(data: {
    ciphertext?: string;
    authTag?: string;
    iv?: string;
    key?: CryptoKey;
  }) {
    console.group('🔍 ENCRYPTION DATA ANALYSIS');

    try {
      const analysis = {
        timestamp: new Date().toISOString(),
        base64Validation: {},
        decodedLengths: {},
        hexPreviews: {},
        issues: [] as string[]
      };

      // Analyze each component
      if (data.ciphertext) {
        analysis.base64Validation.ciphertext = Base64Utils.isValidBase64(data.ciphertext);
        if (analysis.base64Validation.ciphertext) {
          try {
            const decoded = new Uint8Array(Base64Utils.base64ToArrayBuffer(data.ciphertext));
            analysis.decodedLengths.ciphertext = decoded.length;
            analysis.hexPreviews.ciphertext = Array.from(decoded.slice(0, 16))
              .map(b => b.toString(16).padStart(2, '0')).join(' ');

            if (decoded.length < 16) {
              analysis.issues.push('Ciphertext too short (possible truncation)');
            }
          } catch (error) {
            analysis.issues.push(`Ciphertext decode error: ${error}`);
          }
        } else {
          analysis.issues.push('Invalid ciphertext Base64 format');
        }
      }

      if (data.authTag) {
        analysis.base64Validation.authTag = Base64Utils.isValidBase64(data.authTag);
        if (analysis.base64Validation.authTag) {
          try {
            const decoded = new Uint8Array(Base64Utils.base64ToArrayBuffer(data.authTag));
            analysis.decodedLengths.authTag = decoded.length;
            analysis.hexPreviews.authTag = Array.from(decoded)
              .map(b => b.toString(16).padStart(2, '0')).join(' ');

            if (decoded.length !== 16) {
              analysis.issues.push(`Auth tag wrong length: expected 16, got ${decoded.length}`);
            }
          } catch (error) {
            analysis.issues.push(`Auth tag decode error: ${error}`);
          }
        } else {
          analysis.issues.push('Invalid auth tag Base64 format');
        }
      }

      if (data.iv) {
        analysis.base64Validation.iv = Base64Utils.isValidBase64(data.iv);
        if (analysis.base64Validation.iv) {
          try {
            const decoded = new Uint8Array(Base64Utils.base64ToArrayBuffer(data.iv));
            analysis.decodedLengths.iv = decoded.length;
            analysis.hexPreviews.iv = Array.from(decoded)
              .map(b => b.toString(16).padStart(2, '0')).join(' ');

            if (decoded.length !== 12) {
              analysis.issues.push(`IV wrong length: expected 12, got ${decoded.length}`);
            }
          } catch (error) {
            analysis.issues.push(`IV decode error: ${error}`);
          }
        } else {
          analysis.issues.push('Invalid IV Base64 format');
        }
      }

      if (data.key) {
        analysis.keyInfo = {
          type: data.key.type,
          usages: data.key.usages,
          extractable: data.key.extractable
        };

        if (data.key.type !== 'secret') {
          analysis.issues.push(`Wrong key type: expected 'secret', got '${data.key.type}'`);
        }
        if (!data.key.usages.includes('decrypt')) {
          analysis.issues.push('Key missing decrypt usage');
        }
      }

      console.log('Analysis Results:', analysis);

      if (analysis.issues.length > 0) {
        console.warn('⚠️ Issues found:', analysis.issues);
      } else {
        console.log('✅ No issues detected');
      }

      return analysis;

    } finally {
      console.groupEnd();
    }
  }

  /**
   * Test decryption with sample data
   */
  static async testDecryption(input: DecryptionInput) {
    console.group('🧪 DECRYPTION TEST');

    try {
      // First analyze the data
      this.analyzeEncryptionData(input);

      // Then attempt decryption
      const result = await DecryptionUtils.decryptEnhanced(input);

      console.log('✅ Test successful:', {
        decryptedSize: result.byteLength,
        resultType: result.constructor.name
      });

      return result;

    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    } finally {
      console.groupEnd();
    }
  }
}

// Export enhanced functions for easy replacement
export const enhancedDecrypt = DecryptionUtils.decryptEnhanced;
export const enhancedDeriveKey = KeyDerivationUtils.deriveKeyEnhanced;
export const enhancedBase64 = Base64Utils;
export const debugEncryption = EncryptionDebugger;