/**
 * Enhanced Image Preview Plugin
 * Robust image handling with fallback to server processing
 */

import { PreviewPlugin, PreviewResult, PreviewOptions } from '../pluginSystem';

export class EnhancedImagePreviewPlugin implements PreviewPlugin {
  name = 'EnhancedImagePreview';
  priority = 81; // Higher than existing image plugin
  description = 'Enhanced image preview with robust error handling';
  version = '2.0.0';

  supportedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'image/svg+xml'
  ];

  supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.tif', '.svg'];

  canPreview(mimeType: string, fileName: string): boolean {
    const extension = fileName.toLowerCase().split('.').pop();
    return this.supportedMimeTypes.includes(mimeType) ||
           (extension && this.supportedExtensions.includes(`.${extension}`));
  }

  async preview(
    blob: Blob,
    fileName: String,
    mimeType: string,
    options?: PreviewOptions
  ): Promise<PreviewResult> {
    const startTime = performance.now();

    try {
      console.log(`🖼️ Enhanced Image Plugin: Processing ${fileName} (${mimeType})`);

      // Try client-side processing first
      try {
        const result = await this.processClientSide(blob, fileName, mimeType);
        if (result.type === 'success') {
          console.log(`✅ Client-side image processing successful for ${fileName}`);
          return result;
        }
      } catch (clientError) {
        console.warn(`⚠️ Client-side image processing failed for ${fileName}:`, clientError);
        // Continue to server-side fallback
      }

      // Fallback to server-side processing
      console.log(`🔄 Falling back to server-side image processing for ${fileName}`);
      return await this.processServerSide(blob, fileName, mimeType);

    } catch (error) {
      console.error(`❌ Enhanced Image Plugin failed for ${fileName}:`, error);
      return this.generateFallbackResult(fileName, mimeType, error as Error);
    }
  }

  private async processClientSide(
    blob: Blob,
    fileName: string,
    mimeType: string
  ): Promise<PreviewResult> {
    // Check file size limit (20MB for client-side)
    if (blob.size > 20 * 1024 * 1024) {
      throw new Error('Image too large for client-side processing');
    }

    // Validate image format
    const validation = await this.validateImageFile(blob);
    if (!validation.isValid) {
      throw new Error(`Image validation failed: ${validation.reason}`);
    }

    // Create object URL for preview
    const objectUrl = URL.createObjectURL(blob);

    try {
      // Test if the image can be loaded
      await this.loadImageTest(objectUrl);

      // Get image dimensions
      const dimensions = await this.getImageDimensions(objectUrl);

      return {
        type: 'success',
        format: 'html',
        content: this.generateImagePreviewHTML(fileName, objectUrl, dimensions, blob.size),
        metadata: {
          title: fileName,
          pluginName: this.name,
          fileSize: blob.size,
          width: dimensions.width,
          height: dimensions.height,
          clientSideProcessing: true
        }
      };

    } finally {
      // Clean up object URL after a delay to allow rendering
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    }
  }

  private async processServerSide(
    blob: Blob,
    fileName: string,
    mimeType: string
  ): Promise<PreviewResult> {
    try {
      // Use the backend preview service
      const formData = new FormData();
      formData.append('file', blob, fileName);
      formData.append('mime_type', mimeType);

      const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8002'}/api/v1/documents/preview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server preview failed: ${response.status} - ${errorText}`);
      }

      const serverResult = await response.json();
      console.log('📊 Server image preview result:', serverResult);

      // Convert server result to our format
      return this.convertServerResult(serverResult, fileName, blob);

    } catch (error) {
      console.error('❌ Server-side image processing failed:', error);
      throw error;
    }
  }

  private async validateImageFile(blob: Blob): Promise<{ isValid: boolean; reason?: string }> {
    try {
      // Check file size
      if (blob.size === 0) {
        return { isValid: false, reason: 'File is empty' };
      }

      if (blob.size > 100 * 1024 * 1024) { // 100MB limit
        return { isValid: false, reason: 'File too large (limit: 100MB)' };
      }

      // Check file signature for common image formats
      const buffer = await blob.slice(0, 12).arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // JPEG signature
      if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
        return { isValid: true };
      }

      // PNG signature
      if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
        return { isValid: true };
      }

      // GIF signature
      if ((bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) ||
          String.fromCharCode(...bytes.slice(0, 6)) === 'GIF87a' ||
          String.fromCharCode(...bytes.slice(0, 6)) === 'GIF89a') {
        return { isValid: true };
      }

      // WebP signature
      if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
          bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
        return { isValid: true };
      }

      // BMP signature
      if (bytes[0] === 0x42 && bytes[1] === 0x4D) {
        return { isValid: true };
      }

      // Allow processing anyway - let browser/server handle validation
      return { isValid: true };

    } catch (error) {
      return { isValid: true }; // Allow processing anyway
    }
  }

  private loadImageTest(objectUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image cannot be loaded'));
      img.src = objectUrl;
    });
  }

  private getImageDimensions(objectUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => reject(new Error('Cannot get image dimensions'));
      img.src = objectUrl;
    });
  }

  private convertServerResult(serverResult: any, fileName: string, blob: Blob): PreviewResult {
    if (serverResult.type === 'info' && serverResult.image_info) {
      const objectUrl = URL.createObjectURL(blob);

      // Clean up after delay
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);

      return {
        type: 'success',
        format: 'html',
        content: this.generateImageInfoHTML(fileName, serverResult, objectUrl),
        metadata: {
          title: fileName,
          pluginName: this.name,
          serverProcessing: true,
          ...serverResult.image_info
        }
      };
    }

    if (serverResult.type === 'thumbnail' && serverResult.data_url) {
      return {
        type: 'success',
        format: 'html',
        content: this.generateThumbnailHTML(fileName, serverResult),
        metadata: {
          title: fileName,
          pluginName: this.name,
          serverProcessing: true,
          thumbnail: true
        }
      };
    }

    // Generic server response
    return {
      type: 'success',
      format: 'html',
      content: this.generateServerInfoHTML(fileName, serverResult),
      metadata: {
        title: fileName,
        pluginName: this.name,
        fallback: true,
        serverMessage: serverResult.message
      }
    };
  }

  private generateImagePreviewHTML(fileName: string, objectUrl: string, dimensions: any, fileSize: number): string {
    return `
      <div class="enhanced-image-preview">
        <style>
          .enhanced-image-preview {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f8f9fa;
            border-radius: 8px;
            overflow: hidden;
            height: 100%;
            display: flex;
            flex-direction: column;
          }

          .image-header {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .image-icon {
            font-size: 2.5rem;
          }

          .image-title {
            flex: 1;
          }

          .image-title h3 {
            margin: 0;
            font-size: 1.3rem;
            font-weight: 600;
          }

          .image-subtitle {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-top: 0.25rem;
          }

          .image-stats {
            background: white;
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            gap: 2rem;
            font-size: 0.9rem;
            color: #666;
            flex-wrap: wrap;
          }

          .stat-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .image-content {
            flex: 1;
            padding: 1.5rem;
            background: white;
            overflow-y: auto;
            text-align: center;
          }

          .image-preview {
            max-width: 100%;
            max-height: 500px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            margin: 1rem 0;
          }

          .success-badge {
            background: #28a745;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
          }
        </style>

        <div class="image-header">
          <div class="image-icon">🖼️</div>
          <div class="image-title">
            <h3>${this.escapeHtml(fileName)}</h3>
            <div class="image-subtitle">Image Preview</div>
          </div>
          <div class="success-badge">✅ Loaded</div>
        </div>

        <div class="image-stats">
          <div class="stat-item">
            <span>📐</span>
            <span>Dimensions: ${dimensions.width} × ${dimensions.height}</span>
          </div>
          <div class="stat-item">
            <span>💾</span>
            <span>Size: ${this.formatFileSize(fileSize)}</span>
          </div>
          <div class="stat-item">
            <span>🔧</span>
            <span>Processing: Client-side</span>
          </div>
        </div>

        <div class="image-content">
          <img src="${objectUrl}" alt="${this.escapeHtml(fileName)}" class="image-preview" />

          <div style="margin-top: 1rem; padding: 1rem; background: #e8f5e8; border-radius: 6px; border-left: 4px solid #28a745;">
            <strong>🖼️ Image Successfully Loaded</strong><br>
            Click the image to view in full size. Right-click to save or copy.
          </div>
        </div>
      </div>
    `;
  }

  private generateImageInfoHTML(fileName: string, serverResult: any, objectUrl: string): string {
    const imageInfo = serverResult.image_info || {};

    return `
      <div class="enhanced-image-info">
        <style>
          .enhanced-image-info {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f8f9fa;
            border-radius: 8px;
            overflow: hidden;
            height: 100%;
            display: flex;
            flex-direction: column;
          }

          .info-header {
            background: linear-gradient(135deg, #17a2b8 0%, #6f42c1 100%);
            color: white;
            padding: 1.5rem;
            text-align: center;
          }

          .info-content {
            flex: 1;
            padding: 2rem;
            background: white;
            text-align: center;
          }

          .image-display {
            max-width: 100%;
            max-height: 400px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            margin: 1rem 0;
          }

          .image-details {
            background: #f8f9fa;
            border-radius: 6px;
            padding: 1rem;
            margin: 1rem 0;
            text-align: left;
          }

          .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid #e9ecef;
          }

          .detail-row:last-child {
            border-bottom: none;
          }
        </style>

        <div class="info-header">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🖼️</div>
          <h2>${this.escapeHtml(fileName)}</h2>
          <p>${serverResult.message || 'Image processed by server'}</p>
        </div>

        <div class="info-content">
          <img src="${objectUrl}" alt="${this.escapeHtml(fileName)}" class="image-display" />

          <div class="image-details">
            ${imageInfo.width ? `
              <div class="detail-row">
                <span><strong>📐 Dimensions:</strong></span>
                <span>${imageInfo.width} × ${imageInfo.height} pixels</span>
              </div>
            ` : ''}
            ${imageInfo.format ? `
              <div class="detail-row">
                <span><strong>🎨 Format:</strong></span>
                <span>${imageInfo.format}</span>
              </div>
            ` : ''}
            ${imageInfo.mode ? `
              <div class="detail-row">
                <span><strong>🎯 Color Mode:</strong></span>
                <span>${imageInfo.mode}</span>
              </div>
            ` : ''}
            ${imageInfo.size_mb ? `
              <div class="detail-row">
                <span><strong>💾 File Size:</strong></span>
                <span>${imageInfo.size_mb} MB</span>
              </div>
            ` : ''}
          </div>

          <div style="margin-top: 1rem; padding: 1rem; background: #d1ecf1; border-radius: 6px; border-left: 4px solid #17a2b8;">
            <strong>ℹ️ ${serverResult.suggestion || 'Image processed successfully'}</strong>
          </div>
        </div>
      </div>
    `;
  }

  private generateThumbnailHTML(fileName: string, serverResult: any): string {
    return `
      <div class="thumbnail-preview">
        <style>
          .thumbnail-preview {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 2rem;
            text-align: center;
            background: #f8f9fa;
            border-radius: 8px;
          }

          .thumbnail-image {
            max-width: 100%;
            max-height: 400px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            margin: 1rem 0;
          }
        </style>

        <h2>🖼️ ${this.escapeHtml(fileName)}</h2>
        <p>Server-generated thumbnail</p>

        <img src="${serverResult.data_url}" alt="${this.escapeHtml(fileName)}" class="thumbnail-image" />

        <div style="margin-top: 1rem; padding: 1rem; background: #fff3e0; border-radius: 6px;">
          This is a server-generated thumbnail. Download the file for the full-resolution image.
        </div>
      </div>
    `;
  }

  private generateServerInfoHTML(fileName: string, serverResult: any): string {
    const message = serverResult.message || 'Image processed by server';

    return `
      <div class="server-image-info">
        <style>
          .server-image-info {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 2rem;
            text-align: center;
            background: #f8f9fa;
            border-radius: 8px;
          }

          .info-message {
            background: #fff3e0;
            border: 1px solid #ffcc02;
            border-radius: 8px;
            padding: 1.5rem;
            margin: 1.5rem 0;
            line-height: 1.6;
          }
        </style>

        <div style="font-size: 3rem; margin-bottom: 1rem;">🖼️</div>
        <h2>${this.escapeHtml(fileName)}</h2>

        <div class="info-message">
          <strong>ℹ️ ${message}</strong>
        </div>

        <div style="background: #e8f5e8; border-radius: 6px; padding: 1rem; margin: 1rem 0;">
          <strong>💡 ${serverResult.suggestion || 'Download the file to view the image'}</strong>
        </div>
      </div>
    `;
  }

  private generateFallbackResult(fileName: string, mimeType: string, error: Error): PreviewResult {
    return {
      type: 'success',
      format: 'html',
      content: `
        <div class="image-error-fallback">
          <style>
            .image-error-fallback {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 2rem;
              text-align: center;
              background: #f8f9fa;
              border-radius: 8px;
            }

            .error-content {
              background: white;
              padding: 1.5rem;
              border-radius: 8px;
              margin: 1rem 0;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .error-message {
              background: #f8d7da;
              color: #721c24;
              padding: 1rem;
              border-radius: 6px;
              margin: 1rem 0;
              font-size: 0.9rem;
            }

            .recovery-section {
              background: #d1ecf1;
              color: #0c5460;
              padding: 1rem;
              border-radius: 6px;
              margin: 1rem 0;
            }
          </style>

          <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
          <h2>Image Preview Failed</h2>

          <div class="error-content">
            <p><strong>🖼️ ${this.escapeHtml(fileName)}</strong></p>

            <div class="error-message">
              <strong>Technical Details:</strong><br>
              ${this.escapeHtml(error.message)}
            </div>

            <div class="recovery-section">
              <strong>✅ Image file is still accessible!</strong><br><br>
              This error only affects the preview generation. Your image is intact and can be downloaded normally.
              <br><br>
              <strong>Recommended actions:</strong><br>
              • Download the file to view in an image viewer<br>
              • Check if the image file is corrupted<br>
              • Try converting to a common format (JPEG, PNG)
            </div>
          </div>
        </div>
      `,
      metadata: {
        title: fileName,
        pluginName: this.name,
        fallback: true,
        originalError: error.message
      }
    };
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}