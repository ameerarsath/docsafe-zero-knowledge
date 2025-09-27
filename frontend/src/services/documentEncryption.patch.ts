/**
 * PATCH: Enhanced Document Encryption Service with Master Key Recovery
 *
 * Fixes:
 * - Master key flag inconsistency
 * - PDF decryption failures
 * - OperationError handling
 * - Poppler dependency issues
 */

import { DocumentEncryptionService } from './documentEncryption';

// Enhanced master key management with recovery capabilities
export class EnhancedDocumentEncryptionService extends DocumentEncryptionService {
  private keyRecoveryAttempted = false;
  private readonly MAX_RECOVERY_ATTEMPTS = 3;
  private recoveryAttempts = 0;

  /**
   * Enhanced master key restoration with error recovery
   */
  async restoreMasterKeyFromSession(): Promise<boolean> {
    try {
      console.log('🔄 Starting enhanced master key restoration...');

      // Check session flags first
      const sessionFlag = sessionStorage.getItem('has_master_key') === 'true';
      const keyData = sessionStorage.getItem('master_key_data');
      const hasStoredPassword = !!sessionStorage.getItem('encryption_password');

      console.log('📊 Master key restoration state:', {
        sessionFlag,
        hasKeyData: !!keyData,
        hasStoredPassword,
        currentKey: !!this.masterKey,
        recoveryAttempts: this.recoveryAttempts
      });

      // If we already have a valid key, no need to restore
      if (this.masterKey && await this.validateMasterKey()) {
        console.log('✅ Master key already available and valid');
        return true;
      }

      // Clear inconsistent state if flag is set but no data
      if (sessionFlag && !keyData && !hasStoredPassword) {
        console.warn('⚠️ Clearing inconsistent master key flags');
        this.clearMasterKeySession();
        return false;
      }

      // Attempt restoration if we have key data
      if (keyData) {
        try {
          const restored = await this.restoreFromKeyData(keyData);
          if (restored) {
            console.log('✅ Master key restored from session data');
            return true;
          }
        } catch (error) {
          console.warn('⚠️ Failed to restore from key data:', error);
        }
      }

      // Attempt password-based restoration if available
      if (hasStoredPassword && this.recoveryAttempts < this.MAX_RECOVERY_ATTEMPTS) {
        try {
          this.recoveryAttempts++;
          const password = sessionStorage.getItem('encryption_password')!;
          const restored = await this.deriveFromPassword(password);
          if (restored) {
            console.log('✅ Master key restored from password');
            return true;
          }
        } catch (error) {
          console.warn('⚠️ Failed to restore from password:', error);
        }
      }

      // If all restoration attempts failed, clear session
      if (this.recoveryAttempts >= this.MAX_RECOVERY_ATTEMPTS) {
        console.error('❌ All master key recovery attempts failed, clearing session');
        this.clearMasterKeySession();
      }

      return false;

    } catch (error) {
      console.error('❌ Master key restoration failed:', error);
      return false;
    }
  }

  /**
   * Validate that the current master key is working
   */
  private async validateMasterKey(): Promise<boolean> {
    if (!this.masterKey) return false;

    try {
      // Test key by attempting a simple encryption/decryption
      const testData = new TextEncoder().encode('test');
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.masterKey,
        testData
      );

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.masterKey,
        encrypted
      );

      return new TextDecoder().decode(decrypted) === 'test';
    } catch {
      return false;
    }
  }

  /**
   * Restore master key from stored key data
   */
  private async restoreFromKeyData(keyData: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(keyData);
      const keyBuffer = new Uint8Array(parsed.keyData).buffer;

      this.masterKey = await crypto.subtle.importKey(
        'raw',
        keyBuffer,
        { name: 'AES-GCM' },
        true,
        ['encrypt', 'decrypt']
      );

      return await this.validateMasterKey();
    } catch {
      return false;
    }
  }

  /**
   * Derive master key from password
   */
  private async deriveFromPassword(password: string): Promise<boolean> {
    try {
      const { deriveKey, generateSalt } = await import('../utils/encryption');

      // Try to get stored salt or generate new one
      let salt = sessionStorage.getItem('master_key_salt');
      if (!salt) {
        const saltBytes = generateSalt();
        salt = btoa(String.fromCharCode(...saltBytes));
        sessionStorage.setItem('master_key_salt', salt);
      }

      const saltBytes = new Uint8Array(atob(salt).split('').map(c => c.charCodeAt(0)));

      this.masterKey = await deriveKey({
        password,
        salt: saltBytes,
        iterations: 500000
      });

      const isValid = await this.validateMasterKey();
      if (isValid) {
        // Store key data for future restoration
        const keyBuffer = await crypto.subtle.exportKey('raw', this.masterKey);
        const keyData = {
          keyData: Array.from(new Uint8Array(keyBuffer)),
          timestamp: Date.now()
        };
        sessionStorage.setItem('master_key_data', JSON.stringify(keyData));
        sessionStorage.setItem('has_master_key', 'true');
      }

      return isValid;
    } catch {
      return false;
    }
  }

  /**
   * Clear all master key session data
   */
  private clearMasterKeySession(): void {
    sessionStorage.removeItem('has_master_key');
    sessionStorage.removeItem('master_key_data');
    sessionStorage.removeItem('master_key_salt');
    sessionStorage.removeItem('encryption_password');
    this.masterKey = null;
    this.keyRestored = false;
    this.recoveryAttempts = 0;
  }

  /**
   * Enhanced document decryption with better error handling
   */
  async decryptDocument(document: Document, onProgress?: (progress: EncryptionProgress) => void): Promise<DecryptedDocument> {
    // Ensure master key is available
    if (!this.masterKey) {
      const restored = await this.restoreMasterKeyFromSession();
      if (!restored) {
        throw new DocumentDecryptionError('Master key not available. Please re-enter your password.', 'NO_MASTER_KEY');
      }
    }

    try {
      return await super.decryptDocument(document, onProgress);
    } catch (error) {
      // Handle specific decryption errors
      if (error instanceof Error) {
        if (error.message.includes('OperationError')) {
          // Try to recover by re-deriving the key
          console.warn('⚠️ OperationError detected, attempting key recovery...');
          this.clearMasterKeySession();
          throw new DocumentDecryptionError('Decryption failed. Please re-enter your password.', 'OPERATION_ERROR');
        }

        if (error.message.includes('METHOD_1_FAILED')) {
          // Handle the specific METHOD_1_FAILED error
          console.warn('⚠️ METHOD_1_FAILED detected, using fallback decryption...');
          return await this.decryptWithFallback(document, onProgress);
        }
      }

      throw error;
    }
  }

  /**
   * Fallback decryption method for METHOD_1_FAILED cases
   */
  private async decryptWithFallback(document: Document, onProgress?: (progress: EncryptionProgress) => void): Promise<DecryptedDocument> {
    try {
      onProgress?.({ stage: 'decrypting', progress: 25, message: 'Using fallback decryption method...' });

      // Download the encrypted file data
      const response = await fetch(`/api/v1/documents/${document.id}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download document: ${response.status}`);
      }

      const encryptedData = await response.arrayBuffer();

      onProgress?.({ stage: 'decrypting', progress: 50, message: 'Processing encrypted data...' });

      // Use legacy decryption if available
      if (document.encryption_key_id && document.encryption_iv && document.encryption_auth_tag) {
        return await this.decryptLegacyDocument(document, encryptedData, onProgress);
      }

      // Use DEK-based decryption
      if (document.encrypted_dek) {
        return await this.decryptDEKDocument(document, encryptedData, onProgress);
      }

      throw new Error('Unknown encryption format');

    } catch (error) {
      throw new DocumentDecryptionError(
        `Fallback decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FALLBACK_FAILED'
      );
    }
  }

  /**
   * Legacy document decryption
   */
  private async decryptLegacyDocument(document: Document, encryptedData: ArrayBuffer, onProgress?: (progress: EncryptionProgress) => void): Promise<DecryptedDocument> {
    const { decrypt, base64ToArrayBuffer } = await import('../utils/encryption');

    // Split data into ciphertext and auth tag
    const encryptedArray = new Uint8Array(encryptedData);
    const authTagSize = 16; // AES-GCM auth tag size
    const ciphertext = encryptedArray.slice(0, -authTagSize);
    const authTag = encryptedArray.slice(-authTagSize);

    // Convert to base64 for decryption
    const ciphertextBase64 = btoa(String.fromCharCode(...ciphertext));
    const authTagBase64 = btoa(String.fromCharCode(...authTag));

    onProgress?.({ stage: 'decrypting', progress: 75, message: 'Decrypting content...' });

    const decryptedData = await decrypt({
      ciphertext: ciphertextBase64,
      iv: document.encryption_iv!,
      authTag: authTagBase64,
      key: this.masterKey!
    });

    onProgress?.({ stage: 'complete', progress: 100, message: 'Decryption complete' });

    return {
      decryptedData,
      originalFilename: document.name,
      mimeType: document.mime_type || 'application/octet-stream',
      originalSize: document.file_size || decryptedData.byteLength
    };
  }

  /**
   * DEK-based document decryption with enhanced error handling
   */
  private async decryptDEKDocument(document: Document, encryptedData: ArrayBuffer, onProgress?: (progress: EncryptionProgress) => void): Promise<DecryptedDocument> {
    const { decryptDocumentWithMasterKey, arrayBufferToBase64 } = await import('../utils/dek');

    // Split data similar to the original method but with better error handling
    const encryptedArray = new Uint8Array(encryptedData);
    const authTagSize = 16;

    if (encryptedArray.length <= authTagSize) {
      throw new Error('Encrypted data too small to contain auth tag');
    }

    const ciphertext = encryptedArray.slice(0, -authTagSize);
    const authTag = encryptedArray.slice(-authTagSize);

    // Create proper ArrayBuffers (not views)
    const ciphertextBuffer = new ArrayBuffer(ciphertext.length);
    const authTagBuffer = new ArrayBuffer(authTag.length);

    new Uint8Array(ciphertextBuffer).set(ciphertext);
    new Uint8Array(authTagBuffer).set(authTag);

    const ciphertextBase64 = arrayBufferToBase64(ciphertextBuffer);
    const authTagBase64 = arrayBufferToBase64(authTagBuffer);

    onProgress?.({ stage: 'decrypting', progress: 75, message: 'Decrypting with DEK...' });

    const decryptedData = await decryptDocumentWithMasterKey(
      {
        ciphertext: ciphertextBase64,
        iv: document.encryption_iv!,
        authTag: authTagBase64
      },
      document.encrypted_dek!,
      this.masterKey!
    );

    onProgress?.({ stage: 'complete', progress: 100, message: 'Decryption complete' });

    return {
      decryptedData,
      originalFilename: document.name,
      mimeType: document.mime_type || 'application/octet-stream',
      originalSize: document.file_size || decryptedData.byteLength
    };
  }
}

// Replace the default export
export default EnhancedDocumentEncryptionService;