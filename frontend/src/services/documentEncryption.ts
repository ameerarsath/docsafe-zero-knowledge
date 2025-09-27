/**
 * Document Encryption Service
 * 
 * This service provides comprehensive document encryption/decryption functionality
 * using the DEK-per-document architecture for zero-knowledge security.
 * 
 * Features:
 * - Generate unique DEK for each document
 * - Encrypt documents with DEKs
 * - Encrypt DEKs with user's master key
 * - Decrypt documents using stored encrypted DEKs
 * - Handle file upload/download workflows
 */

import {
  createDocumentEncryption,
  decryptDocumentWithMasterKey,
  serializeDEKInfo,
  parseDEKInfo,
  testDEKFunctionality,
  DEKInfo,
  DocumentEncryptionData
} from '../utils/dek';
import {
  encryptFile,
  decryptFile,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  isWebCryptoSupported
} from '../utils/encryption';
import { Document } from './api/documents';

// Service configuration
export const DOCUMENT_ENCRYPTION_CONFIG = {
  CHUNK_SIZE: 1024 * 1024, // 1MB chunks for progress reporting
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB max file size
  SUPPORTED_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/zip',
    'application/x-zip-compressed'
  ]
} as const;

// Type definitions
export interface EncryptionProgress {
  stage: 'reading' | 'encrypting' | 'uploading' | 'complete';
  progress: number; // 0-100
  message: string;
}

export interface DecryptionProgress {
  stage: 'downloading' | 'decrypting' | 'complete';
  progress: number; // 0-100
  message: string;
}

export interface EncryptedDocumentUpload {
  file: File;
  encryptedData: Blob;
  dekInfo: DEKInfo;
  originalSize: number;
  encryptedSize: number;
}

export interface DocumentDecryptionResult {
  decryptedData: ArrayBuffer;
  originalFilename: string;
  mimeType: string;
  originalSize: number;
}

/**
 * Error classes for document encryption operations
 */
export class DocumentEncryptionError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DocumentEncryptionError';
  }
}

export class DocumentDecryptionError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DocumentDecryptionError';
  }
}

/**
 * Document Encryption Service Class
 */
export class DocumentEncryptionService {
  private masterKey: CryptoKey | null = null;
  private instanceId: string;
  private eventListeners: Set<() => void> = new Set();
  private keyRestored = false;

  constructor() {
    this.instanceId = 'service_' + Math.random().toString(36).substr(2, 9);
    console.log('🏗️ DocumentEncryptionService created with instanceId:', this.instanceId);
    
    // Try to restore master key from session storage on construction
    this.attemptKeyRestoration();
    
    // Set up periodic key restoration check (for HMR resilience)
    this.setupPeriodicKeyCheck();
  }

  /**
   * Attempt to restore master key from session storage (for HMR resilience)
   */
  private async attemptKeyRestoration(): Promise<void> {
    const hasKeyFlag = sessionStorage.getItem('has_master_key') === 'true';
    const keyData = sessionStorage.getItem('temp_master_key_data');
    
    if (hasKeyFlag && keyData && !this.masterKey && !this.keyRestored) {
      try {
        console.log(`🔄 DocumentEncryptionService[${this.instanceId}]: Attempting key restoration from session storage`);
        
        // Parse the stored key data
        const parsedData = JSON.parse(keyData);
        const keyBuffer = new Uint8Array(parsedData.keyBuffer);
        
        // Import the key back to CryptoKey
        const restoredKey = await window.crypto.subtle.importKey(
          'raw',
          keyBuffer,
          { name: 'AES-GCM' },
          false,
          ['encrypt', 'decrypt']
        );
        
        this.masterKey = restoredKey;
        this.keyRestored = true;
        console.log(`✅ DocumentEncryptionService[${this.instanceId}]: Master key successfully restored from session storage`);
        
        // Notify listeners
        this.notifyMasterKeyChange();
        
      } catch (error) {
        console.error(`❌ DocumentEncryptionService[${this.instanceId}]: Failed to restore master key:`, error);
        // Clear invalid session data
        sessionStorage.removeItem('has_master_key');
        sessionStorage.removeItem('temp_master_key_data');
        sessionStorage.removeItem('master_key_set_at');
      }
    }
  }

  /**
   * Set up periodic key restoration check (for HMR resilience)
   */
  private setupPeriodicKeyCheck(): void {
    setInterval(() => {
      const hasKeyFlag = sessionStorage.getItem('has_master_key') === 'true';
      const keyData = sessionStorage.getItem('temp_master_key_data');
      
      // If session storage indicates we should have a key but we don't, try to restore
      if (hasKeyFlag && keyData && !this.masterKey && !this.keyRestored) {
        console.log(`🔄 DocumentEncryptionService[${this.instanceId}]: Periodic key restoration check triggered`);
        this.attemptKeyRestoration();
      }
      
      // If we have a key but session storage doesn't reflect it, update storage
      if (this.masterKey && !hasKeyFlag) {
        console.log(`🔄 DocumentEncryptionService[${this.instanceId}]: Fixing session storage flags`);
        sessionStorage.setItem('has_master_key', 'true');
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Add a listener for master key changes
   */
  addMasterKeyChangeListener(listener: () => void): void {
    this.eventListeners.add(listener);
  }

  /**
   * Remove a listener for master key changes
   */
  removeMasterKeyChangeListener(listener: () => void): void {
    this.eventListeners.delete(listener);
  }

  /**
   * Notify all listeners of master key changes
   */
  private notifyMasterKeyChange(): void {
    console.log(`📢 DocumentEncryptionService[${this.instanceId}] notifying ${this.eventListeners.size} listeners of master key change`);
    this.eventListeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error in master key change listener:', error);
      }
    });
  }

  /**
   * Set the user's master key for encryption/decryption operations
   */
  async setMasterKey(masterKey: CryptoKey): Promise<void> {
    console.log(`🔐 DocumentEncryptionService[${this.instanceId}].setMasterKey called with:`, masterKey);
    this.masterKey = masterKey;
    this.keyRestored = true;
    
    try {
      // Check if key is extractable before attempting export
      if (masterKey.extractable) {
        const keyBuffer = await window.crypto.subtle.exportKey('raw', masterKey);
        const keyData = {
          keyBuffer: Array.from(new Uint8Array(keyBuffer)),
          timestamp: Date.now()
        };
        sessionStorage.setItem('temp_master_key_data', JSON.stringify(keyData));
      } else {
        console.warn('Master key is not extractable, skipping persistence');
      }
      
      sessionStorage.setItem('has_master_key', 'true');
      sessionStorage.setItem('master_key_set_at', Date.now().toString());
      
      console.log(`✅ Master key set on instance ${this.instanceId}. hasMasterKey():`, this.hasMasterKey());
      
    } catch (error) {
      console.error(`❌ Failed to persist master key:`, error);
      sessionStorage.setItem('has_master_key', 'true');
      sessionStorage.setItem('master_key_set_at', Date.now().toString());
    }
    
    this.notifyMasterKeyChange();
  }

  /**
   * Clear the master key from memory
   */
  clearMasterKey(): void {
    console.log(`🗑️ DocumentEncryptionService[${this.instanceId}].clearMasterKey called`);
    this.masterKey = null;
    this.keyRestored = false;
    
    // Clear all master key related storage
    sessionStorage.removeItem('has_master_key');
    sessionStorage.removeItem('master_key_set_at');
    sessionStorage.removeItem('temp_master_key_data');
    
    // Notify all listeners that the master key has been cleared
    this.notifyMasterKeyChange();
  }

  /**
   * Check if master key is available
   */
  hasMasterKey(): boolean {
    const hasKey = this.masterKey !== null;
    const sessionFlag = sessionStorage.getItem('has_master_key') === 'true';
    const setAt = sessionStorage.getItem('master_key_set_at');
    const hasKeyData = sessionStorage.getItem('temp_master_key_data') !== null;
    
    console.log(`🔍 DocumentEncryptionService[${this.instanceId}].hasMasterKey() called:`, {
      instanceId: this.instanceId,
      hasKey,
      sessionFlag,
      hasKeyData,
      keyRestored: this.keyRestored,
      setAt: setAt ? new Date(parseInt(setAt)).toISOString() : 'N/A',
      masterKey: this.masterKey ? 'EXISTS' : 'NULL',
      listenerCount: this.eventListeners.size
    });
    
    // If session flag indicates we should have a key but don't, try restoration first
    if (sessionFlag && !hasKey && hasKeyData && !this.keyRestored) {
      console.log(`🔄 Master key missing but restoration data available. Attempting restoration...`);
      // Trigger restoration attempt (async, but don't wait for it)
      this.attemptKeyRestoration().catch(error => {
        console.error('Key restoration failed:', error);
      });
      return false; // Return false for now, will be true after restoration
    }
    
    // If session flag indicates we should have a key but don't and no restoration data
    if (sessionFlag && !hasKey && !hasKeyData) {
      console.warn(`⚠️ Master key flag set but key missing and no restoration data! Clearing session flags.`);
      
      // Clear the inconsistent session flags
      sessionStorage.removeItem('has_master_key');
      sessionStorage.removeItem('master_key_set_at');
      sessionStorage.removeItem('temp_master_key_data');
    }
    
    return hasKey;
  }

  /**
   * Get debug info about this service instance
   */
  getDebugInfo(): {
    instanceId: string;
    hasMasterKey: boolean;
    listenerCount: number;
    sessionFlags: {
      has_master_key: boolean;
      master_key_set_at: string | null;
    };
  } {
    return {
      instanceId: this.instanceId,
      hasMasterKey: this.masterKey !== null,
      listenerCount: this.eventListeners.size,
      sessionFlags: {
        has_master_key: sessionStorage.getItem('has_master_key') === 'true',
        master_key_set_at: sessionStorage.getItem('master_key_set_at')
      }
    };
  }

  /**
   * Validate file for encryption
   */
  private validateFile(file: File): void {
    if (file.size === 0) {
      throw new DocumentEncryptionError('File is empty', 'EMPTY_FILE');
    }

    if (file.size > DOCUMENT_ENCRYPTION_CONFIG.MAX_FILE_SIZE) {
      throw new DocumentEncryptionError(
        `File size exceeds maximum limit of ${DOCUMENT_ENCRYPTION_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`,
        'FILE_TOO_LARGE'
      );
    }

    // Optional: Check file type (can be expanded as needed)
    if (file.type && !DOCUMENT_ENCRYPTION_CONFIG.SUPPORTED_TYPES.includes(file.type)) {
      console.warn(`File type ${file.type} is not in the supported types list, but will be processed anyway`);
    }
  }

  /**
   * Encrypt a file for upload using DEK architecture
   */
  async encryptFileForUpload(
    file: File,
    onProgress?: (progress: EncryptionProgress) => void
  ): Promise<EncryptedDocumentUpload> {
    if (!isWebCryptoSupported()) {
      throw new DocumentEncryptionError('Web Crypto API not supported', 'CRYPTO_NOT_SUPPORTED');
    }

    if (!this.masterKey) {
      throw new DocumentEncryptionError('Master key not available', 'NO_MASTER_KEY');
    }

    try {
      // Validate file
      this.validateFile(file);
      
      // Report progress: Reading file
      onProgress?.({
        stage: 'reading',
        progress: 10,
        message: 'Reading file content...'
      });

      // Read file data
      const fileData = await file.arrayBuffer();
      
      // Report progress: Encrypting
      onProgress?.({
        stage: 'encrypting',
        progress: 40,
        message: 'Generating encryption keys...'
      });

      // Create document encryption (generates DEK and encrypts with master key)
      const { encryptedDocument, dekInfo } = await createDocumentEncryption(
        fileData,
        this.masterKey
      );

      // Report progress: Creating encrypted blob
      onProgress?.({
        stage: 'encrypting',
        progress: 80,
        message: 'Creating encrypted file...'
      });

      // Combine ciphertext and auth tag into a single blob for upload
      const ciphertextArray = new Uint8Array(base64ToArrayBuffer(encryptedDocument.ciphertext));
      const authTagArray = new Uint8Array(base64ToArrayBuffer(encryptedDocument.authTag));
      
      const encryptedArray = new Uint8Array(ciphertextArray.length + authTagArray.length);
      encryptedArray.set(ciphertextArray);
      encryptedArray.set(authTagArray, ciphertextArray.length);
      
      const encryptedBlob = new Blob([encryptedArray], { 
        type: 'application/octet-stream' 
      });

      // Report progress: Complete
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'File encryption complete'
      });

      return {
        file,
        encryptedData: encryptedBlob,
        dekInfo,
        originalSize: file.size,
        encryptedSize: encryptedBlob.size
      };

    } catch (error) {
      throw new DocumentEncryptionError(
        `Failed to encrypt file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ENCRYPTION_FAILED'
      );
    }
  }

  /**
   * Prepare FormData for encrypted document upload
   */
  async prepareEncryptedUpload(
    encryptedUpload: EncryptedDocumentUpload,
    metadata: {
      name: string;
      description?: string;
      parent_id?: number | null;
      tags?: string[];
      doc_metadata?: Record<string, any>;
    }
  ): Promise<FormData> {
    const formData = new FormData();
    
    // Add the encrypted file
    formData.append('file', encryptedUpload.encryptedData, encryptedUpload.file.name);
    
    // Create upload metadata object that matches backend DocumentUpload schema
    const uploadMetadata = {
      name: metadata.name,
      parent_id: metadata.parent_id,
      description: metadata.description || '',
      tags: metadata.tags || [],
      doc_metadata: metadata.doc_metadata || {},
      is_sensitive: true, // Mark as sensitive since it's encrypted
      
      // Zero-Knowledge encryption fields
      encrypted_dek: serializeDEKInfo(encryptedUpload.dekInfo),
      encryption_algorithm: encryptedUpload.dekInfo.algorithm,
      encryption_iv: encryptedUpload.dekInfo.dekIv,
      original_filename: encryptedUpload.file.name,
      mime_type: encryptedUpload.file.type,
      original_size: encryptedUpload.originalSize,
      
      // File validation
      file_size: encryptedUpload.encryptedSize,
      file_hash: null, // Not computed for zero-knowledge uploads yet
    };
    
    // Add the upload metadata as JSON string (matching backend expectation)
    formData.append('upload_data', JSON.stringify(uploadMetadata));
    
    return formData;
  }

  /**
   * Decrypt a document using its stored DEK information
   */
  async decryptDocument(
    document: Document,
    encryptedData: ArrayBuffer,
    onProgress?: (progress: DecryptionProgress) => void
  ): Promise<DocumentDecryptionResult> {
    if (!isWebCryptoSupported()) {
      throw new DocumentDecryptionError('Web Crypto API not supported', 'CRYPTO_NOT_SUPPORTED');
    }

    if (!this.masterKey) {
      throw new DocumentDecryptionError('Master key not available', 'NO_MASTER_KEY');
    }

    if (!document.encrypted_dek) {
      throw new DocumentDecryptionError('Document DEK information not available', 'NO_DEK_INFO');
    }

    try {
      // Report progress: Starting decryption
      onProgress?.({
        stage: 'decrypting',
        progress: 10,
        message: 'Preparing for decryption...'
      });

      // Extract ciphertext and auth tag from encrypted data with dynamic auth tag length calculation
      const encryptedArray = new Uint8Array(encryptedData);
      
      // Calculate auth tag length dynamically based on original file size
      const originalFileSize = document.file_size || 0;
      const totalEncryptedSize = encryptedArray.length;
      const calculatedAuthTagLength = totalEncryptedSize - originalFileSize;
      
      console.log(`🔍 Auth tag extraction analysis:`, {
        originalFileSize,
        totalEncryptedSize,
        calculatedAuthTagLength,
        documentName: document.name
      });
      
      // Determine correct ciphertext and auth tag split
      let ciphertextLength: number;
      let authTagLength: number;
      
      // Validate calculated auth tag length (AES-GCM typically uses 12-16 bytes)
      if (originalFileSize > 0 && calculatedAuthTagLength >= 12 && calculatedAuthTagLength <= 32) {
        // Use dynamic calculation based on original file size
        ciphertextLength = originalFileSize;
        authTagLength = calculatedAuthTagLength;
        console.log(`✅ Using dynamic auth tag length: ${authTagLength} bytes`);
      } else {
        // Fallback to standard AES-GCM auth tag length
        authTagLength = 16;
        ciphertextLength = encryptedArray.length - authTagLength;
        console.warn(`⚠️ Using fallback auth tag length (16 bytes). Calculated length ${calculatedAuthTagLength} seems invalid.`);
        console.warn(`Debug: originalFileSize=${originalFileSize}, totalSize=${totalEncryptedSize}`);
      }
      
      // Extract ciphertext and auth tag based on calculated lengths
      const ciphertext = encryptedArray.slice(0, ciphertextLength);
      const authTag = encryptedArray.slice(ciphertextLength);
      
      // Validate extraction results
      if (ciphertext.length === 0 || authTag.length === 0) {
        throw new DocumentDecryptionError(
          `Invalid auth tag extraction: ciphertext=${ciphertext.length}bytes, authTag=${authTag.length}bytes`,
          'AUTH_TAG_EXTRACTION_FAILED'
        );
      }

      // Convert to base64 for decryption utilities
      // IMPORTANT: When slicing Uint8Array, the .buffer property still points to the original buffer
      // We need to create new ArrayBuffers with only the sliced data
      const ciphertextBuffer = ciphertext.buffer.slice(ciphertext.byteOffset, ciphertext.byteOffset + ciphertext.byteLength);
      const authTagBuffer = authTag.buffer.slice(authTag.byteOffset, authTag.byteOffset + authTag.byteLength);
      
      const ciphertextBase64 = arrayBufferToBase64(ciphertextBuffer);
      const authTagBase64 = arrayBufferToBase64(authTagBuffer);
      
      console.log(`🔧 Base64 conversion completed:`, {
        ciphertextLength: ciphertext.length,
        authTagLength: authTag.length,
        ciphertextBase64Length: ciphertextBase64.length,
        authTagBase64Length: authTagBase64.length
      });

      // Report progress: Decrypting with DEK
      onProgress?.({
        stage: 'decrypting',
        progress: 50,
        message: 'Decrypting document...'
      });

      // Decrypt document using DEK and master key
      const decryptedData = await decryptDocumentWithMasterKey(
        {
          ciphertext: ciphertextBase64,
          iv: document.encryption_iv!,
          authTag: authTagBase64
        },
        document.encrypted_dek,
        this.masterKey
      );

      // Report progress: Complete
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Decryption complete'
      });

      return {
        decryptedData,
        originalFilename: document.name,
        mimeType: document.mime_type || 'application/octet-stream',
        originalSize: document.file_size || decryptedData.byteLength
      };

    } catch (error) {
      throw new DocumentDecryptionError(
        `Failed to decrypt document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DECRYPTION_FAILED'
      );
    }
  }

  /**
   * Download and decrypt a document, then trigger browser download as encrypted file
   */
  async downloadAndDecryptDocument(
    document: Document,
    onProgress?: (progress: DecryptionProgress) => void
  ): Promise<void> {
    try {
      // Check if this is a zero-knowledge or legacy encrypted document
      const isZeroKnowledge = Boolean(document.encrypted_dek);
      const isLegacyEncrypted = Boolean(document.encryption_key_id && document.encryption_iv && document.encryption_auth_tag);

      if (!isZeroKnowledge && !isLegacyEncrypted) {
        throw new DocumentDecryptionError(
          'Document is not encrypted or encryption type is not supported',
          'UNSUPPORTED_ENCRYPTION'
        );
      }

      // Report progress: Downloading
      onProgress?.({
        stage: 'downloading',
        progress: 20,
        message: 'Downloading encrypted document...'
      });

      let decryptedData: ArrayBuffer;
      let originalFilename: string;
      let mimeType: string;

      if (isZeroKnowledge) {
        // Handle zero-knowledge documents using the existing flow
        console.log('📥 Processing zero-knowledge encrypted document');
        
        // Download the encrypted file
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8002'}/api/v1/documents/${document.id}/download`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.getAccessToken()}`,
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `Download failed: ${response.status}`);
        }

        const encryptedDataBuffer = await response.arrayBuffer();

        // Report progress: Downloaded, starting decryption
        onProgress?.({
          stage: 'decrypting',
          progress: 40,
          message: 'Decrypting zero-knowledge document...'
        });

        // Decrypt the document using zero-knowledge method
        const decryptionResult = await this.decryptDocument(
          document,
          encryptedDataBuffer,
          onProgress
        );

        decryptedData = decryptionResult.decryptedData;
        originalFilename = decryptionResult.originalFilename;
        mimeType = decryptionResult.mimeType;

      } else {
        // Handle legacy encrypted documents
        console.log('📥 Processing legacy encrypted document');
        
        // Import legacy decryption utilities
        const { useEncryption } = await import('../hooks/useEncryption');
        const { documentsApi } = await import('./api/documents');

        // Get user password for legacy decryption
        const encryptionPassword = await this.getUserDecryptionPassword();

        // Report progress: Downloaded, starting decryption
        onProgress?.({
          stage: 'decrypting',
          progress: 40,
          message: 'Decrypting legacy encrypted document...'
        });

        try {
          // Download and decrypt using the legacy method
          const encryptedBlob = await documentsApi.fetchDocumentBlob(document.id);
          const encryptedDataArray = await encryptedBlob.arrayBuffer();

          // Decrypt using the legacy encryption service
          const legacyDecryptedData = await this.decryptLegacyDocument(
            encryptedDataArray,
            document,
            encryptionPassword
          );

          decryptedData = legacyDecryptedData;
          originalFilename = document.name;
          mimeType = document.mime_type || 'application/octet-stream';

        } catch (error) {
          throw new DocumentDecryptionError(
            `Failed to decrypt legacy document: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'LEGACY_DECRYPTION_FAILED'
          );
        }
      }

      // Report progress: Creating encrypted wrapper
      onProgress?.({
        stage: 'decrypting',
        progress: 80,
        message: 'Creating password-protected file...'
      });

      // Create encrypted file wrapper that requires password to open
      const { createEncryptedFileWrapper } = await import('../utils/encryptedFileWrapper');
      
      // Use the user's decryption password as the file password
      const userPassword = await this.getUserDecryptionPassword();
      
      const encryptedWrapper = await createEncryptedFileWrapper(
        decryptedData,
        originalFilename,
        mimeType,
        userPassword
      );

      // Create filename with .docsafe extension
      const encryptedFilename = this.addEncryptedExtension(originalFilename);

      // Create and download the encrypted file
      const encryptedBlob = new Blob([encryptedWrapper.wrappedData], { 
        type: 'application/octet-stream' 
      });

      // Report progress: Complete
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'Secure download ready'
      });

      this.downloadBlob(encryptedBlob, encryptedFilename);

    } catch (error) {
      throw new DocumentDecryptionError(
        `Failed to download and decrypt document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DOWNLOAD_DECRYPT_FAILED'
      );
    }
  }

  /**
   * Download document in original decrypted format (for preview/internal use)
   */
  async downloadAndDecryptDocumentAsOriginal(
    document: Document,
    onProgress?: (progress: DecryptionProgress) => void
  ): Promise<void> {
    try {
      // Report progress: Downloading
      onProgress?.({
        stage: 'downloading',
        progress: 20,
        message: 'Downloading encrypted document...'
      });

      // Download the encrypted file
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8002'}/api/v1/documents/${document.id}/download`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.getAccessToken()}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Download failed: ${response.status}`);
      }

      const encryptedData = await response.arrayBuffer();

      // Report progress: Downloaded, starting decryption
      onProgress?.({
        stage: 'decrypting',
        progress: 40,
        message: 'Downloaded, starting decryption...'
      });

      // Decrypt the document
      const decryptionResult = await this.decryptDocument(
        document,
        encryptedData,
        onProgress
      );

      // Create and download the decrypted file in original format
      const decryptedBlob = new Blob([decryptionResult.decryptedData], { 
        type: decryptionResult.mimeType 
      });
      this.downloadBlob(decryptedBlob, decryptionResult.originalFilename);

    } catch (error) {
      throw new DocumentDecryptionError(
        `Failed to download and decrypt document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DOWNLOAD_DECRYPT_FAILED'
      );
    }
  }

  /**
   * Validate document encryption capabilities
   */
  async validateEncryptionCapabilities(): Promise<boolean> {
    try {
      if (!isWebCryptoSupported()) {
        return false;
      }

      // Test DEK functionality
      return await testDEKFunctionality();
    } catch {
      return false;
    }
  }

  /**
   * Get encryption status for a document
   */
  getDocumentEncryptionStatus(document: Document): {
    isEncrypted: boolean;
    hasDEK: boolean;
    canDecrypt: boolean;
    encryptionMethod?: string;
  } {
    const isEncrypted = Boolean(document.encrypted_dek && document.encryption_iv);
    const hasDEK = Boolean(document.encrypted_dek);
    const canDecrypt = isEncrypted && this.hasMasterKey();
    
    let encryptionMethod: string | undefined;
    if (hasDEK) {
      try {
        const dekInfo = parseDEKInfo(document.encrypted_dek!);
        encryptionMethod = dekInfo.algorithm;
      } catch {
        // Error parsing DEK info
      }
    }

    return {
      isEncrypted,
      hasDEK,
      canDecrypt,
      encryptionMethod
    };
  }

  /**
   * Helper method to download a blob
   */
  private downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  /**
   * Decrypt a legacy encrypted document using the old encryption method
   */
  private async decryptLegacyDocument(
    encryptedData: ArrayBuffer,
    document: Document,
    password: string
  ): Promise<ArrayBuffer> {
    try {
      console.log('🔑 Decrypting legacy document:', {
        documentId: document.id,
        documentName: document.name,
        encryptedSize: encryptedData.byteLength,
        hasEncryptionKeyId: !!document.encryption_key_id,
        hasIV: !!document.encryption_iv,
        hasAuthTag: !!document.encryption_auth_tag
      });

      // Import the legacy decryption utilities
      const { decrypt } = await import('../utils/encryption');
      const { base64ToArrayBuffer } = await import('../utils/encryption');

      // Validate document has legacy encryption fields
      if (!document.encryption_key_id || !document.encryption_iv || !document.encryption_auth_tag) {
        throw new Error('Missing legacy encryption metadata');
      }

      // Convert the encrypted data to the format expected by legacy decryption
      const encryptedDataBase64 = await this.arrayBufferToBase64(encryptedData);
      
      // Construct the legacy encrypted object format
      const legacyEncryptedObject = {
        ciphertext: encryptedDataBase64,
        iv: document.encryption_iv,
        authTag: document.encryption_auth_tag
      };

      console.log('🔧 Legacy decryption parameters:', {
        ciphertextLength: legacyEncryptedObject.ciphertext.length,
        ivLength: legacyEncryptedObject.iv.length,
        authTagLength: legacyEncryptedObject.authTag.length
      });

      // First derive the key from password
      const { deriveKey } = await import('../utils/encryption');
      const salt = base64ToArrayBuffer(document.encryption_key_id!); // Use key_id as salt for legacy

      const derivedKey = await deriveKey({
        password: password,
        salt: new Uint8Array(salt),
        iterations: 100000 // Default iterations for legacy documents
      });

      // Decrypt using the legacy method with the derived key
      const decryptionInput = {
        ciphertext: legacyEncryptedObject.ciphertext,
        iv: legacyEncryptedObject.iv,
        authTag: legacyEncryptedObject.authTag,
        key: derivedKey
      };

      const decryptedData = await decrypt(decryptionInput);

      console.log('✅ Legacy decryption successful:', {
        originalSize: encryptedData.byteLength,
        decryptedSize: decryptedData.byteLength
      });

      return decryptedData;

    } catch (error) {
      console.error('❌ Legacy decryption failed:', error);
      throw new Error(`Legacy decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper method to convert ArrayBuffer to Base64
   */
  private async arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
    const { arrayBufferToBase64 } = await import('../utils/encryption');
    return arrayBufferToBase64(buffer);
  }

  /**
   * Helper method to get access token
   */
  private getAccessToken(): string | null {
    // Check if remember me is enabled
    const rememberMe = localStorage.getItem('remember_me') === 'true';
    
    if (rememberMe) {
      return localStorage.getItem('access_token');
    }
    return sessionStorage.getItem('access_token');
  }

  /**
   * Get user's decryption password (prompt if needed)
   */
  private async getUserDecryptionPassword(): Promise<string> {
    // Try to get the stored password from multiple sources
    const storedPassword =
      sessionStorage.getItem('temp_decryption_password') ||
      localStorage.getItem('encryption_password') ||
      sessionStorage.getItem('encryption_password');

    if (storedPassword) {
      console.log('🔑 Using stored encryption password for decryption');
      return storedPassword;
    }

    // Prompt user for password
    const password = prompt(
      'Enter password to protect downloaded file:\n(This password will be required to open the file outside this application)'
    );
    
    if (!password) {
      throw new Error('Password required to create encrypted file');
    }

    // Temporarily store password for this session
    sessionStorage.setItem('temp_decryption_password', password);
    
    // Clear password after 5 minutes for security
    setTimeout(() => {
      sessionStorage.removeItem('temp_decryption_password');
    }, 5 * 60 * 1000);

    return password;
  }

  /**
   * Add encrypted file extension to filename
   */
  private addEncryptedExtension(originalFilename: string): string {
    return originalFilename + '.docsafe';
  }

  /**
   * Get encryption statistics for monitoring
   */
  getEncryptionStats(): {
    masterKeyAvailable: boolean;
    webCryptoSupported: boolean;
    maxFileSize: number;
    supportedTypesCount: number;
  } {
    return {
      masterKeyAvailable: this.hasMasterKey(),
      webCryptoSupported: isWebCryptoSupported(),
      maxFileSize: DOCUMENT_ENCRYPTION_CONFIG.MAX_FILE_SIZE,
      supportedTypesCount: DOCUMENT_ENCRYPTION_CONFIG.SUPPORTED_TYPES.length
    };
  }
}

// Export singleton instance
export const documentEncryptionService = new DocumentEncryptionService();