/**
 * Image Preview Plugin
 * Handles preview for various image formats (PNG, JPG, GIF, WebP, etc.)
 */

import { PreviewPlugin, PreviewResult } from '../pluginSystem';

export class ImagePreviewPlugin implements PreviewPlugin {
  name = 'ImagePreview';
  priority = 80; // High priority for images

  supportedMimeTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/tiff',
    'image/ico'
  ];

  supportedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico'];

  canPreview(mimeType: string, fileName: string): boolean {
    // Check MIME type first
    if (this.supportedMimeTypes.includes(mimeType.toLowerCase())) {
      return true;
    }

    // Fallback to file extension check
    const extension = fileName.toLowerCase().split('.').pop() || '';
    return this.supportedExtensions.includes(extension);
  }

  async preview(blob: Blob, fileName: string, mimeType: string): Promise<PreviewResult> {
    try {
      console.log(`🖼️ Processing image: ${fileName} (${mimeType})`);

      // Create object URL for the image
      const imageUrl = URL.createObjectURL(blob);

      // Get image dimensions
      const dimensions = await this.getImageDimensions(imageUrl);

      // Create preview HTML
      const content = this.createImagePreviewHTML(imageUrl, fileName, dimensions, blob.size);

      const metadata = {
        title: fileName,
        pages: 1,
        format: 'html',
        fileSize: blob.size,
        dimensions: dimensions,
        mimeType: mimeType,
        isImage: true
      };

      console.log(`✅ Image preview generated for ${fileName}`);

      return {
        type: 'success',
        format: 'html',
        content,
        metadata
      };

    } catch (error) {
      console.error('❌ Image preview failed:', error);

      return {
        type: 'error',
        error: error instanceof Error ? error.message : 'Image preview failed',
        format: 'html',
        content: this.createErrorHTML(fileName, error)
      };
    }
  }

  private async getImageDimensions(imageUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for dimension calculation'));
      };

      img.src = imageUrl;
    });
  }

  private createImagePreviewHTML(
    imageUrl: string,
    fileName: string,
    dimensions: { width: number; height: number },
    fileSize: number
  ): string {
    const fileSizeFormatted = this.formatFileSize(fileSize);

    return `
      <div class="image-preview-container">
        <style>
          .image-preview-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 12px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 100%;
            height: 100%;
            box-sizing: border-box;
          }

          .image-info {
            background: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 20px;
            text-align: center;
            width: 100%;
            max-width: 600px;
          }

          .image-title {
            font-size: 1.2rem;
            font-weight: 600;
            color: #495057;
            margin-bottom: 10px;
            word-break: break-word;
          }

          .image-meta {
            display: flex;
            justify-content: space-around;
            gap: 20px;
            flex-wrap: wrap;
            font-size: 0.9rem;
            color: #6c757d;
          }

          .image-meta-item {
            text-align: center;
          }

          .image-meta-label {
            font-weight: 600;
            display: block;
            margin-bottom: 4px;
          }

          .image-display {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            max-width: 100%;
            max-height: calc(100vh - 200px);
            overflow: auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 20px;
          }

          .preview-image {
            max-width: 100%;
            max-height: 100%;
            height: auto;
            width: auto;
            object-fit: contain;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            cursor: zoom-in;
            transition: transform 0.2s ease;
          }

          .preview-image:hover {
            transform: scale(1.02);
          }

          .zoom-controls {
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 10;
          }

          .zoom-btn {
            background: rgba(0, 0, 0, 0.7);
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s ease;
          }

          .zoom-btn:hover {
            background: rgba(0, 0, 0, 0.9);
          }

          @media (max-width: 768px) {
            .image-meta {
              flex-direction: column;
              gap: 10px;
            }

            .image-preview-container {
              padding: 15px;
            }

            .zoom-controls {
              position: relative;
              top: auto;
              right: auto;
              justify-content: center;
              margin-top: 15px;
            }
          }
        </style>

        <div class="image-info">
          <div class="image-title">${fileName}</div>
          <div class="image-meta">
            <div class="image-meta-item">
              <span class="image-meta-label">Dimensions</span>
              <span>${dimensions.width} × ${dimensions.height}px</span>
            </div>
            <div class="image-meta-item">
              <span class="image-meta-label">File Size</span>
              <span>${fileSizeFormatted}</span>
            </div>
            <div class="image-meta-item">
              <span class="image-meta-label">Format</span>
              <span>${fileName.split('.').pop()?.toUpperCase() || 'Unknown'}</span>
            </div>
          </div>
        </div>

        <div class="image-display">
          <img
            src="${imageUrl}"
            alt="${fileName}"
            class="preview-image"
            onload="console.log('Image loaded successfully')"
            onerror="console.error('Failed to load image')"
          />
        </div>

        <div class="zoom-controls">
          <button class="zoom-btn" onclick="window.open('${imageUrl}', '_blank')">
            🔍 Full Size
          </button>
          <button class="zoom-btn" onclick="downloadImage('${imageUrl}', '${fileName}')">
            💾 Download
          </button>
        </div>
      </div>

      <script>
        function downloadImage(url, filename) {
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      </script>
    `;
  }

  private createErrorHTML(fileName: string, error: any): string {
    return `
      <div style="
        padding: 40px;
        text-align: center;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-radius: 12px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      ">
        <div style="font-size: 4rem; margin-bottom: 20px; opacity: 0.7;">🖼️</div>
        <h2 style="color: #dc3545; margin-bottom: 15px;">Image Preview Error</h2>
        <p style="color: #6c757d; margin-bottom: 20px;">
          Unable to preview <strong>${fileName}</strong>
        </p>
        <div style="
          background: #f8d7da;
          color: #721c24;
          padding: 15px;
          border-radius: 6px;
          font-size: 0.9rem;
          margin-top: 20px;
        ">
          <strong>Error:</strong> ${error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    `;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}