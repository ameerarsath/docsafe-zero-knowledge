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
  salt?: string; // The salt used for key derivation, now a top-level field
  encrypted_dek?: string; // Document Encryption Key encrypted with user's master key
  encryption_iv?: string;
  encryption_auth_tag?: string;
  
  path?: string;
  depth?: number;
  children?: Document[];
  
  // Enhanced search fields
  author_name?: string;
  author_email?: string;
  file_category?: string;
  
  // Permission flags
  can_read?: boolean;
  can_write?: boolean;
  can_delete?: boolean;
  can_share?: boolean;
  
  // Security flags
  is_sensitive?: boolean;
  is_shared?: boolean;
}

export interface DocumentListParams {
  parent_id?: number | null;
  document_type?: 'document' | 'folder' | 'all';
  status?: 'active' | 'archived' | 'deleted' | 'quarantined';
  search?: string;
  tags?: string[];
  sort_by?: 'name' | 'created_at' | 'updated_at' | 'file_size';
  sort_order?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export interface DocumentSearchFilters {
  document_type?: 'document' | 'folder';
  status?: 'active' | 'archived' | 'deleted' | 'quarantined';
  owner_id?: number;
  parent_id?: number | null;
  mime_type?: string;
  is_shared?: boolean;
  is_sensitive?: boolean;
  tags?: string[];
  created_after?: string;
  created_before?: string;
  updated_after?: string;
  updated_before?: string;
  min_size?: number;
  max_size?: number;
  
  // Enhanced search filters
  author_id?: number;
  file_category?: 'document' | 'spreadsheet' | 'presentation' | 'image' | 'video' | 'audio' | 'archive' | 'code' | 'other';
  size_range?: 'small' | 'medium' | 'large' | 'huge';
  date_range?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'older';
}

export interface DocumentSearchParams {
  query?: string;
  filters?: DocumentSearchFilters;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export interface TagSuggestion {
  tag: string;
  count?: number;
}

export interface AuthorSuggestion {
  id: number;
  full_name: string;
  email: string;
  document_count: number;
}

export interface FileCategory {
  name: string;
  label: string;
  count: number;
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
    try {
      // Ensure deleted documents are excluded by default unless specifically requested
      const defaultParams = {
        status: 'active', // Exclude deleted, archived, and quarantined files by default
        ...params
      };
      
      const searchParams = new URLSearchParams();
      
      Object.entries(defaultParams).forEach(([key, value]) => {
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

      const response = await apiRequest<DocumentListResponse>('GET', `/api/v1/documents/?${searchParams}`);
      
      if (!response.success) {
        // Handle authentication errors gracefully
        if (response.error?.status_code === 401) {
          console.warn('Authentication required for document listing');
          return {
            documents: [],
            total: 0,
            page: 1,
            size: 20,
            has_next: false
          };
        }
        console.error('Documents API error:', response.error);
        throw new Error(response.error?.detail || 'Failed to load documents');
      }
      
      return response.data!;
    } catch (error) {
      console.error('Error listing documents:', error);
      // Return empty list as fallback
      return {
        documents: [],
        total: 0,
        page: 1,
        size: 20,
        has_next: false
      };
    }
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
    const response = await apiRequest<Document>('POST', '/api/v1/documents/', params);
    
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
   * Fetch document blob for preview (does not trigger download)
   */
  async fetchDocumentBlob(documentId: number, password?: string): Promise<Blob> {
    const params = password ? `?password=${encodeURIComponent(password)}` : '';
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8002'}/api/v1/documents/${documentId}/download${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TokenManager.getAccessToken()}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to fetch document: ${response.status}`);
    }

    return response.blob();
  }

  /**
   * Download a document
   */
  async downloadDocument(documentOrId: number | Document, password?: string): Promise<void> {
    // Starting document download
    
    try {
      let document: Document;
      if (typeof documentOrId === 'number') {
        // First, get document metadata for encryption parameters
        document = await this.getDocument(documentOrId);
      } else {
        document = documentOrId;
      }
      const documentId = document.id;
      
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

      // Check if the document has DEK encryption metadata (zero-knowledge)
      if (document.encrypted_dek && document.encryption_iv) {
        console.log('📥 Download: Zero-knowledge encrypted document, using DEK decryption');
        // Document is encrypted with DEK architecture, decrypt it
        await this.decryptAndDownload(encryptedBlob, document, filename);
      } else if (document.encryption_key_id && document.encryption_iv && document.encryption_auth_tag) {
        console.log('📥 Download: Legacy encrypted document, using legacy decryption');
        // Document is legacy encrypted, decrypt it with password
        await this.decryptAndDownloadLegacy(encryptedBlob, document, filename, password);
      } else {
        console.log('📥 Download: Unencrypted document, downloading directly');
        // Document is not encrypted, download as-is
        this.downloadBlob(encryptedBlob, filename);
      }
    } catch (error) {
      // Download failed
      throw error;
    }
  }

  /**
   * Decrypt and download a legacy encrypted document
   */
  private async decryptAndDownloadLegacy(encryptedBlob: Blob, document: Document, filename: string, password?: string): Promise<void> {
    try {
      if (!password) {
        // Prompt user for password
        const userPassword = prompt(`Enter password for ${document.name}:`);
        if (!userPassword) {
          throw new Error('Password required to decrypt this document');
        }
        password = userPassword;
      }

      // Dynamic import to avoid circular dependencies
      const { useEncryption } = await import('../../hooks/useEncryption');
      
      // We need to get the encryption hook instance, but since we're not in a React component,
      // we need to use the legacy decryption directly
      const encryptedData = await encryptedBlob.arrayBuffer();
      
      // Prepare decryption metadata for legacy documents
      const metadata = {
        keyId: document.encryption_key_id,
        iv: document.encryption_iv,
        authTag: document.encryption_auth_tag,
        originalName: document.name,
        mimeType: document.mime_type,
        documentMetadata: document.doc_metadata
      };

      console.log('📥 Legacy download: Using decryptDownloadedFile with metadata:', {
        keyId: metadata.keyId,
        hasIV: !!metadata.iv,
        hasAuthTag: !!metadata.authTag,
        hasPassword: !!password,
        ivFormat: metadata.iv ? 'base64' : 'missing',
        authTagFormat: metadata.authTag ? 'base64' : 'missing'
      });

      // Validate base64 format of critical fields
      if (metadata.iv && !/^[A-Za-z0-9+/]*={0,2}$/.test(metadata.iv)) {
        throw new Error(`Invalid IV format from database: not valid base64. Got: ${metadata.iv.substring(0, 50)}...`);
      }
      if (metadata.authTag && !/^[A-Za-z0-9+/]*={0,2}$/.test(metadata.authTag)) {
        throw new Error(`Invalid authTag format from database: not valid base64. Got: ${metadata.authTag.substring(0, 50)}...`);
      }

      // Import the decryptDownloadedFile function from the hook
      // Note: This is a bit hacky, but necessary since we're not in a React component
      const { decryptFile } = await import('../../utils/encryption');
      
      // For legacy documents, we need to use the legacy decryption approach
      // Split encrypted data into ciphertext and auth tag
      const encryptedArray = new Uint8Array(encryptedData);
      const authTagSize = 16; // Standard AES-GCM auth tag length
      
      if (encryptedArray.length <= authTagSize) {
        throw new Error(`Encrypted data too small: ${encryptedArray.length} bytes`);
      }
      
      const ciphertext = encryptedArray.slice(0, -authTagSize);
      const authTag = encryptedArray.slice(-authTagSize);

      // Convert to base64 for decryption
      const { uint8ArrayToBase64, deriveKey, base64ToArrayBuffer } = await import('../../utils/encryption');
      
      console.log('📥 Legacy download: Deriving key from password');
      
      // Derive key from password - we'll need to implement this based on your legacy approach
      // For now, let's try using the document metadata for salt/iterations
      let derivedKey;
      const salt_from_metadata = document.doc_metadata?.encryption_salt;
      const top_level_salt = (document as any).salt; // Use new top-level salt field

      if (top_level_salt || salt_from_metadata) {
        const salt_b64 = top_level_salt || salt_from_metadata;
        const salt = new Uint8Array(base64ToArrayBuffer(salt_b64));
        
        const iterations = document.doc_metadata?.encryption_iterations || 500000;

        derivedKey = await deriveKey({
          password,
          salt,
          iterations
        });
      } else {
        throw new Error('Legacy document missing encryption salt in metadata');
      }

      console.log('📥 Legacy download: Decrypting file data');
      
      // Create decrypted file - ensure all fields are base64 encoded
      const decryptedData = await decryptFile({
        ciphertext: uint8ArrayToBase64(ciphertext),
        iv: metadata.iv!, // This should already be base64 from database
        authTag: uint8ArrayToBase64(authTag),
        key: derivedKey
      }, filename, metadata.mimeType || 'application/octet-stream');
      
      console.log('✅ Legacy download: Decryption successful, initiating download');
      
      // Download the decrypted file
      this.downloadBlob(decryptedData, filename);
      
    } catch (error) {
      console.error('❌ Legacy download failed:', error);
      throw new Error(`Failed to decrypt legacy document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt and download an encrypted document using DEK architecture
   */
  private async decryptAndDownload(encryptedBlob: Blob, document: Document, filename: string): Promise<void> {
    // Dynamic import to avoid circular dependencies
    const { documentEncryptionService } = await import('../documentEncryption');

    try {
      // Check if document has DEK information
      if (!document.encrypted_dek) {
        throw new Error('Document does not have encryption key information');
      }

      // Check if master key is available in the encryption service
      if (!documentEncryptionService.hasMasterKey()) {
        throw new Error('Master key not available. Please log in with your encryption password.');
      }

      // Convert blob to array buffer for decryption
      const arrayBuffer = await encryptedBlob.arrayBuffer();
      
      // Decrypt the document using the DEK architecture
      const decryptionResult = await documentEncryptionService.decryptDocument(
        document,
        arrayBuffer,
        (progress) => {
          console.log(`Decryption progress: ${progress.stage} - ${progress.progress}% - ${progress.message}`);
        }
      );

      // Create decrypted file blob
      const decryptedBlob = new Blob([decryptionResult.decryptedData], { 
        type: decryptionResult.mimeType 
      });
      
      // Download the decrypted file
      this.downloadBlob(decryptedBlob, filename);
      
    } catch (error) {
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
      path: path
    };
  }

  /**
   * Get all folders for folder tree
   */
  async getFolders(): Promise<Document[]> {
    const response = await apiRequest<DocumentListResponse>('GET', '/api/v1/documents/?document_type=folder&size=1000');
    
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
    
    const response = await apiRequest<void>('POST', '/api/v1/documents/bulk-operation/', bulkParams);
    
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
    
    const response = await apiRequest<void>('POST', '/api/v1/documents/bulk-operation/', bulkParams);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to copy documents');
    }
  }

  /**
   * Search documents (legacy method - uses simple list search)
   */
  async searchDocuments(query: string, filters?: Partial<DocumentListParams>): Promise<DocumentListResponse> {
    // Ensure deleted documents are excluded by default
    const defaultFilters = {
      status: 'active', // Exclude deleted, archived, and quarantined files by default
      ...filters
    };
    return this.listDocuments({ ...defaultFilters, search: query });
  }

  /**
   * Enhanced search documents with advanced filtering
   */
  async searchDocumentsAdvanced(params: DocumentSearchParams): Promise<DocumentListResponse> {
    // Ensure deleted documents are excluded by default unless specifically searching for deleted files
    const defaultFilters = {
      status: 'active', // Exclude deleted, archived, and quarantined files by default
      ...params.filters
    };

    const searchPayload = {
      query: params.query || '',
      filters: defaultFilters,
      sort_by: params.sort_by || 'updated_at',
      sort_order: params.sort_order || 'desc',
      page: params.page || 1,
      size: params.size || 20
    };

    const response = await apiRequest<DocumentListResponse>('POST', '/api/v1/documents/search/', searchPayload);
    
    if (!response.success) {
      console.error('Enhanced search API error:', response.error);
      throw new Error(response.error?.detail || 'Failed to search documents');
    }
    
    return response.data!;
  }

  /**
   * Get tag suggestions for search
   */
  async getTagSuggestions(query: string = '', limit: number = 10): Promise<string[]> {
    const searchParams = new URLSearchParams({
      query,
      limit: limit.toString()
    });

    const response = await apiRequest<string[]>('GET', `/api/v1/documents/search/suggestions/tags?${searchParams}`);
    
    if (!response.success) {
      console.error('Tag suggestions API error:', response.error);
      throw new Error(response.error?.detail || 'Failed to get tag suggestions');
    }
    
    return response.data!;
  }

  /**
   * Get author suggestions for search (admin only)
   */
  async getAuthorSuggestions(query: string = '', limit: number = 10): Promise<AuthorSuggestion[]> {
    const searchParams = new URLSearchParams({
      query,
      limit: limit.toString()
    });

    const response = await apiRequest<AuthorSuggestion[]>('GET', `/api/v1/documents/search/suggestions/authors?${searchParams}`);
    
    if (!response.success) {
      console.error('Author suggestions API error:', response.error);
      throw new Error(response.error?.detail || 'Failed to get author suggestions');
    }
    
    return response.data!;
  }

  /**
   * Get file categories with counts
   */
  async getFileCategories(): Promise<FileCategory[]> {
    const response = await apiRequest<FileCategory[]>('GET', '/api/v1/documents/search/file-categories');
    
    if (!response.success) {
      console.error('File categories API error:', response.error);
      throw new Error(response.error?.detail || 'Failed to get file categories');
    }
    
    return response.data!;
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
   * List documents in trash (all hierarchy levels)
   */
  async listTrashItems(params: {
    page?: number;
    size?: number;
    sort_by?: 'name' | 'created_at' | 'updated_at' | 'file_size';
    sort_order?: 'asc' | 'desc';
  } = {}): Promise<DocumentListResponse> {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });

    const response = await apiRequest<DocumentListResponse>('GET', `/api/v1/documents/trash?${searchParams}`);
    
    if (!response.success) {
      console.error('Trash API error:', response.error);
      throw new Error(response.error?.detail || 'Failed to load trash items');
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

  /**
   * Recover a document from trash (individual recovery)
   */
  async recoverDocument(documentId: number): Promise<Document> {
    const response = await apiRequest<Document>('POST', `/api/v1/documents/${documentId}/recover`);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to recover document');
    }
    
    return response.data!;
  }

  /**
   * Permanently delete a document from trash
   */
  async permanentlyDeleteDocument(documentId: number): Promise<void> {
    const response = await apiRequest<void>('DELETE', `/api/v1/documents/${documentId}/permanent`);
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to permanently delete document');
    }
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