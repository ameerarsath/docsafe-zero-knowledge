/**
 * Enhanced Text File Preview Plugin
 * Robust text file handling with encoding detection and server fallback
 */

import { PreviewPlugin, PreviewResult, PreviewOptions } from '../pluginSystem';

export class EnhancedTextFilePlugin implements PreviewPlugin {
  name = 'EnhancedTextFile';
  priority = 79; // Higher than existing text plugin
  description = 'Enhanced text file preview with robust encoding detection';
  version = '2.0.0';

  supportedMimeTypes = [
    'text/plain',
    'text/html',
    'text/markdown',
    'text/xml',
    'application/xml',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/json',
    'application/x-yaml',
    'text/yaml',
    'text/x-python',
    'text/x-sql',
    'application/sql',
    'text/x-log',
    'text/x-ini',
    'text/x-conf',
    'text/csv'
  ];

  supportedExtensions = [
    'txt', 'html', 'htm', 'md', 'markdown', 'mdown',
    'json', 'xml', 'css', 'js', 'ts', 'jsx', 'tsx',
    'py', 'sql', 'yaml', 'yml', 'log', 'conf', 'ini',
    'csv', 'tsv', 'env', 'gitignore', 'dockerfile',
    'sh', 'bash', 'bat', 'ps1', 'config', 'cfg'
  ];

  canPreview(mimeType: string, fileName: string): boolean {
    const extension = fileName.toLowerCase().split('.').pop();
    return this.supportedMimeTypes.includes(mimeType) ||
           (extension && this.supportedExtensions.includes(extension));
  }

  async preview(
    blob: Blob,
    fileName: string,
    mimeType: string,
    options?: PreviewOptions
  ): Promise<PreviewResult> {
    const startTime = performance.now();

    try {
      console.log(`📝 Enhanced Text Plugin: Processing ${fileName} (${mimeType})`);

      // Try client-side processing first
      try {
        const result = await this.processClientSide(blob, fileName, mimeType);
        if (result.type === 'success') {
          console.log(`✅ Client-side text processing successful for ${fileName}`);
          return result;
        }
      } catch (clientError) {
        console.warn(`⚠️ Client-side text processing failed for ${fileName}:`, clientError);
        // Continue to server-side fallback
      }

      // Fallback to server-side processing
      console.log(`🔄 Falling back to server-side text processing for ${fileName}`);
      return await this.processServerSide(blob, fileName, mimeType);

    } catch (error) {
      console.error(`❌ Enhanced Text Plugin failed for ${fileName}:`, error);
      return this.generateFallbackResult(fileName, mimeType, error as Error);
    }
  }

  private async processClientSide(
    blob: Blob,
    fileName: string,
    mimeType: string
  ): Promise<PreviewResult> {
    // Check file size limit
    if (blob.size > 5 * 1024 * 1024) { // 5MB limit for client-side
      throw new Error('File too large for client-side processing');
    }

    // Try multiple encoding methods
    let textContent: string;
    let usedEncoding = 'utf-8';

    try {
      // First try UTF-8
      textContent = await this.readTextWithEncoding(blob, 'utf-8');
    } catch {
      try {
        // Try UTF-16
        textContent = await this.readTextWithEncoding(blob, 'utf-16');
        usedEncoding = 'utf-16';
      } catch {
        try {
          // Try latin1
          textContent = await this.readTextWithEncoding(blob, 'iso-8859-1');
          usedEncoding = 'iso-8859-1';
        } catch {
          throw new Error('Unable to decode text with any supported encoding');
        }
      }
    }

    // Process the text content
    const processed = this.processTextContent(textContent, fileName, mimeType);

    return {
      type: 'success',
      format: 'html',
      content: this.generateTextPreviewHTML(fileName, processed, blob.size, usedEncoding),
      text: textContent,
      metadata: {
        title: fileName,
        pluginName: this.name,
        fileSize: blob.size,
        encoding: usedEncoding,
        lineCount: processed.lineCount,
        characterCount: processed.characterCount,
        detectedFormat: processed.format
      }
    };
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
      console.log('📊 Server text preview result:', serverResult);

      // Convert server result to our format
      return this.convertServerResult(serverResult, fileName);

    } catch (error) {
      console.error('❌ Server-side text processing failed:', error);
      throw error;
    }
  }

  private readTextWithEncoding(blob: Blob, encoding: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error(`Failed to read text with ${encoding}`));
        }
      };
      reader.onerror = () => reject(new Error(`File reading failed with ${encoding}`));

      // Use TextDecoder for better encoding control
      if (encoding === 'utf-8') {
        reader.readAsText(blob, 'utf-8');
      } else if (encoding === 'utf-16') {
        reader.readAsText(blob, 'utf-16');
      } else {
        reader.readAsText(blob, encoding);
      }
    });
  }

  private processTextContent(content: string, fileName: string, mimeType: string) {
    const extension = fileName.toLowerCase().split('.').pop() || '';
    const lineCount = content.split('\n').length;
    const characterCount = content.length;
    const wordCount = content.trim().split(/\s+/).length;

    // Detect format
    let format = 'plain';
    let language = '';

    if (extension === 'json' || mimeType.includes('json')) {
      format = 'json';
      language = 'json';
    } else if (extension === 'xml' || mimeType.includes('xml')) {
      format = 'xml';
      language = 'xml';
    } else if (['js', 'ts', 'jsx', 'tsx'].includes(extension)) {
      format = 'code';
      language = 'javascript';
    } else if (extension === 'py') {
      format = 'code';
      language = 'python';
    } else if (extension === 'css') {
      format = 'code';
      language = 'css';
    } else if (['md', 'markdown'].includes(extension)) {
      format = 'markdown';
    } else if (['html', 'htm'].includes(extension)) {
      format = 'html';
    }

    return {
      content,
      format,
      language,
      lineCount,
      characterCount,
      wordCount,
      extension
    };
  }

  private convertServerResult(serverResult: any, fileName: string): PreviewResult {
    if (serverResult.type === 'text' && serverResult.preview) {
      const processed = {
        content: serverResult.preview,
        format: 'plain',
        language: '',
        lineCount: serverResult.line_count || 0,
        characterCount: serverResult.full_text_length || 0,
        wordCount: serverResult.word_count || 0,
        extension: fileName.toLowerCase().split('.').pop() || ''
      };

      return {
        type: 'success',
        format: 'html',
        content: this.generateTextPreviewHTML(fileName, processed, 0, serverResult.encoding || 'server-detected'),
        metadata: {
          title: fileName,
          pluginName: this.name,
          serverProcessing: true,
          ...serverResult
        }
      };
    }

    if (serverResult.type === 'info' || serverResult.type === 'error') {
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

    return this.generateFallbackResult(fileName, '', new Error('Unknown server response'));
  }

  private generateTextPreviewHTML(fileName: string, processed: any, fileSize: number, encoding: string): string {
    const fileSizeStr = fileSize > 0 ? this.formatFileSize(fileSize) : 'Server processed';

    return `
      <div class="enhanced-text-preview">
        <style>
          .enhanced-text-preview {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f8f9fa;
            border-radius: 8px;
            overflow: hidden;
            height: 100%;
            display: flex;
            flex-direction: column;
          }

          .text-header {
            background: linear-gradient(135deg, #6c757d 0%, #495057 100%);
            color: white;
            padding: 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .text-icon {
            font-size: 2.5rem;
          }

          .text-title {
            flex: 1;
          }

          .text-title h3 {
            margin: 0;
            font-size: 1.3rem;
            font-weight: 600;
          }

          .text-subtitle {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-top: 0.25rem;
          }

          .text-stats {
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

          .text-content {
            flex: 1;
            padding: 1.5rem;
            background: white;
            overflow-y: auto;
          }

          .content-preview {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 1.5rem;
            white-space: pre-wrap;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9rem;
            line-height: 1.5;
            max-height: 500px;
            overflow-y: auto;
            word-wrap: break-word;
          }

          .format-badge {
            background: #6c757d;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
          }

          .encoding-info {
            background: #e9ecef;
            padding: 0.75rem 1rem;
            border-radius: 6px;
            font-size: 0.85rem;
            color: #495057;
            margin-bottom: 1rem;
          }
        </style>

        <div class="text-header">
          <div class="text-icon">📝</div>
          <div class="text-title">
            <h3>${this.escapeHtml(fileName)}</h3>
            <div class="text-subtitle">Text Document</div>
          </div>
          <div class="format-badge">${processed.format.toUpperCase()}</div>
        </div>

        <div class="text-stats">
          <div class="stat-item">
            <span>📄</span>
            <span>Lines: ${processed.lineCount.toLocaleString()}</span>
          </div>
          <div class="stat-item">
            <span>🔤</span>
            <span>Characters: ${processed.characterCount.toLocaleString()}</span>
          </div>
          <div class="stat-item">
            <span>📝</span>
            <span>Words: ${processed.wordCount.toLocaleString()}</span>
          </div>
          <div class="stat-item">
            <span>💾</span>
            <span>Size: ${fileSizeStr}</span>
          </div>
        </div>

        <div class="text-content">
          <div class="encoding-info">
            <strong>📡 Encoding:</strong> ${encoding} •
            <strong>🎯 Format:</strong> ${processed.format}${processed.language ? ` (${processed.language})` : ''}
          </div>

          <h4>📖 Content Preview</h4>
          <div class="content-preview">${this.escapeHtml(processed.content)}</div>

          ${processed.content.length > 5000 ? `
            <div style="margin-top: 1rem; padding: 1rem; background: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
              <strong>📏 Large File Notice:</strong> This preview shows the first portion of the file.
              Download the complete file to view all content.
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  private generateServerInfoHTML(fileName: string, serverResult: any): string {
    const message = serverResult.message || 'This text file cannot be fully processed.';
    const suggestion = serverResult.suggestion || 'Download the file to view with a text editor.';

    return `
      <div class="text-server-info">
        <style>
          .text-server-info {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 2rem;
            text-align: center;
            background: #f8f9fa;
            border-radius: 8px;
          }

          .info-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
          }

          .info-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #495057;
            margin-bottom: 1rem;
          }

          .info-content {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            margin: 1rem 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }

          .info-message {
            background: #fff3e0;
            border: 1px solid #ffcc02;
            border-radius: 6px;
            padding: 1rem;
            margin: 1rem 0;
            line-height: 1.6;
          }

          .suggestion-box {
            background: #e8f5e8;
            border: 1px solid #4caf50;
            border-radius: 6px;
            padding: 1rem;
            margin: 1rem 0;
          }
        </style>

        <div class="info-icon">📝</div>
        <h2 class="info-title">Text File Processing</h2>

        <div class="info-content">
          <p><strong>📄 ${this.escapeHtml(fileName)}</strong></p>

          <div class="info-message">
            <strong>ℹ️ ${message}</strong>
          </div>

          <div class="suggestion-box">
            <strong>💡 ${suggestion}</strong>
          </div>
        </div>
      </div>
    `;
  }

  private generateFallbackResult(fileName: string, mimeType: string, error: Error): PreviewResult {
    return {
      type: 'success',
      format: 'html',
      content: `
        <div class="text-error-fallback">
          <style>
            .text-error-fallback {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 2rem;
              text-align: center;
              background: #f8f9fa;
              border-radius: 8px;
            }

            .error-icon {
              font-size: 3rem;
              margin-bottom: 1rem;
            }

            .error-title {
              font-size: 1.3rem;
              font-weight: 600;
              color: #dc3545;
              margin-bottom: 1rem;
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

          <div class="error-icon">⚠️</div>
          <h2 class="error-title">Text Preview Failed</h2>

          <div class="error-content">
            <p><strong>📝 ${this.escapeHtml(fileName)}</strong></p>

            <div class="error-message">
              <strong>Technical Details:</strong><br>
              ${this.escapeHtml(error.message)}
            </div>

            <div class="recovery-section">
              <strong>✅ File is still accessible!</strong><br><br>
              This error only affects the preview generation. Your text file is intact and can be downloaded normally.
              <br><br>
              <strong>Recommended actions:</strong><br>
              • Download the file to view in a text editor<br>
              • Check if the file uses a special text encoding<br>
              • Try opening with different text editing applications
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