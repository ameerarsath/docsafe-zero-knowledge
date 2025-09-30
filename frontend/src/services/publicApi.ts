/**
 * Public API Service
 *
 * Handles public API calls that don't require authentication
 * such as external shares and public document access
 */

const API_BASE_URL = 'http://localhost:8000';

export interface ShareInfo {
  id: number;
  document_id: number;
  document_name: string;
  document_type: string;
  document_size: number;
  owner_username: string;
  created_at: string;
  expires_at?: string;
  is_password_protected: boolean;
  access_count: number;
  max_access_count?: number;
}

export const publicApi = {
  /**
   * Get share information without authentication
   */
  async getShareInfo(shareToken: string): Promise<ShareInfo> {
    const response = await fetch(`${API_BASE_URL}/share/${shareToken}/info`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'include'
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('PASSWORD_REQUIRED');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Verify share password
   */
  async verifySharePassword(shareToken: string, password: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/share/${shareToken}/verify-password`, {
      method: 'POST',
      mode: 'cors',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      return false;
    }

    const result = await response.json();
    return result.valid;
  },

  /**
   * Get public document metadata
   */
  async getDocumentMetadata(shareToken: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/share/${shareToken}/metadata`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Check if share exists and is accessible
   */
  async checkShareAccessibility(shareToken: string, password?: string): Promise<{
    accessible: boolean;
    requiresPassword: boolean;
    reason?: string;
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/share/${shareToken}/stream`, {
        method: 'HEAD',
        mode: 'cors',
        credentials: 'include',
        headers: password ? {
          'X-Share-Password': password
        } : {}
      });

      if (response.status === 401) {
        return {
          accessible: false,
          requiresPassword: true,
          reason: 'Password required'
        };
      }

      if (response.status === 404) {
        return {
          accessible: false,
          requiresPassword: false,
          reason: 'Share not found'
        };
      }

      if (response.status === 410) {
        return {
          accessible: false,
          requiresPassword: false,
          reason: 'Share expired or revoked'
        };
      }

      return {
        accessible: response.ok,
        requiresPassword: false
      };
    } catch (error) {
      return {
        accessible: false,
        requiresPassword: false,
        reason: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
};

export default publicApi;