/**
 * API Service for Folder Upload Operations
 * 
 * Handles communication with backend bulk folder and batch file upload endpoints.
 */

import { apiRequest } from '../api';

export interface FolderCreationItem {
  name: string;
  path: string;
  parent_path?: string;
  description?: string;
  tags: string[];
}

export interface BulkFolderCreateRequest {
  parent_id?: number;
  folders: FolderCreationItem[];
  conflict_resolution: 'skip' | 'rename' | 'error';
}

export interface BulkFolderCreateResult {
  successful: Array<{
    path: string;
    name: string;
    document_id: number;
    parent_id?: number;
  }>;
  failed: Array<{
    path: string;
    name: string;
    error: string;
  }>;
  skipped: Array<{
    path: string;
    name: string;
    document_id: number;
    reason: string;
  }>;
  total_requested: number;
  total_created: number;
}

export interface BatchFileUploadItem {
  filename: string;
  folder_path: string;
  file_size: number;
  mime_type: string;
  file_hash?: string;
  tags: string[];
  is_sensitive: boolean;
  encryption_metadata?: Record<string, any>;
}

export interface BatchFileUploadRequest {
  root_folder_id?: number;
  files: BatchFileUploadItem[];
  conflict_resolution: 'rename' | 'overwrite' | 'skip' | 'error';
  create_folders: boolean;
}

export interface BatchFileUploadResult {
  successful: Array<{
    filename: string;
    original_filename: string;
    folder_path: string;
    document_id: number;
    size: number;
  }>;
  failed: Array<{
    filename: string;
    folder_path: string;
    error: string;
  }>;
  total_requested: number;
  total_uploaded: number;
  folders_created: Array<{
    path: string;
    name: string;
    document_id: number;
  }>;
  total_size: number;
}

export interface FolderUploadStatus {
  upload_id: string;
  status: string;
  progress: number;
  current_file?: string;
  files_completed: number;
  files_total: number;
  folders_created: number;
  bytes_uploaded: number;
  bytes_total: number;
  error_message?: string;
  started_at: string;
  estimated_completion?: string;
}

class FolderUploadAPI {
  /**
   * Create multiple folders in bulk
   */
  async createFolders(request: BulkFolderCreateRequest): Promise<BulkFolderCreateResult> {
    const response = await apiRequest<BulkFolderCreateResult>(
      'POST',
      '/api/v1/documents/bulk-create-folders',
      request
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || response.error?.detail || 'Failed to create folders');
    }
    
    return response.data;
  }

  /**
   * Upload multiple files with folder structure
   */
  async uploadFiles(
    files: File[],
    metadata: BatchFileUploadRequest,
    onProgress?: (progress: number) => void
  ): Promise<BatchFileUploadResult> {
    const formData = new FormData();
    
    // Add files to form data
    files.forEach((file, index) => {
      formData.append('files', file);
    });
    
    // Add metadata as JSON string
    formData.append('metadata', JSON.stringify(metadata));
    
    const response = await apiRequest<BatchFileUploadResult>(
      'POST',
      '/api/v1/documents/batch-upload-files',
      formData
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to upload files');
    }
    
    return response.data;
  }

  /**
   * Get upload status for tracking progress
   */
  async getUploadStatus(uploadId: string): Promise<FolderUploadStatus> {
    const response = await apiRequest<FolderUploadStatus>(
      'GET',
      `/api/v1/documents/upload-status/${uploadId}`
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to get upload status');
    }
    
    return response.data;
  }
}

export const folderUploadApi = new FolderUploadAPI();