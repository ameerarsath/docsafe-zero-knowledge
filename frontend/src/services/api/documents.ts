/**
 * Document API Service for SecureVault
 * 
 * Provides API methods for document management including:
 * - Document upload, download, and CRUD operations
 * - Folder management and navigation
 * - Search and filtering
 * - Permissions and sharing
 */

import { apiRequest } from '../api';

// Token management utility (matching api.ts)
class TokenManager {
  private static ACCESS_TOKEN_KEY = 'access_token';
  private static REMEMBER_ME_KEY = 'remember_me';

  static getAccessToken(): string | null {
    if (this.getRememberMe()) {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    }
    return sessionStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  static getRememberMe(): boolean {
    return localStorage.getItem(this.REMEMBER_ME_KEY) === 'true';
  }
}

export interface Document {
  id: number;
  name: string;
  description?: string;
  document_type: 'document' | 'folder';
  mime_type?: string;
  file_size?: number;
  file_hash_sha256?: string;
  storage_path?: string;
  parent_id?: number | null;
  owner_id: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  tags: string[];
  doc_metadata: Record<string, any>;
  
  encryption_key_id?: string;
  encryption_iv?: string;
  encryption_auth_tag?: string;
  
  path?: string;
  depth?: number;
  children?: Document[];
}

export interface DocumentListParams {
  parent_id?: number | null;
  document_type?: 'document' | 'folder' | 'all';
  search?: string;
  tags?: string[];
  sort_by?: 'name' | 'created_at' | 'updated_at' | 'file_size';
  sort_order?: 'asc' | 'desc';
  page?: number;
  size?: number;
  include_deleted?: boolean;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
  page: number;
  size: number;
  has_next: boolean;
}

export interface DocumentCreateParams {
  name: string;
  description?: string;
  document_type: 'document' | 'folder';
  parent_id?: number | null;
  tags?: string[];
  doc_metadata?: Record<string, any>;
}

export interface DocumentUpdateParams {
  name?: string;
  description?: string;
  parent_id?: number | null;
  tags?: string[];
  doc_metadata?: Record<string, any>;
}

export interface BulkOperationParams {
  document_ids: number[];
  target_folder_id?: number | null;
  operation: 'move' | 'copy' | 'delete';
  conflict_resolution?: 'skip' | 'replace' | 'rename';
}

export interface DocumentPathResponse {
  path: Document[];
}

export class DocumentsApiService {
  /**
   * List documents with optional filtering and pagination
   */
  async listDocuments(params: DocumentListParams = {}): Promise<DocumentListResponse> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'tags' && Array.isArray(value)) {
          // Tags should be comma-separated string for backend
          searchParams.append(key, value.join(','));
        } else if (Array.isArray(value)) {
          searchParams.append(key, JSON.stringify(value));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });

    const response = await apiRequest<DocumentListResponse>('GET', `/api/v1/documents?${searchParams}`);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to load documents');
    }
    
    return response.data!;
  }

  /**
   * Get a specific document by ID
   */
  async getDocument(documentId: number): Promise<Document> {
    const response = await apiRequest<Document>('GET', `/api/v1/documents/${documentId}`);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to get document');
    }
    
    return response.data!;
  }

  /**
   * Create a new document or folder
   */
  async createDocument(params: DocumentCreateParams): Promise<Document> {
    const response = await apiRequest<Document>('POST', '/api/v1/documents', params);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to create document');
    }
    
    return response.data!;
  }

  /**
   * Update document metadata
   */
  async updateDocument(documentId: number, params: DocumentUpdateParams): Promise<Document> {
    const response = await apiRequest<Document>('PUT', `/api/v1/documents/${documentId}`, params);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to update document');
    }
    
    return response.data!;
  }

  /**
   * Delete a document (soft delete)
   */
  async deleteDocument(documentId: number): Promise<void> {
    const response = await apiRequest<void>('DELETE', `/api/v1/documents/${documentId}`);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to delete document');
    }
  }

  /**
   * Restore a deleted document
   */
  async restoreDocument(documentId: number): Promise<Document> {
    const response = await apiRequest<Document>('POST', `/api/v1/documents/${documentId}/restore`);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to restore document');
    }
    
    return response.data!;
  }

  /**
   * Upload a document with encrypted file
   */
  async uploadDocument(
    formData: FormData,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<Document> {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8002'}/api/v1/documents/upload`, {
      method: 'POST',
      body: formData,
      signal,
      headers: {
        'Authorization': `Bearer ${TokenManager.getAccessToken()}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Upload failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Download a document
   */
  async downloadDocument(documentId: number, password?: string): Promise<void> {
    // Starting document download
    
    try {
      // First, get document metadata for encryption parameters
      const document = await this.getDocument(documentId);
      // Document retrieved successfully
      
      // Download the encrypted file
      const params = password ? `?password=${encodeURIComponent(password)}` : '';
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8002'}/api/v1/documents/${documentId}/download${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TokenManager.getAccessToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Download failed: ${response.status}`);
      }

      // Get encrypted file data
      const encryptedBlob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || document.name || `document-${documentId}`;

      // Downloaded encrypted blob successfully

      // Check if the document has encryption metadata
      if (document.encryption_key_id && document.encryption_iv && document.encryption_auth_tag) {
        // Document is encrypted, starting decryption
        // Document is encrypted, decrypt it
        await this.decryptAndDownload(encryptedBlob, document, filename);
      } else {
        // Document is not encrypted, downloading as-is
        // Document is not encrypted, download as-is
        this.downloadBlob(encryptedBlob, filename);
      }
    } catch (error) {
      // Download failed
      throw error;
    }
  }

  /**
   * Decrypt and download an encrypted document
   */
  private async decryptAndDownload(encryptedBlob: Blob, document: Document, filename: string): Promise<void> {
    // Dynamic import to avoid circular dependencies
    const { decrypt, deriveKey, base64ToArrayBuffer, base64ToUint8Array } = await import('../../utils/encryption');
    const { encryptionApi } = await import('./encryption');

    try {
      // Starting decryption process for document

      // Get the encryption key
      const encryptionKey = await encryptionApi.getKey(document.encryption_key_id!);
      // Retrieved encryption key successfully
      
      // Prompt user for password to derive the decryption key
      const userPassword = window.prompt('Enter your encryption password to decrypt this document:');
      if (!userPassword) {
        throw new Error('Password required for decryption');
      }

      // Derive the decryption key
      const salt = base64ToUint8Array(encryptionKey.salt);
      // Salt processed for key derivation
      
      const cryptoKey = await deriveKey({
        password: userPassword,
        salt,
        iterations: encryptionKey.iterations
      });
      // Derived crypto key successfully

      // Convert blob to array buffer for decryption
      const arrayBuffer = await encryptedBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      // Downloaded file processed for decryption
      
      // Try both approaches: using auth tag from file vs database
      const authTagLength = 16; // 128 bits for AES-GCM
      const ciphertextLength = uint8Array.length - authTagLength;
      
      const ciphertext = uint8Array.slice(0, ciphertextLength);
      const authTagFromFile = uint8Array.slice(ciphertextLength);
      
      // Split file data into ciphertext and auth tag

      // Convert to base64 for the decryption function (handle large arrays safely)
      const ciphertextBase64 = btoa(Array.from(ciphertext).map(byte => String.fromCharCode(byte)).join(''));
      const authTagFromFileBase64 = btoa(String.fromCharCode(...authTagFromFile));
      
      // Base64 conversions completed

      let decryptedData;
      
      // Try with auth tag from file first
      try {
        // Attempting decryption with auth tag from file
        decryptedData = await decrypt({
          ciphertext: ciphertextBase64,
          iv: document.encryption_iv!,
          authTag: authTagFromFileBase64,
          key: cryptoKey
        });
        // Decryption successful using auth tag from file
      } catch (fileAuthError) {
        // Decryption failed with file auth tag
        
        // Try with auth tag from database
        try {
          // Attempting decryption with auth tag from database
          decryptedData = await decrypt({
            ciphertext: ciphertextBase64,
            iv: document.encryption_iv!,
            authTag: document.encryption_auth_tag!,
            key: cryptoKey
          });
          // Decryption successful using auth tag from database
        } catch (dbAuthError) {
          // Decryption failed with database auth tag
          
          // Try direct Web Crypto API decryption (entire file as-is)
          try {
            // Attempting direct Web Crypto API decryption
            const iv = base64ToUint8Array(document.encryption_iv!);
            const decryptParams = {
              name: 'AES-GCM',
              iv: iv
            };
            
            decryptedData = await window.crypto.subtle.decrypt(
              decryptParams,
              cryptoKey,
              uint8Array
            );
            // Direct Web Crypto API decryption successful
          } catch (directError) {
            // Direct Web Crypto API decryption failed
            throw new Error('All decryption methods failed');
          }
        }
      }

      // Decryption completed successfully

      // Create decrypted file blob
      const decryptedBlob = new Blob([decryptedData], { type: document.mime_type || 'application/octet-stream' });
      // Created decrypted blob successfully
      
      // Download the decrypted file
      this.downloadBlob(decryptedBlob, filename);
      // Download initiated successfully
      
    } catch (error) {
      // Decryption failed
      throw new Error(`Failed to decrypt document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download a blob with the given filename
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
   * Get document path/breadcrumb (client-side implementation)
   */
  async getDocumentPath(documentId: number): Promise<DocumentPathResponse> {
    // Build path by walking up the folder hierarchy
    const path: any[] = [];
    let currentId: number | null = documentId;
    
    while (currentId) {
      try {
        const doc = await this.getDocument(currentId);
        path.unshift(doc); // Add to beginning of array
        currentId = doc.parent_id;
      } catch (error) {
        // Failed to get document in path
        break;
      }
    }
    
    return {
      folder_id: documentId,
      path: path,
      depth: path.length
    };
  }

  /**
   * Get all folders for folder tree
   */
  async getFolders(): Promise<Document[]> {
    const response = await apiRequest<DocumentListResponse>('GET', '/api/v1/documents/', {
      document_type: 'folder',
      size: 1000 // Get all folders
    });
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to get folders');
    }
    
    return response.data!.documents;
  }

  /**
   * Move documents to a different folder
   */
  async moveDocuments(params: BulkOperationParams): Promise<void> {
    const bulkParams = {
      document_ids: params.document_ids,
      operation: 'move',
      parameters: {
        target_parent_id: params.target_folder_id,
        conflict_resolution: params.conflict_resolution || 'rename'
      }
    };
    
    const response = await apiRequest<void>('POST', '/api/v1/documents/bulk-operation', bulkParams);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to move documents');
    }
  }

  /**
   * Copy documents to a different folder
   */
  async copyDocuments(params: BulkOperationParams): Promise<void> {
    const bulkParams = {
      document_ids: params.document_ids,
      operation: 'copy',
      parameters: {
        target_parent_id: params.target_folder_id,
        conflict_resolution: params.conflict_resolution || 'rename'
      }
    };
    
    const response = await apiRequest<void>('POST', '/api/v1/documents/bulk-operation', bulkParams);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to copy documents');
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(query: string, filters?: Partial<DocumentListParams>): Promise<DocumentListResponse> {
    return this.listDocuments({ ...filters, search: query });
  }

  /**
   * Get document statistics
   */
  async getDocumentStats(): Promise<{
    total_documents: number;
    total_folders: number;
    total_size: number;
    documents_by_type: Record<string, number>;
  }> {
    const response = await apiRequest<{
      total_documents: number;
      total_folders: number;
      total_size: number;
      documents_by_type: Record<string, number>;
    }>('GET', '/api/v1/documents/statistics');
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to get document statistics');
    }
    
    return response.data!;
  }

  /**
   * Get comprehensive document statistics for dashboard
   */
  async getDocumentStatistics(): Promise<{
    total_documents: number;
    total_folders: number;
    total_size: number;
    encrypted_documents: number;
    shared_documents: number;
    sensitive_documents: number;
    documents_by_type: Record<string, number>;
    documents_by_status: Record<string, number>;
    storage_usage_by_user: Record<string, number>;
    recent_activity_count: number;
  }> {
    const response = await apiRequest<{
      total_documents: number;
      total_folders: number;
      total_size: number;
      encrypted_documents: number;
      shared_documents: number;
      sensitive_documents: number;
      documents_by_type: Record<string, number>;
      documents_by_status: Record<string, number>;
      storage_usage_by_user: Record<string, number>;
      recent_activity_count: number;
    }>('GET', '/api/v1/documents/statistics');
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to get document statistics');
    }
    
    return response.data!;
  }

  /**
   * Get document version history
   */
  async getDocumentVersions(documentId: number): Promise<DocumentVersion[]> {
    const response = await apiRequest<DocumentVersion[]>('GET', `/api/v1/documents/${documentId}/versions`);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to get document versions');
    }
    
    return response.data || [];
  }

  /**
   * Restore document version
   */
  async restoreDocumentVersion(documentId: number, versionId: string): Promise<void> {
    const response = await apiRequest<void>('POST', `/api/v1/documents/${documentId}/versions/${versionId}/restore`);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to restore document version');
    }
  }

  /**
   * Get document permissions
   */
  async getDocumentPermissions(documentId: number): Promise<DocumentPermission[]> {
    const response = await apiRequest<DocumentPermission[]>('GET', `/api/v1/documents/${documentId}/permissions`);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to get document permissions');
    }
    
    return response.data || [];
  }

  /**
   * Create document permission
   */
  async createDocumentPermission(documentId: number, permission: DocumentPermissionCreate): Promise<DocumentPermission> {
    const response = await apiRequest<DocumentPermission>('POST', `/api/v1/documents/${documentId}/permissions`, permission);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to create document permission');
    }
    
    return response.data!;
  }

  /**
   * Delete document permission
   */
  async deleteDocumentPermission(documentId: number, permissionId: number): Promise<void> {
    const response = await apiRequest<void>('DELETE', `/api/v1/documents/${documentId}/permissions/${permissionId}`);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to delete document permission');
    }
  }

  /**
   * Apply folder permission inheritance
   */
  async applyFolderPermissionInheritance(folderId: number, recursive: boolean = true, overwriteExisting: boolean = false): Promise<{message: string; folders_processed: number; permissions_applied: number}> {
    const response = await apiRequest<{message: string; folders_processed: number; permissions_applied: number}>('POST', `/api/v1/documents/folders/${folderId}/permissions/inherit?recursive=${recursive}&overwrite_existing=${overwriteExisting}`);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to apply permission inheritance');
    }
    
    return response.data!;
  }
}

export interface DocumentVersion {
  id: string;
  version_number: number;
  file_size: number;
  file_hash: string;
  created_at: string;
  created_by: number;
  created_by_name: string;
  comment?: string;
  change_summary: string;
  is_current: boolean;
}

export interface DocumentPermission {
  id: number;
  document_id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
  permission_type: 'read' | 'write' | 'admin';
  granted: boolean;
  granted_by: number;
  granted_at: string;
  expires_at?: string;
  inheritable?: boolean;
  conditions?: Record<string, any>;
}

export interface DocumentPermissionCreate {
  user_id: number;
  permission_type: 'read' | 'write' | 'admin';
  granted: boolean;
  inheritable?: boolean;
  expires_at?: string;
  conditions?: Record<string, any>;
}

export const documentsApi = new DocumentsApiService();