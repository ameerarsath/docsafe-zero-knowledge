/**
 * Dashboard API Service
 * 
 * Handles fetching comprehensive dashboard statistics including documents,
 * users, storage, and system metrics.
 */

import { apiRequest } from '../api';

export interface DocumentStatistics {
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
  
  // Enhanced statistics
  active_documents: number;
  archived_documents: number;
  deleted_documents: number;
  active_storage_size: number;
  archived_storage_size: number;
  deleted_storage_size: number;
  documents_created_today: number;
  documents_modified_today: number;
  avg_document_size: number;
  largest_document_size: number;
}

export interface SystemMetrics {
  database_stats: {
    total_users: number;
    active_users: number;
    total_documents: number;
    total_storage_bytes: number;
  };
  recent_activity: Array<{
    timestamp: string;
    user_id: number;
    action: string;
    resource_type: string;
    resource_id: number;
  }>;
  performance_metrics: {
    avg_response_time: number;
    success_rate: number;
    error_rate: number;
  };
}

export interface EnhancedDashboardStats {
  // Document statistics
  active_documents: number;
  documents_in_trash: number;
  total_folders: number;
  active_storage_size: number;
  trash_storage_size: number;
  
  // User statistics
  total_users: number;
  active_users: number;
  users_logged_in_today: number;
  
  // System statistics
  encrypted_documents: number;
  shared_documents: number;
  sensitive_documents: number;
  recent_activity_count: number;
  
  // Storage breakdown
  storage_by_type: Record<string, number>;
  storage_by_user: Record<string, number>;
  
  // Activity metrics
  documents_created_today: number;
  documents_modified_today: number;
  login_events_today: number;
}

class DashboardAPI {
  /**
   * Get document statistics
   */
  async getDocumentStatistics(): Promise<DocumentStatistics> {
    try {
      const response = await apiRequest<DocumentStatistics>(
        'GET',
        '/api/v1/documents/statistics'
      );
      
      if (!response.success) {
        // Check if it's an authentication error
        if (response.error?.status_code === 401) {
          console.warn('Authentication required for document statistics');
          // Return empty statistics instead of throwing
          return this.getEmptyStatistics();
        }
        throw new Error(response.error?.detail || 'Failed to fetch document statistics');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching document statistics:', error);
      // Return empty statistics as fallback
      return this.getEmptyStatistics();
    }
  }

  /**
   * Get empty statistics as fallback
   */
  private getEmptyStatistics(): DocumentStatistics {
    return {
      total_documents: 0,
      total_folders: 0,
      total_size: 0,
      encrypted_documents: 0,
      shared_documents: 0,
      sensitive_documents: 0,
      documents_by_type: {},
      documents_by_status: {},
      storage_usage_by_user: {},
      recent_activity_count: 0,
      active_documents: 0,
      archived_documents: 0,
      deleted_documents: 0,
      active_storage_size: 0,
      archived_storage_size: 0,
      deleted_storage_size: 0,
      documents_created_today: 0,
      documents_modified_today: 0,
      avg_document_size: 0,
      largest_document_size: 0
    };
  }

  /**
   * Get system metrics (admin only)
   */
  async getSystemMetrics(hours: number = 24): Promise<SystemMetrics> {
    const response = await apiRequest<SystemMetrics>(
      'GET',
      `/api/v1/admin/system/metrics?hours=${hours}`
    );
    
    if (!response.success) {
      throw new Error(response.error?.detail || 'Failed to fetch system metrics');
    }
    
    return response.data;
  }

  /**
   * Get enhanced dashboard statistics combining multiple sources
   */
  async getEnhancedDashboardStats(): Promise<EnhancedDashboardStats> {
    try {
      // Fetch document statistics (available to all users)
      const docStats = await this.getDocumentStatistics();
      
      let systemStats: SystemMetrics | null = null;
      try {
        // Try to fetch system metrics (admin only)
        systemStats = await this.getSystemMetrics(24);
      } catch (error) {
        // Ignore error if user doesn't have admin access
        console.warn('System metrics not available (admin access required)');
      }

      // Use enhanced statistics from backend
      const activeDocuments = docStats.active_documents || docStats.total_documents;
      const trashedDocuments = docStats.archived_documents + docStats.deleted_documents;
      const activeStorageSize = docStats.active_storage_size || docStats.total_size;
      const trashStorageSize = docStats.archived_storage_size + docStats.deleted_storage_size;

      return {
        // Document statistics
        active_documents: activeDocuments,
        documents_in_trash: trashedDocuments,
        total_folders: docStats.total_folders,
        active_storage_size: activeStorageSize,
        trash_storage_size: trashStorageSize,
        
        // User statistics (from system metrics or defaults)
        total_users: systemStats?.database_stats?.total_users || 0,
        active_users: systemStats?.database_stats?.active_users || 0,
        users_logged_in_today: systemStats?.recent_activity?.filter(
          activity => activity.action === 'login' && 
          new Date(activity.timestamp).toDateString() === new Date().toDateString()
        ).length || 0,
        
        // System statistics
        encrypted_documents: docStats.encrypted_documents,
        shared_documents: docStats.shared_documents,
        sensitive_documents: docStats.sensitive_documents,
        recent_activity_count: docStats.recent_activity_count,
        
        // Storage breakdown
        storage_by_type: docStats.documents_by_type,
        storage_by_user: docStats.storage_usage_by_user,
        
        // Activity metrics from backend
        documents_created_today: docStats.documents_created_today,
        documents_modified_today: docStats.documents_modified_today,
        login_events_today: systemStats?.recent_activity?.filter(
          activity => activity.action === 'login' && 
          new Date(activity.timestamp).toDateString() === new Date().toDateString()
        ).length || 0,
      };
    } catch (error) {
      console.error('Failed to fetch dashboard statistics:', error);
      
      // Return fallback statistics
      return {
        active_documents: 0,
        documents_in_trash: 0,
        total_folders: 0,
        active_storage_size: 0,
        trash_storage_size: 0,
        total_users: 0,
        active_users: 0,
        users_logged_in_today: 0,
        encrypted_documents: 0,
        shared_documents: 0,
        sensitive_documents: 0,
        recent_activity_count: 0,
        storage_by_type: {},
        storage_by_user: {},
        documents_created_today: 0,
        documents_modified_today: 0,
        login_events_today: 0,
      };
    }
  }
}

export const dashboardApi = new DashboardAPI();