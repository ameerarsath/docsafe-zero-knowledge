/**
 * Universal Fallback Plugin
 * Handles any file type that other plugins cannot process
 * Provides clean, user-friendly messages instead of raw errors
 */

import { PreviewPlugin, PreviewResult, PreviewOptions } from '../pluginSystem';

interface FallbackInfo {
  category: string;
  icon: string;
  description: string;
  suggestions: string[];
  canView: boolean;
}

export class UniversalFallbackPlugin implements PreviewPlugin {
  name = 'UniversalFallback';
  priority = 1; // Lowest priority - should be last resort
  supportedMimeTypes = ['*/*']; // Catch all
  supportedExtensions = ['*']; // Catch all
  description = 'Universal fallback for unsupported file types';
  version = '1.0.0';

  canPreview(mimeType: string, fileName: string): boolean {
    // This plugin can "preview" any file by showing a fallback message
    return true;
  }

  async preview(
    blob: Blob,
    fileName: string,
    mimeType: string,
    options?: PreviewOptions
  ): Promise<PreviewResult> {
    try {
      const fallbackInfo = this.getFallbackInfo(fileName, mimeType);
      const html = this.generateFallbackHTML(fileName, mimeType, blob.size, fallbackInfo);

      return {
        type: 'success',
        format: 'html',
        content: html,
        metadata: {
          title: fileName,
          pluginName: this.name,
          fileSize: blob.size,
          fallback: true,
          category: fallbackInfo.category,
          canView: fallbackInfo.canView
        }
      };
    } catch (error) {
      // Even the fallback failed - provide basic error message
      return {
        type: 'error',
        format: 'html',
        content: this.generateBasicErrorHTML(fileName, error as Error),
        error: `Fallback preview failed: ${(error as Error).message}`
      };
    }
  }

  private getFallbackInfo(fileName: string, mimeType: string): FallbackInfo {
    const extension = fileName.toLowerCase().split('.').pop() || '';

    // Categorize file types and provide specific guidance
    if (['pdf'].includes(extension) || mimeType.includes('pdf')) {
      return {
        category: 'PDF Document',
        icon: '📄',
        description: 'PDF preview is temporarily unavailable.',
        suggestions: [
          'Try refreshing the page',
          'Download to view with a PDF reader',
          'Use a dedicated PDF viewer application'
        ],
        canView: true
      };
    }

    if (['doc', 'docx'].includes(extension) || mimeType.includes('word') || mimeType.includes('document')) {
      return {
        category: 'Word Document',
        icon: '📝',
        description: 'Word document preview is temporarily unavailable.',
        suggestions: [
          'Download to view in Microsoft Word',
          'Convert to PDF for preview support',
          'Use Microsoft Word Online'
        ],
        canView: true
      };
    }

    if (['xls', 'xlsx'].includes(extension) || mimeType.includes('excel') || mimeType.includes('sheet')) {
      return {
        category: 'Excel Spreadsheet',
        icon: '📊',
        description: 'Excel file preview is temporarily unavailable.',
        suggestions: [
          'Download to view in Microsoft Excel',
          'Convert to CSV for preview support',
          'Use Microsoft Excel Online'
        ],
        canView: true
      };
    }

    if (['ppt', 'pptx'].includes(extension) || mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
      return {
        category: 'PowerPoint Presentation',
        icon: '📋',
        description: 'PowerPoint presentations cannot be previewed in the browser.',
        suggestions: [
          'Download to view in Microsoft PowerPoint',
          'Convert to PDF for preview support',
          'Use Microsoft PowerPoint Online'
        ],
        canView: true
      };
    }

    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension) || mimeType.includes('zip') || mimeType.includes('archive')) {
      return {
        category: 'Archive File',
        icon: '🗂️',
        description: 'Archive files cannot be previewed directly.',
        suggestions: [
          'Download to extract and view contents',
          'Use an archive manager to explore contents',
          'Extract individual files for preview'
        ],
        canView: false
      };
    }

    if (['exe', 'msi', 'dmg', 'pkg', 'deb', 'rpm', 'app'].includes(extension)) {
      return {
        category: 'Executable File',
        icon: '⚙️',
        description: 'Executable files cannot be previewed for security reasons.',
        suggestions: [
          'Download with caution',
          'Scan for viruses before running',
          'Verify the source is trusted'
        ],
        canView: false
      };
    }

    if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(extension) || mimeType.includes('video')) {
      return {
        category: 'Video File',
        icon: '🎥',
        description: 'Video files are not supported for preview.',
        suggestions: [
          'Download to view in a video player',
          'Use VLC or another media player',
          'Convert to a web-compatible format'
        ],
        canView: false
      };
    }

    if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(extension) || mimeType.includes('audio')) {
      return {
        category: 'Audio File',
        icon: '🎵',
        description: 'Audio files are not supported for preview.',
        suggestions: [
          'Download to play in an audio player',
          'Use a dedicated music application',
          'Convert to a web-compatible format'
        ],
        canView: false
      };
    }

    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'bmp', 'webp'].includes(extension) || mimeType.includes('image')) {
      return {
        category: 'Image File',
        icon: '🖼️',
        description: 'Image preview is temporarily unavailable.',
        suggestions: [
          'Try refreshing the page',
          'Download to view in an image viewer',
          'Check if the image file is corrupted'
        ],
        canView: true
      };
    }

    if (['txt', 'log', 'md', 'json', 'xml', 'csv'].includes(extension) || mimeType.includes('text')) {
      return {
        category: 'Text File',
        icon: '📃',
        description: 'Text file preview is temporarily unavailable.',
        suggestions: [
          'Try refreshing the page',
          'Download to view in a text editor',
          'Open with a code editor for syntax highlighting'
        ],
        canView: true
      };
    }

    // Unknown file type
    return {
      category: 'Unknown File Type',
      icon: '❓',
      description: `Files with .${extension} extension are not supported for preview.`,
      suggestions: [
        'Download to view with appropriate software',
        'Check file format compatibility',
        'Convert to a supported format if possible'
      ],
      canView: false
    };
  }

  private generateFallbackHTML(fileName: string, mimeType: string, fileSize: number, info: FallbackInfo): string {
    const fileSizeFormatted = this.formatFileSize(fileSize);

    return `
      <div class="fallback-preview">
        <style>
          .fallback-preview {
            width: 100%;
            height: 100%;
            min-height: 500px;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            box-sizing: border-box;
          }

          .fallback-container {
            background: white;
            border-radius: 16px;
            padding: 2.5rem;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            max-width: 600px;
            width: 100%;
            text-align: center;
            border: 1px solid #e2e8f0;
          }

          .file-icon {
            font-size: 4rem;
            margin-bottom: 1.5rem;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
          }

          .file-category {
            color: #1e293b;
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
          }

          .file-description {
            color: #64748b;
            font-size: 1.1rem;
            margin-bottom: 2rem;
            line-height: 1.6;
          }

          .file-details {
            background: #f8fafc;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            border: 1px solid #e2e8f0;
          }

          .file-detail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 1rem;
            text-align: left;
          }

          .file-detail-item {
            display: flex;
            flex-direction: column;
          }

          .detail-label {
            font-size: 0.75rem;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.25rem;
            font-weight: 600;
          }

          .detail-value {
            font-size: 0.9rem;
            color: #1e293b;
            font-weight: 500;
            word-break: break-all;
          }

          .preview-status {
            background: ${info.canView ? '#fef3c7' : '#fee2e2'};
            border: 1px solid ${info.canView ? '#fbbf24' : '#fca5a5'};
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 2rem;
          }

          .status-title {
            color: ${info.canView ? '#92400e' : '#991b1b'};
            font-weight: 600;
            margin-bottom: 0.5rem;
            font-size: 1rem;
          }

          .status-message {
            color: ${info.canView ? '#92400e' : '#991b1b'};
            font-size: 0.9rem;
            line-height: 1.5;
          }

          .suggestions-section {
            background: #f1f5f9;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            text-align: left;
          }

          .suggestions-title {
            color: #374151;
            font-weight: 600;
            margin-bottom: 1rem;
            font-size: 1rem;
            text-align: center;
          }

          .suggestions-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .suggestion-item {
            color: #4b5563;
            margin: 0.75rem 0;
            padding-left: 2rem;
            position: relative;
            line-height: 1.5;
            font-size: 0.9rem;
          }

          .suggestion-item::before {
            content: "💡";
            position: absolute;
            left: 0;
            top: 0;
          }

          .action-buttons {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
          }

          .action-btn {
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 10px;
            padding: 0.875rem 1.75rem;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
          }

          .action-btn:hover {
            background: #1d4ed8;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(37, 99, 235, 0.3);
          }

          .action-btn.secondary {
            background: #6b7280;
            box-shadow: 0 2px 4px rgba(107, 114, 128, 0.2);
          }

          .action-btn.secondary:hover {
            background: #4b5563;
            box-shadow: 0 4px 8px rgba(107, 114, 128, 0.3);
          }

          @media (max-width: 640px) {
            .fallback-preview {
              padding: 1rem;
            }

            .fallback-container {
              padding: 1.5rem;
            }

            .file-category {
              font-size: 1.5rem;
            }

            .file-description {
              font-size: 1rem;
            }

            .file-detail-grid {
              grid-template-columns: 1fr;
            }

            .action-buttons {
              flex-direction: column;
            }
          }
        </style>

        <div class="fallback-container">
          <div class="file-icon">${info.icon}</div>
          <h2 class="file-category">${info.category}</h2>
          <p class="file-description">${this.escapeHtml(info.description)}</p>

          <div class="file-details">
            <div class="file-detail-grid">
              <div class="file-detail-item">
                <span class="detail-label">Filename</span>
                <span class="detail-value">${this.escapeHtml(fileName)}</span>
              </div>
              <div class="file-detail-item">
                <span class="detail-label">File Size</span>
                <span class="detail-value">${fileSizeFormatted}</span>
              </div>
              <div class="file-detail-item">
                <span class="detail-label">MIME Type</span>
                <span class="detail-value">${this.escapeHtml(mimeType || 'Unknown')}</span>
              </div>
              <div class="file-detail-item">
                <span class="detail-label">Preview Support</span>
                <span class="detail-value">${info.canView ? 'Limited' : 'Not Available'}</span>
              </div>
            </div>
          </div>

          <div class="preview-status">
            <div class="status-title">${info.canView ? '⚠️ Preview Unavailable' : '🚫 Preview Not Supported'}</div>
            <div class="status-message">${this.escapeHtml(info.description)}</div>
          </div>

          <div class="suggestions-section">
            <h4 class="suggestions-title">💡 What you can do:</h4>
            <ul class="suggestions-list">
              ${info.suggestions.map(suggestion =>
                `<li class="suggestion-item">${this.escapeHtml(suggestion)}</li>`
              ).join('')}
            </ul>
          </div>

          <div class="action-buttons">
            <button class="action-btn" onclick="window.parent.postMessage({type: 'download'}, '*')">
              💾 Download File
            </button>
            <button class="action-btn secondary" onclick="window.parent.postMessage({type: 'close'}, '*')">
              ✕ Close Preview
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private generateBasicErrorHTML(fileName: string, error: Error): string {
    return `
      <div style="padding: 2rem; text-align: center; background: #fef2f2; color: #dc2626; border-radius: 8px; border: 1px solid #fecaca;">
        <h3>❌ Preview Error</h3>
        <p><strong>File:</strong> ${this.escapeHtml(fileName)}</p>
        <p><strong>Error:</strong> ${this.escapeHtml(error.message)}</p>
        <p>Unable to generate preview for this file. Please download to view.</p>
        <button onclick="window.parent.postMessage({type: 'download'}, '*')" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Download File
        </button>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}