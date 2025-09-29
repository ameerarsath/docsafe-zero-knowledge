/**
 * Document Share API Service
 *
 * Handles document sharing operations including:
 * - Creating document shares
 * - Managing share permissions
 * - Listing existing shares
 * - Revoking shares
 * - Accessing shared documents
 */

// API request function - import directly for better performance and error handling
import { apiRequest as makeApiRequest } from '../api';

const apiRequest = async <T>(method: string, url: string, data?: any): Promise<T> => {
  const response = await makeApiRequest<T>(method as any, url, data);
  // Handle direct API responses without wrapping
  if (response && typeof response === 'object' && 'success' in response) {
    if (!response.success) {
      // Better error handling to avoid [object Object] issues
      const errorDetail = (response as any).error;
      let errorMessage = 'API request failed';

      if (typeof errorDetail === 'string') {
        errorMessage = errorDetail;
      } else if (errorDetail && typeof errorDetail === 'object') {
        if (errorDetail.detail) {
          errorMessage = errorDetail.detail;
        } else if (errorDetail.message) {
          errorMessage = errorDetail.message;
        } else {
          errorMessage = JSON.stringify(errorDetail);
        }
      }

      throw new Error(errorMessage);
    }
    return (response as any).data;
  }
  // Handle direct responses from backend
  return response;
};

// Share-related types
export interface ShareSettings {
  shareType: 'internal' | 'external' | 'public';
  permissions: string[];
  expiresAt?: string;
  shareName: string;
  requirePassword: boolean;
  sharePassword?: string;
  maxAccess?: number | null;
  encryptionPassword?: string; // Add support for document encryption password
}

export interface DocumentShare {
  id: number;
  shareToken: string;
  documentId: number;
  shareName: string;
  shareType: 'internal' | 'external' | 'public';
  permissions: string[];
  expiresAt?: string;
  createdAt: string;
  accessCount: number;
  lastAccessedAt?: string;
  isActive: boolean;
  createdBy: {
    id: number;
    username: string;
    email: string;
  };
}

export interface CreateShareRequest {
  documentId: number;
  settings: ShareSettings;
}

export interface CreateShareResponse {
  share: DocumentShare;
  shareUrl: string;
}

export interface ListSharesResponse {
  shares: DocumentShare[];
  total: number;
}

export interface ShareAccessResponse {
  document: {
    id: number;
    name: string;
    file_size: number;
    mime_type: string;
    created_at: string;
    description?: string;
  };
  permissions: string[];
  shareInfo: {
    shareName: string;
    shareType: string;
    expiresAt?: string;
    accessCount: number;
  };
}

export interface ShareStatsResponse {
  totalShares: number;
  activeShares: number;
  totalAccess: number;
  recentAccess: Array<{
    shareToken: string;
    shareName: string;
    accessedAt: string;
    accessorInfo?: string;
  }>;
}

export class ShareService {
  // Mock flag - set to false to use real API
  private static USE_MOCK = false;

  static {
    // Log initialization
    console.log('📋 ShareService initialized in', this.USE_MOCK ? 'MOCK' : 'API', 'mode');
    if (this.USE_MOCK) {
      console.log('🔧 To enable real API, call ShareService.setMockMode(false)');
    }
  }

  /**
   * Generate share URL from token (private method for internal use)
   */
  private static generateInternalShareUrl(shareToken: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/share/${shareToken}`;
  }

  /**
   * Enable or disable mock mode
   */
  static setMockMode(enabled: boolean): void {
    this.USE_MOCK = enabled;
    console.log(`🔧 ShareService mock mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if mock mode is enabled
   */
  static isMockMode(): boolean {
    return this.USE_MOCK;
  }

  /**
   * Create a new document share
   */
  static async createShare(request: CreateShareRequest): Promise<CreateShareResponse> {
    if (this.USE_MOCK) {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay

      const mockShare: DocumentShare = {
        id: Date.now(),
        shareToken: Math.random().toString(36).substring(2, 15),
        documentId: request.documentId,
        shareName: request.settings.shareName,
        shareType: request.settings.shareType,
        permissions: request.settings.permissions,
        expiresAt: request.settings.expiresAt,
        createdAt: new Date().toISOString(),
        accessCount: 0,
        isActive: true,
        createdBy: {
          id: 1,
          username: 'current_user',
          email: 'user@example.com'
        }
      };

      const shareUrl = this.generateInternalShareUrl(mockShare.shareToken);

      return {
        share: mockShare,
        shareUrl
      };
    }

    try {
      // Convert frontend settings format to backend schema format
      const backendShareData = {
        share_name: request.settings.shareName?.trim() || `Share of Document ${request.documentId}`, // Ensure non-empty name
        share_type: request.settings.shareType,
        allow_download: request.settings.permissions.includes('download'),
        allow_preview: request.settings.permissions.includes('read'),
        allow_comment: request.settings.permissions.includes('comment'),
        require_password: request.settings.requirePassword || false,
        password: request.settings.sharePassword || null,
        expires_at: request.settings.expiresAt || null,
        max_access_count: request.settings.maxAccess || null,
        access_restrictions: {},
        encryption_password: request.settings.encryptionPassword || null
      };

      console.log('📋 Share payload being sent to backend:', JSON.stringify(backendShareData, null, 2));

      const response = await apiRequest<CreateShareResponse>('POST', `/api/v1/shares/?document_id=${request.documentId}`, backendShareData);

      console.log('✅ Share created successfully:', response);

      // The response is already in the correct format from the backend
      // which returns { share: DocumentShareResponse, shareUrl: string }
      return response;
    } catch (error: any) {
      console.error('Failed to create share:', error);

      // Extract error message from different response formats
      let errorMessage = 'Failed to create document share';

      // Handle specific HTTP status codes first
      if (error.response?.status) {
        switch (error.response.status) {
          case 401:
            errorMessage = 'Authentication failed. Please log in again.';
            break;
          case 403:
            errorMessage = 'You do not have permission to share this document.';
            break;
          case 404:
            errorMessage = 'Document not found or has been deleted.';
            break;
          case 422:
            errorMessage = 'Invalid share settings. Please check your inputs.';
            break;
          case 429:
            errorMessage = 'Too many requests. Please wait and try again.';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
        }

        // Try to get more specific error details if available
        if (error.response?.data) {
          const errorData = error.response.data;

          if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (errorData.detail) {
            if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail;
            } else if (errorData.detail.message) {
              errorMessage = errorData.detail.message;
            } else if (errorData.detail.fields) {
              // Handle field-level validation errors
              const fieldErrors = Object.entries(errorData.detail.fields)
                .map(([field, message]) => `${field}: ${message}`)
                .join(', ');
              errorMessage = `Validation error - ${fieldErrors}`;
            }
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        }
      } else if (error.message && error.message !== '[object Object]') {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * List shares for a document
   */
  static async getDocumentShares(documentId: number): Promise<ListSharesResponse> {
    // Clean up old error cache entries periodically
    if ((window as any)._lastSharesError) {
      const now = Date.now();
      Object.keys((window as any)._lastSharesError).forEach(key => {
        if (now - (window as any)._lastSharesError[key] > 300000) { // 5 minutes
          delete (window as any)._lastSharesError[key];
        }
      });
    }

    if (this.USE_MOCK) {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay

      const mockShares: DocumentShare[] = [
        {
          id: 1,
          shareToken: 'abc123def456',
          documentId: documentId,
          shareName: 'Team Review Share',
          shareType: 'internal',
          permissions: ['read', 'download'],
          expiresAt: '2025-12-31T23:59:59Z',
          createdAt: '2025-01-15T10:00:00Z',
          accessCount: 5,
          lastAccessedAt: '2025-01-20T14:30:00Z',
          isActive: true,
          createdBy: {
            id: 1,
            username: 'demo_user',
            email: 'demo@example.com'
          }
        }
      ];

      return {
        shares: mockShares,
        total: mockShares.length
      };
    }

    try {
      return await apiRequest<ListSharesResponse>('GET', `/api/v1/shares/document/${documentId}`);
    } catch (error: any) {
      // Rate limit console errors - create unique key for this document
      const errorKey = `shares_error_${documentId}`;
      const now = Date.now();
      const lastError = (window as any)._lastSharesError?.[errorKey];

      // Only log error once per minute per document
      if (!lastError || now - lastError > 60000) {
        console.error('Failed to get document shares:', error);
        if (!(window as any)._lastSharesError) {
          (window as any)._lastSharesError = {};
        }
        (window as any)._lastSharesError[errorKey] = now;
      }

      // If shares API is not available, user lacks permissions, or timeout occurs, return empty shares
      const isTimeoutError = error?.message?.includes('timeout') ||
                           error?.message?.includes('exceeded') ||
                           error?.code === 'ECONNABORTED';
      const isPermissionError = error?.message?.includes('403') ||
                              error?.message?.includes('404') ||
                              error?.message?.includes('Insufficient permissions') ||
                              error?.message?.includes('Authentication');

      if (isTimeoutError || isPermissionError) {
        // Only log warning once per minute per document
        if (!lastError || now - lastError > 60000) {
          console.warn('Shares API not available, timeout, or insufficient permissions - returning empty shares list');
        }
        return {
          shares: [],
          total: 0
        };
      }

      throw new Error(
        error.message ||
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to load document shares'
      );
    }
  }

  /**
   * List all shares for current user
   */
  static async getUserShares(page = 1, limit = 20): Promise<ListSharesResponse> {
    if (this.USE_MOCK) {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 500));
      return { shares: [], total: 0 };
    }

    try {
      return await apiRequest<ListSharesResponse>('GET', `/api/v1/shares?page=${page}&limit=${limit}`);
    } catch (error: any) {
      console.error('Failed to get user shares:', error);
      throw new Error(
        error.message ||
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to load shares'
      );
    }
  }

  /**
   * Get share details by token
   */
  static async getShareByToken(shareToken: string): Promise<DocumentShare> {
    if (this.USE_MOCK) {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockShare: DocumentShare = {
        id: 1,
        shareToken,
        documentId: 123,
        shareName: 'Public Share',
        shareType: 'external',
        permissions: ['read', 'download'],
        expiresAt: '2025-12-31T23:59:59Z',
        createdAt: '2025-01-15T10:00:00Z',
        accessCount: 25,
        lastAccessedAt: '2025-01-20T14:30:00Z',
        isActive: true,
        createdBy: {
          id: 1,
          username: 'demo_user',
          email: 'demo@example.com'
        }
      };

      return mockShare;
    }

    try {
      const response = await apiRequest<DocumentShare>('GET', `/api/v1/shares/${shareToken}`);
      return response;
    } catch (error: any) {
      console.error('Failed to get share details:', error);
      throw new Error(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to load share details'
      );
    }
  }

  /**
   * Access a shared document
   */
  static async accessSharedDocument(shareToken: string, password?: string): Promise<ShareAccessResponse> {
    if (this.USE_MOCK) {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 1000));

      const mockResponse: ShareAccessResponse = {
        document: {
          id: 123,
          name: 'Shared Document.pdf',
          file_size: 2456789,
          mime_type: 'application/pdf',
          created_at: '2025-01-15T10:00:00Z',
          description: 'This is a shared document accessible via link'
        },
        permissions: ['read', 'download'],
        shareInfo: {
          shareName: 'Public Demo Share',
          shareType: 'external',
          expiresAt: '2025-12-31T23:59:59Z',
          accessCount: 15
        }
      };

      return mockResponse;
    }

    try {
      const response = await apiRequest<ShareAccessResponse>('POST', `/api/v1/shares/${shareToken}/access`, {
        password
      });
      return response;
    } catch (error: any) {
      console.error('Failed to access shared document:', error);

      // Better error message extraction
      let errorMessage = 'Failed to access shared document';
      let errorDetail = null;

      // Extract error details from different response formats
      if (error.response?.data) {
        const responseData = error.response.data;

        if (typeof responseData === 'string') {
          errorMessage = responseData;
        } else if (responseData.detail) {
          if (typeof responseData.detail === 'string') {
            errorMessage = responseData.detail;
          } else if (responseData.detail.message) {
            errorMessage = responseData.detail.message;
            errorDetail = responseData.detail;
          }
        } else if (responseData.message) {
          errorMessage = responseData.message;
        }
      }

      // Handle specific error cases with custom messages
      if (error.response?.status === 401) {
        if (errorDetail?.requiresLogin) {
          errorMessage = errorDetail.message || 'Authentication required. Please log in to access this share.';
        } else if (errorDetail?.requirePassword) {
          errorMessage = errorDetail.message || 'Password required for this share.';
        } else {
          errorMessage = errorMessage || 'Authentication failed. Please verify your credentials.';
        }
      } else if (error.response?.status === 403) {
        errorMessage = errorMessage || 'Access denied. You do not have permission to view this share.';
      } else if (error.response?.status === 404) {
        errorMessage = errorMessage || 'Share not found. The link may be invalid or has been removed.';
      } else if (error.response?.status === 410) {
        errorMessage = errorMessage || 'This share has expired or been revoked and is no longer accessible.';
      } else if (error.response?.status === 429) {
        errorMessage = errorMessage || 'Too many access attempts. Please try again later.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Download a shared document
   */
  static async downloadSharedDocument(shareToken: string, password?: string): Promise<Blob> {
    if (this.USE_MOCK) {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create a mock PDF blob
      const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 18 Tf
100 700 Td
(Mock Shared Document) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f
0000000010 00000 n
0000000079 00000 n
0000000173 00000 n
0000000301 00000 n
0000000380 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
457
%%EOF`;

      return new Blob([pdfContent], { type: 'application/pdf' });
    }

    try {
      const response = await apiRequest<Blob>('POST', `/api/v1/shares/${shareToken}/download`, {
        password
      });
      return response;
    } catch (error: any) {
      console.error('Failed to download shared document:', error);
      throw new Error(
        error.response?.data?.detail ||
        'Failed to download shared document'
      );
    }
  }

  /**
   * Update share settings
   */
  static async updateShare(shareId: number, settings: Partial<ShareSettings>): Promise<DocumentShare> {
    if (this.USE_MOCK) {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockUpdatedShare: DocumentShare = {
        id: shareId,
        shareToken: Math.random().toString(36).substring(2, 15),
        documentId: 123,
        shareName: settings.shareName || 'Updated Share',
        shareType: settings.shareType || 'external',
        permissions: settings.permissions || ['read'],
        expiresAt: settings.expiresAt,
        createdAt: '2025-01-15T10:00:00Z',
        accessCount: 5,
        lastAccessedAt: '2025-01-20T14:30:00Z',
        isActive: true,
        createdBy: {
          id: 1,
          username: 'demo_user',
          email: 'demo@example.com'
        }
      };

      return mockUpdatedShare;
    }

    try {
      const response = await apiRequest<DocumentShare>('PUT', `/api/v1/shares/${shareId}`, settings);
      return response;
    } catch (error: any) {
      console.error('Failed to update share:', error);
      throw new Error(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to update share'
      );
    }
  }

  /**
   * Revoke a share
   */
  static async revokeShare(shareId: number): Promise<void> {
    if (this.USE_MOCK) {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API delay
      console.log(`Mock: Revoked share ${shareId}`);
      return;
    }

    try {
      const response = await apiRequest<void>('DELETE', `/api/v1/shares/${shareId}`);
      // DELETE returns a simple message object
    } catch (error: any) {
      console.error('Failed to revoke share:', error);
      throw new Error(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to revoke share'
      );
    }
  }

  /**
   * Get share statistics
   */
  static async getShareStats(documentId?: number): Promise<ShareStatsResponse> {
    if (this.USE_MOCK) {
      // Mock implementation
      await new Promise(resolve => setTimeout(resolve, 500));

      const mockStats: ShareStatsResponse = {
        totalShares: 12,
        activeShares: 8,
        totalAccess: 145,
        recentAccess: [
          {
            shareToken: 'abc123def456',
            shareName: 'Project Review',
            accessedAt: '2025-01-20T14:30:00Z',
            accessorInfo: 'External user'
          },
          {
            shareToken: 'xyz789uvw012',
            shareName: 'Public Demo',
            accessedAt: '2025-01-20T13:15:00Z'
          }
        ]
      };

      return mockStats;
    }

    try {
      const url = documentId ? `/api/v1/shares/stats?documentId=${documentId}` : '/api/v1/shares/stats';
      const response = await apiRequest<ShareStatsResponse>('GET', url);
      return response;
    } catch (error: any) {
      console.error('Failed to get share stats:', error);
      throw new Error(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Failed to load share statistics'
      );
    }
  }

  /**
   * Generate shareable URL
   */
  static generateShareUrl(shareToken: string): string {
    return `${window.location.origin}/share/${shareToken}`;
  }

  /**
   * Copy share URL to clipboard
   */
  static async copyShareUrl(shareToken: string): Promise<void> {
    const shareUrl = this.generateShareUrl(shareToken);

    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  /**
   * Validate share token format
   */
  static validateShareToken(token: string): boolean {
    return /^[a-zA-Z0-9]{12,}$/.test(token);
  }

  /**
   * Check if share is expired
   */
  static isShareExpired(expiresAt?: string): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  }

  /**
   * Format share permissions for display
   */
  static formatPermissions(permissions: string[]): string {
    const permissionLabels: Record<string, string> = {
      'read': 'View',
      'download': 'Download',
      'comment': 'Comment',
      'edit': 'Edit'
    };

    return permissions
      .map(p => permissionLabels[p] || p)
      .join(', ');
  }
}

export default ShareService;