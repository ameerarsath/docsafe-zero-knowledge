/**
 * Encrypted File Backup Service for SecureVault
 *
 * Handles automatic backup of encrypted files after upload to ensure data redundancy
 * and protection against data loss. All backups maintain zero-knowledge encryption.
 */

import { documentsApi, Document } from './api/documents';

export interface BackupMetadata {
  document: Document;
  encryptedFile: File;
  originalFileName: string;
  backupPath: string;
  backupTimestamp: string;
  checksumOriginal: string;
  checksumBackup: string;
  backupSize: number;
  backupStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  encryptionKeyId: string;
}

export interface BackupOptions {
  enableAutoBackup?: boolean;
  backupRetentionDays?: number;
  maxBackupSize?: number;
  compressionEnabled?: boolean;
  verifyIntegrity?: boolean;
}

export class EncryptedBackupService {
  private static instance: EncryptedBackupService;
  private backupQueue: Map<string, BackupMetadata> = new Map();
  private isProcessing = false;
  private readonly MAX_CONCURRENT_BACKUPS = 2;
  private activeBackups = 0;

  static getInstance(): EncryptedBackupService {
    if (!EncryptedBackupService.instance) {
      EncryptedBackupService.instance = new EncryptedBackupService();
    }
    return EncryptedBackupService.instance;
  }

  /**
   * Schedule a backup for an encrypted file after upload
   */
  async scheduleBackup(
    document: Document,
    encryptedFile: File,
    options: BackupOptions = {}
  ): Promise<string> {
    const backupId = this.generateBackupId(document.id, document.name);

    // Calculate checksum for integrity verification
    const originalChecksum = await this.calculateFileChecksum(encryptedFile);

    const metadata: BackupMetadata = {
      document,
      encryptedFile,
      originalFileName: document.name,
      backupPath: this.generateBackupPath(document.id, document.name),
      backupTimestamp: new Date().toISOString(),
      checksumOriginal: originalChecksum,
      checksumBackup: '',
      backupSize: encryptedFile.size,
      backupStatus: 'pending',
      encryptionKeyId: document.encryption_key_id || ''
    };

    this.backupQueue.set(backupId, metadata);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processBackupQueue(options);
    }

    console.log(`Backup scheduled for document ${document.id}: ${document.name}`);
    return backupId;
  }

  /**
   * Process the backup queue
   */
  private async processBackupQueue(options: BackupOptions = {}): Promise<void> {
    if (this.isProcessing || this.activeBackups >= this.MAX_CONCURRENT_BACKUPS) {
      return;
    }

    this.isProcessing = true;

    try {
      for (const [backupId, metadata] of this.backupQueue.entries()) {
        if (metadata.backupStatus === 'pending' && this.activeBackups < this.MAX_CONCURRENT_BACKUPS) {
          this.activeBackups++;
          this.performBackup(backupId, metadata, options).finally(() => {
            this.activeBackups--;
          });
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Perform the actual backup operation
   */
  private async performBackup(
    backupId: string,
    metadata: BackupMetadata,
    options: BackupOptions
  ): Promise<void> {
    try {
      // Update status to in_progress
      metadata.backupStatus = 'in_progress';
      this.backupQueue.set(backupId, metadata);

      console.log(`Starting backup for document ${metadata.document.id}`);

      // The encrypted file is already in the metadata, convert to ArrayBuffer
      const encryptedFileData = await metadata.encryptedFile.arrayBuffer();

      // Create backup file with additional metadata
      const backupFile = await this.createBackupFile(encryptedFileData, metadata, options);

      // Verify integrity if enabled
      if (options.verifyIntegrity !== false) {
        const backupChecksum = await this.calculateFileChecksum(backupFile);
        metadata.checksumBackup = backupChecksum;

        if (!await this.verifyBackupIntegrity(backupFile, metadata)) {
          throw new Error('Backup integrity verification failed');
        }
      }

      // Store backup (this could be to a different storage location, cloud, etc.)
      await this.storeBackup(backupFile, metadata);

      // Update metadata
      metadata.backupStatus = 'completed';
      metadata.backupSize = backupFile.size;

      console.log(`Backup completed for document ${metadata.document.id}: ${metadata.backupPath}`);

      // Notify success
      this.notifyBackupSuccess(metadata);

    } catch (error) {
      console.error(`Backup failed for document ${metadata.document.id}:`, error);
      metadata.backupStatus = 'failed';

      // Notify failure
      this.notifyBackupFailure(metadata, error);
    } finally {
      this.backupQueue.set(backupId, metadata);
    }
  }

  /**
   * Create backup file with additional metadata
   */
  private async createBackupFile(
    encryptedData: ArrayBuffer,
    metadata: BackupMetadata,
    options: BackupOptions
  ): Promise<File> {
    // Create backup metadata
    const backupMetadata = {
      version: '1.0',
      documentId: metadata.document.id,
      originalFileName: metadata.originalFileName,
      backupTimestamp: metadata.backupTimestamp,
      encryptionKeyId: metadata.encryptionKeyId,
      originalChecksum: metadata.originalChecksum,
      backupOptions: options
    };

    // Convert metadata to JSON
    const metadataJson = JSON.stringify(backupMetadata);
    const metadataBytes = new TextEncoder().encode(metadataJson);

    // Create backup file structure:
    // [4 bytes: metadata length][metadata][encrypted file data]
    const metadataLengthBuffer = new ArrayBuffer(4);
    const metadataLengthView = new DataView(metadataLengthBuffer);
    metadataLengthView.setUint32(0, metadataBytes.length, true);

    // Combine all parts
    const backupData = new Uint8Array(
      metadataLengthBuffer.byteLength +
      metadataBytes.length +
      encryptedData.byteLength
    );

    let offset = 0;
    backupData.set(new Uint8Array(metadataLengthBuffer), offset);
    offset += metadataLengthBuffer.byteLength;

    backupData.set(metadataBytes, offset);
    offset += metadataBytes.length;

    backupData.set(new Uint8Array(encryptedData), offset);

    // Create backup file with .svbackup extension
    const backupFileName = `${metadata.originalFileName}.${metadata.document.id}.svbackup`;
    return new File([backupData], backupFileName, { type: 'application/octet-stream' });
  }

  /**
   * Verify backup integrity
   */
  private async verifyBackupIntegrity(backupFile: File, metadata: BackupMetadata): Promise<boolean> {
    try {
      // Read the backup file structure
      const arrayBuffer = await backupFile.arrayBuffer();
      const dataView = new DataView(arrayBuffer);

      // Read metadata length
      const metadataLength = dataView.getUint32(0, true);

      // Extract metadata
      const metadataBytes = arrayBuffer.slice(4, 4 + metadataLength);
      const metadataJson = new TextDecoder().decode(metadataBytes);
      const backupMetadata = JSON.parse(metadataJson);

      // Verify metadata integrity
      if (backupMetadata.documentId !== metadata.document.id ||
          backupMetadata.encryptionKeyId !== metadata.encryptionKeyId) {
        return false;
      }

      // Verify encrypted data exists
      const encryptedDataStart = 4 + metadataLength;
      const encryptedDataLength = arrayBuffer.byteLength - encryptedDataStart;

      return encryptedDataLength > 0;
    } catch (error) {
      console.error('Backup integrity verification failed:', error);
      return false;
    }
  }

  /**
   * Store backup (placeholder for actual storage implementation)
   */
  private async storeBackup(backupFile: File, metadata: BackupMetadata): Promise<void> {
    // This would typically store the backup to:
    // - Local storage (for development)
    // - Cloud storage (AWS S3, Google Cloud, etc.)
    // - Network attached storage
    // - Database BLOB storage

    console.log(`Storing backup: ${metadata.backupPath} (${backupFile.size} bytes)`);

    // For demonstration, we'll simulate storage
    // In a real implementation, you'd upload to your backup storage location
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upload time
  }

  /**
   * Calculate file checksum for integrity verification
   */
  private async calculateFileChecksum(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate unique backup ID
   */
  private generateBackupId(documentId: number, fileName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    return `backup_${documentId}_${timestamp}_${random}`;
  }

  /**
   * Generate backup path
   */
  private generateBackupPath(documentId: number, fileName: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `backups/${year}/${month}/${day}/${documentId}_${fileName}.svbackup`;
  }

  /**
   * Notify backup success
   */
  private notifyBackupSuccess(metadata: BackupMetadata): void {
    // Dispatch custom event for UI updates
    const event = new CustomEvent('backupCompleted', {
      detail: {
        documentId: metadata.document.id,
        fileName: metadata.originalFileName,
        backupPath: metadata.backupPath,
        timestamp: metadata.backupTimestamp
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Notify backup failure
   */
  private notifyBackupFailure(metadata: BackupMetadata, error: any): void {
    // Dispatch custom event for UI updates
    const event = new CustomEvent('backupFailed', {
      detail: {
        documentId: metadata.document.id,
        fileName: metadata.originalFileName,
        error: error.message || 'Unknown backup error',
        timestamp: metadata.backupTimestamp
      }
    });
    window.dispatchEvent(event);
  }

  /**
   * Get backup status for a document
   */
  getBackupStatus(documentId: number): BackupMetadata[] {
    const backups: BackupMetadata[] = [];
    for (const metadata of this.backupQueue.values()) {
      if (metadata.document.id === documentId) {
        backups.push(metadata);
      }
    }
    return backups;
  }

  /**
   * Get all backup statuses
   */
  getAllBackupStatuses(): BackupMetadata[] {
    return Array.from(this.backupQueue.values());
  }

  /**
   * Clean up completed or failed backups from queue
   */
  cleanupBackupQueue(): void {
    for (const [backupId, metadata] of this.backupQueue.entries()) {
      if (metadata.backupStatus === 'completed' || metadata.backupStatus === 'failed') {
        // Keep for some time before cleanup (e.g., 1 hour)
        const backupTime = new Date(metadata.backupTimestamp).getTime();
        const now = Date.now();
        const hourInMs = 60 * 60 * 1000;

        if (now - backupTime > hourInMs) {
          this.backupQueue.delete(backupId);
        }
      }
    }
  }
}
// Export singleton instance
export const encryptedBackupService = EncryptedBackupService.getInstance();