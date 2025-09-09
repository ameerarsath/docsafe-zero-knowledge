/**
 * Document Preview API Service
 * Handles communication with backend preview endpoints
 */

import { apiClient } from '../api';

export interface PreviewData {
  type: 'thumbnail' | 'text' | 'metadata' | 'encrypted' | 'error' | 'info' | 'icon' | 'decrypted';
  preview_type?: string;
  document_id: number;
  document_name: string;
  file_size: number;
  mime_type: string;
  generated_at?: string;
  
  // Thumbnail-specific fields
  format?: string;
  data?: string;
  data_url?: string;
  thumbnail_size?: { width: number; height: number };
  original_size?: { width: number; height: number };
  pdf_info?: { page_count: number; title?: string; author?: string };
  icon?: string;
  category?: string;
  
  // Text-specific fields
  preview?: string;
  full_text_length?: number;
  line_count?: number;
  word_count?: number;
  encoding?: string;
  is_truncated?: boolean;
  pages_processed?: number;
  total_pages?: number;
  document_type?: string;
  
  // Metadata-specific fields
  file_size_formatted?: string;
  file_extension?: string;
  uploaded_at?: string;
  is_encrypted?: boolean;
  encryption_type?: 'zero-knowledge' | 'legacy' | null;
  
  // Encrypted document fields
  requires_password?: boolean;
  
  // Error fields
  message?: string;
  suggestion?: string;
}

export interface SupportedFormats {
  document_id: number;
  supported_previews: string[];
  recommended_preview: string;
}

class DocumentPreviewService {
  /**
   * Get document preview
   */
  async getPreview(
    documentId: number, 
    options: {
      previewType?: 'auto' | 'thumbnail' | 'text' | 'metadata';
      maxSize?: number;
    } = {}
  ): Promise<PreviewData> {
    const params = new URLSearchParams();
    
    if (options.previewType) {
      params.append('preview_type', options.previewType);
    }
    if (options.maxSize) {
      params.append('max_size', options.maxSize.toString());
    }
    
    const response = await apiClient.get(`/api/v1/documents/${documentId}/preview?${params}`);
    return response.data;
  }

  /**
   * Get preview for encrypted document with password
   */
  async getEncryptedPreview(
    documentId: number,
    password: string,
    options: {
      previewType?: 'auto' | 'thumbnail' | 'text' | 'metadata';
      maxSize?: number;
    } = {}
  ): Promise<PreviewData> {
    const params = new URLSearchParams();
    
    if (options.previewType) {
      params.append('preview_type', options.previewType);
    }
    if (options.maxSize) {
      params.append('max_size', options.maxSize.toString());
    }
    
    const response = await apiClient.post(
      `/api/v1/documents/${documentId}/preview/encrypted?${params}`,
      { password },  // ✅ FIXED: Send as object {password: "..."}
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }

  /**
   * Get supported preview formats for a document
   */
  async getSupportedFormats(documentId: number): Promise<SupportedFormats> {
    const response = await apiClient.get(`/api/v1/documents/${documentId}/preview/formats`);
    return response.data;
  }

  /**
   * Check if preview is available for a file type
   */
  isPreviewSupported(mimeType: string, filename?: string): boolean {
    const supportedTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'image/bmp', 'image/tiff', 'image/tif',
      
      // PDFs
      'application/pdf',
      
      // Text files  
      'text/plain', 'text/csv', 'text/markdown', 'text/html', 'text/css', 'text/javascript',
      'application/json', 'application/xml', 'text/xml',
      
      // Office documents
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    
    // Check by MIME type
    if (supportedTypes.includes(mimeType?.toLowerCase())) {
      return true;
    }
    
    // Check by file extension if MIME type not recognized
    if (filename) {
      const extension = filename.split('.').pop()?.toLowerCase();
      const supportedExtensions = [
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'tif',
        'pdf', 'txt', 'csv', 'md', 'html', 'css', 'js', 'json', 'xml',
        'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'
      ];
      return supportedExtensions.includes(extension || '');
    }
    
    return false;
  }

  /**
   * Get recommended preview type for a file
   */
  getRecommendedPreviewType(mimeType: string, filename?: string): 'thumbnail' | 'text' | 'metadata' {
    const mime = mimeType?.toLowerCase() || '';
    
    // Images and PDFs - show thumbnail
    if (mime.startsWith('image/') || mime === 'application/pdf') {
      return 'thumbnail';
    }
    
    // Text files - show text preview
    if (mime.startsWith('text/') || 
        mime === 'application/json' || 
        mime === 'application/xml' ||
        mime.includes('document') ||
        mime.includes('spreadsheet') ||
        mime.includes('presentation')) {
      return 'text';
    }
    
    // Everything else - show metadata
    return 'metadata';
  }

  /**
   * Format preview data for display
   */
  formatPreviewForDisplay(previewData: PreviewData): {
    title: string;
    subtitle: string;
    content: React.ReactNode;
    actions: Array<{ label: string; action: string; }>;
  } {
    const baseInfo = {
      title: previewData.document_name || 'Document',
      subtitle: previewData.file_size_formatted || this.formatFileSize(previewData.file_size),
      actions: [] as Array<{ label: string; action: string; }>
    };

    switch (previewData.type) {
      case 'thumbnail':
        return {
          ...baseInfo,
          content: previewData.data_url,
          actions: [
            { label: 'View Full Size', action: 'view_full' },
            { label: 'Download', action: 'download' }
          ]
        };

      case 'text':
        return {
          ...baseInfo,
          subtitle: `${baseInfo.subtitle} • ${previewData.word_count || 0} words`,
          content: previewData.preview,
          actions: [
            { label: 'View Full Text', action: 'view_full' },
            { label: 'Download', action: 'download' }
          ]
        };

      case 'metadata':
        return {
          ...baseInfo,
          content: previewData.category || 'Document',
          actions: [
            { label: 'Download', action: 'download' }
          ]
        };

      case 'encrypted':
        return {
          ...baseInfo,
          subtitle: `Encrypted ${previewData.encryption_type} document`,
          content: previewData.message || 'Password required',
          actions: [
            { label: 'Enter Password', action: 'password' }
          ]
        };

      case 'error':
        return {
          ...baseInfo,
          content: previewData.message || 'Preview unavailable',
          actions: [
            { label: 'Download', action: 'download' }
          ]
        };

      default:
        return {
          ...baseInfo,
          content: 'Preview unavailable',
          actions: [
            { label: 'Download', action: 'download' }
          ]
        };
    }
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  }
}

export const documentPreviewService = new DocumentPreviewService();