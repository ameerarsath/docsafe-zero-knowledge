/**
 * Trash Management API Service
 * 
 * Handles API calls for trash operations like empty trash and recover all.
 */

import { apiRequest } from '../api';

export interface TrashOperationResult {
  message: string;
  deleted_count?: number;
  files_deleted?: number;
  recovered_count?: number;
}

class TrashAPI {
  /**
   * Empty trash - permanently delete all items in trash
   */
  async emptyTrash(): Promise<TrashOperationResult> {
    const response = await apiRequest<TrashOperationResult>(
      'POST',
      '/api/v1/documents/trash/empty'
    );
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to empty trash');
    }
    
    return response.data;
  }

  /**
   * Recover all items from trash
   */
  async recoverAll(): Promise<TrashOperationResult> {
    const response = await apiRequest<TrashOperationResult>(
      'POST',
      '/api/v1/documents/trash/recover-all'
    );
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to recover items from trash');
    }
    
    return response.data;
  }
}

export const trashApi = new TrashAPI();