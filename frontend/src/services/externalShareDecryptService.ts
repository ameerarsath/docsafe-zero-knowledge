/**
 * External Share Decryption Service
 *
 * Handles client-side decryption of encrypted external shares
 * with support for CSV files and other document types
 */

import { createBlobUrlWithFallback, cleanupBlobUrls } from '../utils/blobUrlHandler';

export interface DecryptionResult {
  success: boolean;
  data?: Blob;
  error?: string;
  blobUrl?: string;
  cleanup?: () => void;
}

export interface EncryptionHeaders {
  'X-Encryption-Salt': string;
  'X-Encryption-IV': string;
  'X-Encryption-Iterations': string;
}

export class ExternalShareDecryptService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly DEFAULT_ITERATIONS = 100000;

  /**
   * Decrypts an encrypted file from an external share
   */
  static async decryptExternalShare(
    encryptedData: ArrayBuffer,
    password: string,
    headers: Partial<EncryptionHeaders>
  ): Promise<DecryptionResult> {
    try {
      // Extract encryption parameters from headers
      const salt = headers['X-Encryption-Salt'];
      const iv = headers['X-Encryption-IV'];
      const iterations = parseInt(headers['X-Encryption-Iterations'] || '100000');

      if (!salt || !iv) {
        throw new Error('Missing encryption parameters in response headers');
      }

      // Decode salt and IV
      const saltBuffer = this.base64ToArrayBuffer(salt);
      const ivBuffer = this.base64ToArrayBuffer(iv);

      // Derive key from password
      const key = await this.deriveKey(password, saltBuffer, iterations);

      // Decrypt the data
      const decryptedData = await this.decryptData(encryptedData, key, ivBuffer);

      // Create blob from decrypted data
      const blob = new Blob([decryptedData], { type: 'application/octet-stream' });

      // Create blob URL with fallback handling
      const blobResult = createBlobUrlWithFallback(blob, blob.type);

      return {
        success: true,
        data: blob,
        blobUrl: blobResult.url,
        cleanup: blobResult.cleanup
      };
    } catch (error) {
      console.error('Decryption failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Decryption failed'
      };
    }
  }

  /**
   * Fetches and decrypts an external share file
   */
  static async fetchAndDecryptShare(
    shareToken: string,
    password: string,
    baseUrl: string = 'http://localhost:8000'
  ): Promise<DecryptionResult> {
    try {
      const response = await fetch(`${baseUrl}/share/${shareToken}/stream`, {
        method: 'GET',
        headers: password ? {
          'X-Share-Password': password
        } : {},
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Check if content is encrypted
      const encryptionHeaders = this.extractEncryptionHeaders(response.headers);

      if (this.isEncrypted(response, encryptionHeaders)) {
        const encryptedData = await response.arrayBuffer();
        return await this.decryptExternalShare(encryptedData, password, encryptionHeaders);
      } else {
        // Content is not encrypted, return as-is
        const blob = await response.blob();
        const blobResult = createBlobUrlWithFallback(blob, blob.type);

        return {
          success: true,
          data: blob,
          blobUrl: blobResult.url,
          cleanup: blobResult.cleanup
        };
      }
    } catch (error) {
      console.error('Failed to fetch and decrypt share:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch file'
      };
    }
  }

  /**
   * Extracts encryption headers from response
   */
  private static extractEncryptionHeaders(headers: Headers): Partial<EncryptionHeaders> {
    const encryptionHeaders: Partial<EncryptionHeaders> = {};

    const salt = headers.get('X-Encryption-Salt');
    const iv = headers.get('X-Encryption-IV');
    const iterations = headers.get('X-Encryption-Iterations');

    if (salt) encryptionHeaders['X-Encryption-Salt'] = salt;
    if (iv) encryptionHeaders['X-Encryption-IV'] = iv;
    if (iterations) encryptionHeaders['X-Encryption-Iterations'] = iterations;

    return encryptionHeaders;
  }

  /**
   * Checks if the response contains encrypted content
   */
  private static isEncrypted(response: Response, headers: Partial<EncryptionHeaders>): boolean {
    // Check for encryption headers
    if (headers['X-Encryption-Salt'] && headers['X-Encryption-IV']) {
      return true;
    }

    // Check content type for encrypted data
    const contentType = response.headers.get('content-type');
    return contentType === 'application/octet-stream' ||
           contentType === 'application/encrypted';
  }

  /**
   * Derives encryption key from password using PBKDF2
   */
  private static async deriveKey(
    password: string,
    salt: ArrayBuffer,
    iterations: number = this.DEFAULT_ITERATIONS
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as key
    const baseKey = await crypto.subtle.importKey(
      'PBKDF2',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive the actual encryption key
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256'
      },
      baseKey,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      false,
      ['decrypt']
    );
  }

  /**
   * Decrypts data using AES-GCM
   */
  private static async decryptData(
    encryptedData: ArrayBuffer,
    key: CryptoKey,
    iv: ArrayBuffer
  ): Promise<ArrayBuffer> {
    try {
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv
        },
        key,
        encryptedData
      );

      return decryptedData;
    } catch (error) {
      console.error('AES-GCM decryption failed:', error);

      // Try with legacy method if the data was encrypted differently
      return this.decryptDataLegacy(encryptedData, key, iv);
    }
  }

  /**
   * Legacy decryption method for backwards compatibility
   */
  private static async decryptDataLegacy(
    encryptedData: ArrayBuffer,
    key: CryptoKey,
    iv: ArrayBuffer
  ): Promise<ArrayBuffer> {
    try {
      // Some implementations might have different IV handling
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: new Uint8Array(iv).slice(0, 12) // Ensure 12-byte IV for GCM
        },
        key,
        encryptedData
      );

      return decryptedData;
    } catch (error) {
      throw new Error('Failed to decrypt data. The password may be incorrect or the file may be corrupted.');
    }
  }

  /**
   * Converts base64 string to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes.buffer;
  }

  /**
   * Cleans up resources
   */
  static cleanup(result: DecryptionResult): void {
    if (result.cleanup) {
      result.cleanup();
    }
  }

  /**
   * Validates password strength
   */
  static validatePassword(password: string): { valid: boolean; message?: string } {
    if (!password || password.length < 1) {
      return { valid: false, message: 'Password is required' };
    }

    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' };
    }

    return { valid: true };
  }
}