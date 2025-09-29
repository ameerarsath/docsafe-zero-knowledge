/**
 * Share Preview API Service
 * Handles view-only share preview without download permissions
 */

export interface SharePreviewOptions {
  shareToken: string;
  password?: string;
}

export interface SharePreviewResponse {
  encryptedData: ArrayBuffer;
  documentName: string;
  documentType: string;
  shareToken: string;
  requiresDecryption: boolean;
  originalMimeType?: string;
}

export class SharePreviewService {
  private static readonly BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8002';

  /**
   * Fetch encrypted document data for preview-only access
   */
  static async fetchForPreview(options: SharePreviewOptions): Promise<SharePreviewResponse> {
    const { shareToken, password } = options;
    
    // Use preview endpoint instead of download
    const previewUrl = `${this.BASE_URL}/api/v1/shares/${shareToken}/preview`;
    const urlWithPassword = password ? `${previewUrl}?password=${encodeURIComponent(password)}` : previewUrl;
    
    const response = await fetch(urlWithPassword, {
      method: 'GET',
      headers: {
        'Accept': 'application/octet-stream'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(typeof errorData.detail === 'string' ? errorData.detail : 'Failed to access shared document');
    }

    const encryptedData = await response.arrayBuffer();
    
    // Check if document requires decryption
    const requiresDecryption = response.headers.get('X-Requires-Decryption') === 'true';
    const originalMimeType = response.headers.get('X-Original-Mime-Type');
    
    return {
      encryptedData,
      documentName: response.headers.get('X-Document-Name') || 'Unknown Document',
      documentType: response.headers.get('X-Document-Type') || originalMimeType || 'application/octet-stream',
      shareToken: response.headers.get('X-Share-Token') || shareToken,
      requiresDecryption,
      originalMimeType
    };
  }

  /**
   * Check if share allows preview access
   */
  static async checkPreviewAccess(shareToken: string, password?: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.BASE_URL}/api/v1/shares/${shareToken}`, {
        method: 'GET'
      });
      
      if (!response.ok) return false;
      
      const shareData = await response.json();
      return shareData.permissions?.includes('read') || shareData.allow_preview;
    } catch {
      return false;
    }
  }
}