/**
 * Safe Preview Service for SecureVault
 * 
 * Provides robust document preview that correctly handles both encrypted
 * and unencrypted documents by detecting actual encryption status.
 */

import { Document } from './api/documents';
import { detectEncryptionStatus, validateDecryptionPossible, debugDocumentEncryption } from '../utils/encryptionDetection';
import { documentEncryptionService } from './documentEncryption';

export interface SafePreviewResult {
  success: boolean;
  previewData?: any;
  error?: string;
  requiresPassword?: boolean;
  encryptionStatus?: any;
  debugInfo?: any;
}

export class SafePreviewService {
  
  /**
   * Generate a safe preview that correctly handles encryption detection
   */
  async generateSafePreview(document: Document): Promise<SafePreviewResult> {
    
    console.log(`🔍 SafePreviewService: Starting preview for document ${document.id}`);
    
    try {
      // Step 1: Download file data for analysis
      console.log('📥 Downloading file data for analysis...');
      const fileData = await this.downloadDocumentData(document);
      
      // Step 2: Detect actual encryption status
      console.log('🔍 Detecting encryption status...');
      const encryptionStatus = await detectEncryptionStatus(document, fileData);
      
      console.log('🎯 Encryption detection result:', encryptionStatus);
      
      // Step 3: Handle based on detection result
      if (!encryptionStatus.isEncrypted) {
        console.log('📄 Document is unencrypted - generating direct preview');
        return await this.previewUnencryptedFile(fileData, document, encryptionStatus);
      }
      
      // Step 4: Document is encrypted - check if we can decrypt
      console.log('🔐 Document is encrypted - checking decryption capability');
      
      const decryptionValidation = validateDecryptionPossible(document, encryptionStatus);
      if (!decryptionValidation.canDecrypt) {
        return {
          success: false,
          requiresPassword: false,
          error: `Cannot decrypt document: ${decryptionValidation.reason}`,
          encryptionStatus
        };
      }
      
      // Check if we have master key
      if (!documentEncryptionService.hasMasterKey()) {
        console.log('🔑 Master key required for encrypted document');
        return {
          success: false,
          requiresPassword: true,
          error: 'Master key required for encrypted document preview',
          encryptionStatus
        };
      }
      
      // Step 5: Attempt decryption and preview
      console.log('🔓 Attempting to decrypt and preview document');
      return await this.previewEncryptedFile(fileData, document, encryptionStatus);
      
    } catch (error) {
      console.error('❌ Safe preview failed:', error);
      
      // Provide debug information
      const debugInfo = {
        error: error instanceof Error ? error.message : 'Unknown error',
        documentId: document.id,
        documentName: document.name,
        hasMasterKey: documentEncryptionService.hasMasterKey(),
        timestamp: new Date().toISOString()
      };
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        debugInfo
      };
    }
  }
  
  /**
   * Download document data for analysis
   */
  private async downloadDocumentData(document: Document): Promise<ArrayBuffer> {
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
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Download failed (${response.status}): ${errorText}`);
    }
    
    const fileData = await response.arrayBuffer();
    console.log(`📥 Downloaded ${fileData.byteLength} bytes`);
    
    return fileData;
  }
  
  /**
   * Preview unencrypted file directly
   */
  private async previewUnencryptedFile(
    fileData: ArrayBuffer, 
    document: Document,
    encryptionStatus: any
  ): Promise<SafePreviewResult> {
    
    try {
      console.log('📄 Generating preview for unencrypted file');
      
      // Use document preview system
      const { getDocumentPreview } = await import('./documentPreview');
      
      const blob = new Blob([fileData], { 
        type: document.mime_type || 'application/octet-stream' 
      });
      
      const previewResult = await getDocumentPreview(
        blob,
        document.name,
        document.mime_type || 'application/octet-stream'
      );
      
      console.log('✅ Unencrypted preview generated successfully');
      
      return {
        success: true,
        previewData: {
          ...previewResult,
          encryptionStatus: 'unencrypted',
          detectionResult: encryptionStatus
        },
        encryptionStatus
      };
      
    } catch (error) {
      console.error('❌ Unencrypted preview failed:', error);
      return {
        success: false,
        error: `Preview generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        encryptionStatus
      };
    }
  }
  
  /**
   * Preview encrypted file after decryption
   */
  private async previewEncryptedFile(
    fileData: ArrayBuffer,
    document: Document,
    encryptionStatus: any
  ): Promise<SafePreviewResult> {
    
    try {
      console.log('🔓 Decrypting document for preview');
      
      // Decrypt the document
      const decryptionResult = await documentEncryptionService.decryptDocument(
        document,
        fileData
      );
      
      console.log(`✅ Document decrypted successfully (${decryptionResult.decryptedData.byteLength} bytes)`);
      
      // Generate preview from decrypted content
      const { getDocumentPreview } = await import('./documentPreview');
      
      const blob = new Blob([decryptionResult.decryptedData], { 
        type: decryptionResult.mimeType 
      });
      
      const previewResult = await getDocumentPreview(
        blob,
        decryptionResult.originalFilename,
        decryptionResult.mimeType
      );
      
      console.log('✅ Encrypted document preview generated successfully');
      
      return {
        success: true,
        previewData: {
          ...previewResult,
          encryptionStatus: 'decrypted',
          detectionResult: encryptionStatus,
          originalSize: decryptionResult.originalSize
        },
        encryptionStatus
      };
      
    } catch (error) {
      console.error('❌ Encrypted preview failed:', error);
      
      // Provide specific error messages
      let errorMessage = 'Decryption failed';
      if (error instanceof Error) {
        if (error.message.includes('authentication') || error.message.includes('auth')) {
          errorMessage = 'Wrong password or corrupted encryption data';
        } else if (error.message.includes('key')) {
          errorMessage = 'Invalid encryption key or missing key data';
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
        requiresPassword: error instanceof Error && error.message.includes('key'),
        encryptionStatus
      };
    }
  }
  
  /**
   * Generate preview with password (for encrypted documents)
   */
  async generatePreviewWithPassword(
    document: Document, 
    password: string
  ): Promise<SafePreviewResult> {
    
    console.log(`🔑 Generating preview with password for document ${document.id}`);
    
    try {
      // Derive master key from password
      const { deriveKey, base64ToUint8Array } = await import('../utils/encryption');
      
      // Use document's encryption metadata to derive key
      let salt: Uint8Array;
      let iterations = 100000; // Default
      
      if (document.encryption_key_id) {
        // Legacy encryption - use key_id as salt
        salt = base64ToUint8Array(document.encryption_key_id);
      } else {
        // Generate default salt (this should ideally be stored)
        salt = new Uint8Array(32);
        console.warn('⚠️ Using default salt - this may not work for all documents');
      }
      
      console.log('🔑 Deriving master key from password...');
      const masterKey = await deriveKey({
        password,
        salt,
        iterations
      });
      
      // Set master key in encryption service
      await documentEncryptionService.setMasterKey(masterKey);
      
      console.log('✅ Master key set, attempting preview...');
      
      // Generate preview with the new master key
      return await this.generateSafePreview(document);
      
    } catch (error) {
      console.error('❌ Password-based preview failed:', error);
      return {
        success: false,
        error: `Password authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
  
  /**
   * Debug document encryption status
   */
  async debugDocument(document: Document): Promise<any> {
    try {
      const fileData = await this.downloadDocumentData(document);
      await debugDocumentEncryption(document, fileData);
      
      const encryptionStatus = await detectEncryptionStatus(document, fileData);
      const decryptionValidation = validateDecryptionPossible(document, encryptionStatus);
      
      return {
        document: {
          id: document.id,
          name: document.name,
          mime_type: document.mime_type,
          file_size: document.file_size,
          is_encrypted: document.is_encrypted,
          encrypted_dek: !!document.encrypted_dek,
          encryption_iv: !!document.encryption_iv,
          encryption_key_id: !!document.encryption_key_id,
          encryption_auth_tag: !!document.encryption_auth_tag
        },
        fileData: {
          size: fileData.byteLength,
          header: Array.from(new Uint8Array(fileData.slice(0, 32))).map(b => b.toString(16).padStart(2, '0')).join(' ')
        },
        encryptionStatus,
        decryptionValidation,
        serviceStatus: {
          hasMasterKey: documentEncryptionService.hasMasterKey(),
          debugInfo: documentEncryptionService.getDebugInfo()
        }
      };
      
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        document: { id: document.id, name: document.name }
      };
    }
  }
  
  /**
   * Get access token for API requests
   */
  private getAccessToken(): string | null {
    const rememberMe = localStorage.getItem('remember_me') === 'true';
    return rememberMe 
      ? localStorage.getItem('access_token')
      : sessionStorage.getItem('access_token');
  }
}

// Export singleton instance
export const safePreviewService = new SafePreviewService();

// Make debug functions available globally
if (typeof window !== 'undefined') {
  (window as any).safePreviewService = safePreviewService;
  (window as any).debugDocumentPreview = async (documentId: number) => {
    // This would need to fetch the document first
    console.log(`To debug document ${documentId}, use: safePreviewService.debugDocument(document)`);
  };
}