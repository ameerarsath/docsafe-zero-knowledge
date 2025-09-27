/**
 * Text File Preview Plugin
 * Handles various text-based file formats with syntax highlighting and rendering
 * Supports: .txt, .html, .md, .json, .xml, .css, .js, .ts, .py, .sql, .yaml, .yml, .log, .conf, .ini
 */

import { PreviewPlugin, PreviewResult, PreviewOptions } from '../pluginSystem';

interface TextProcessingResult {
  content: string;
  processedHtml: string;
  format: 'plain' | 'markdown' | 'html' | 'json' | 'xml' | 'code';
  language?: string;
  lineCount: number;
  characterCount: number;
  size: string;
}

export class TextFilePreviewPlugin implements PreviewPlugin {
  name = 'TextFilePreview';
  priority = 78;
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

  description = 'Comprehensive text file preview with syntax highlighting and formatting';
  version = '1.0.0';

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
      console.log(`🔍 Starting text file preview for ${fileName}`);

      // Read text content
      const textContent = await this.readTextContent(blob);

      // Process the text based on file type
      const processed = await this.processTextContent(textContent, fileName, mimeType);

      // Generate HTML preview
      const html = this.generateTextPreviewHTML(fileName, processed, blob.size);

      return {
        type: 'success',
        format: 'html',
        content: html,
        text: textContent,
        metadata: {
          title: fileName,
          pluginName: this.name,
          fileSize: blob.size,
          processingTime: `${(performance.now() - startTime).toFixed(1)}ms`,
          extractionMethod: 'Text file reading with format detection',
          lineCount: processed.lineCount,
          characterCount: processed.characterCount,
          detectedFormat: processed.format,
          language: processed.language
        },
        performance: {
          startTime,
          endTime: performance.now(),
          duration: performance.now() - startTime
        }
      };

    } catch (error) {
      console.error('❌ Text file preview failed:', error);

      return {
        type: 'error',
        format: 'html',
        content: this.generateErrorHTML(fileName, error as Error),
        error: `Text preview failed: ${(error as Error).message}`,
        metadata: {
          title: fileName,
          pluginName: this.name,
          fileSize: blob.size,
          processingTime: `${(performance.now() - startTime).toFixed(1)}ms`,
          fallback: true,
          originalError: (error as Error).message
        }
      };
    }
  }

  private async readTextContent(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read text content'));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsText(blob);
    });
  }

  private async processTextContent(content: string, fileName: string, mimeType: string): Promise<TextProcessingResult> {
    const extension = fileName.toLowerCase().split('.').pop() || '';
    const lineCount = content.split('\n').length;
    const characterCount = content.length;
    const size = this.formatFileSize(content.length);

    // Detect format and language
    let format: TextProcessingResult['format'] = 'plain';
    let language = '';
    let processedHtml = '';

    // Format detection
    if (extension === 'md' || extension === 'markdown' || extension === 'mdown') {
      format = 'markdown';
      processedHtml = this.processMarkdown(content);
    } else if (extension === 'html' || extension === 'htm' || mimeType.includes('html')) {
      format = 'html';
      processedHtml = this.processHTML(content);
    } else if (extension === 'json' || mimeType.includes('json')) {
      format = 'json';
      language = 'json';
      processedHtml = this.processJSON(content);
    } else if (extension === 'xml' || mimeType.includes('xml')) {
      format = 'xml';
      language = 'xml';
      processedHtml = this.processXML(content);
    } else if (['js', 'ts', 'jsx', 'tsx', 'css', 'py', 'sql', 'yaml', 'yml'].includes(extension)) {
      format = 'code';
      language = this.getCodeLanguage(extension);
      processedHtml = this.processCode(content, language);
    } else {
      // Plain text
      processedHtml = this.processPlainText(content);
    }

    return {
      content,
      processedHtml,
      format,
      language,
      lineCount,
      characterCount,
      size
    };
  }

  private processMarkdown(content: string): string {
    // Simple markdown processing (without external library)
    let html = content
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Line breaks
      .replace(/\n/g, '<br>');

    return `<div class="markdown-content">${html}</div>`;
  }

  private processHTML(content: string): string {
    // Display HTML as both rendered and source
    const escaped = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    return `
      <div class="html-preview-tabs">
        <button class="tab-btn active" onclick="showHTMLTab('rendered', this)">🌐 Rendered</button>
        <button class="tab-btn" onclick="showHTMLTab('source', this)">📝 Source</button>
      </div>
      <div id="html-rendered" class="tab-content active">
        <iframe srcdoc="${content.replace(/"/g, '&quot;')}" style="width: 100%; height: 400px; border: 1px solid #ddd; border-radius: 4px;"></iframe>
      </div>
      <div id="html-source" class="tab-content">
        <pre><code class="language-html">${escaped}</code></pre>
      </div>
    `;
  }

  private processJSON(content: string): string {
    try {
      const parsed = JSON.parse(content);
      const formatted = JSON.stringify(parsed, null, 2);
      return `<pre><code class="language-json">${this.escapeHtml(formatted)}</code></pre>`;
    } catch {
      return `<pre><code class="language-json">${this.escapeHtml(content)}</code></pre>`;
    }
  }

  private processXML(content: string): string {
    // Basic XML formatting
    const formatted = content
      .replace(/></g, '>\n<')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');

    return `<pre><code class="language-xml">${this.escapeHtml(formatted)}</code></pre>`;
  }

  private processCode(content: string, language: string): string {
    return `<pre><code class="language-${language}">${this.escapeHtml(content)}</code></pre>`;
  }

  private processPlainText(content: string): string {
    return `<pre class="plain-text">${this.escapeHtml(content)}</pre>`;
  }

  private getCodeLanguage(extension: string): string {
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'javascript',
      'tsx': 'typescript',
      'py': 'python',
      'css': 'css',
      'sql': 'sql',
      'yaml': 'yaml',
      'yml': 'yaml'
    };
    return languageMap[extension] || extension;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private generateTextPreviewHTML(fileName: string, processed: TextProcessingResult, fileSize: number): string {
    return `
      <div class="text-preview-container">
        <style>
          .text-preview-container {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f8f9fa;
            border-radius: 8px;
            overflow: hidden;
            height: 100%;
            display: flex;
            flex-direction: column;
          }

          .text-header {
            background: white;
            padding: 1rem;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
          }

          .text-title {
            font-weight: 600;
            color: #333;
            font-size: 1.1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .text-stats {
            display: flex;
            gap: 1rem;
            font-size: 0.9rem;
            color: #666;
          }

          .text-content {
            flex: 1;
            padding: 1.5rem;
            background: white;
            overflow-y: auto;
            max-height: calc(100vh - 200px);
          }

          .text-preview-tabs {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
          }

          .tab-btn {
            padding: 0.5rem 1rem;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.2s;
          }

          .tab-btn.active, .tab-btn:hover {
            background: #007bff;
            color: white;
            border-color: #007bff;
          }

          .tab-content {
            display: none;
          }

          .tab-content.active {
            display: block;
          }

          pre {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 1rem;
            overflow-x: auto;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9rem;
            line-height: 1.5;
            margin: 0;
          }

          .plain-text {
            white-space: pre-wrap;
            word-wrap: break-word;
          }

          .markdown-content {
            line-height: 1.6;
          }

          .markdown-content h1, .markdown-content h2, .markdown-content h3 {
            color: #333;
            margin-top: 1.5rem;
            margin-bottom: 0.5rem;
          }

          .markdown-content code {
            background: #f8f9fa;
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            font-family: monospace;
          }

          .markdown-content pre {
            margin: 1rem 0;
          }

          .language-json { color: #d73a49; }
          .language-xml { color: #005cc5; }
          .language-javascript { color: #f1c40f; }
          .language-python { color: #3776ab; }
          .language-css { color: #1572b6; }

          .format-badge {
            background: #007bff;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 12px;
            font-size: 0.8rem;
            text-transform: uppercase;
          }

          @media (max-width: 768px) {
            .text-header {
              flex-direction: column;
              align-items: stretch;
            }

            .text-stats {
              justify-content: space-between;
            }
          }
        </style>

        <div class="text-header">
          <div class="text-title">
            📄 ${fileName}
            <span class="format-badge">${processed.format}${processed.language ? ` (${processed.language})` : ''}</span>
          </div>
          <div class="text-stats">
            <span>📊 ${processed.lineCount.toLocaleString()} lines</span>
            <span>🔤 ${processed.characterCount.toLocaleString()} chars</span>
            <span>💾 ${this.formatFileSize(fileSize)}</span>
          </div>
        </div>

        <div class="text-content">
          ${processed.processedHtml}
        </div>

        <script>
          function showHTMLTab(tabName, buttonElement) {
            // Hide all content tabs
            const allTabs = document.querySelectorAll('.tab-content');
            allTabs.forEach(tab => tab.classList.remove('active'));

            // Remove active class from all tab buttons
            const allButtons = document.querySelectorAll('.tab-btn');
            allButtons.forEach(btn => btn.classList.remove('active'));

            // Show selected tab and activate button
            const selectedTab = document.getElementById('html-' + tabName);
            if (selectedTab) {
              selectedTab.classList.add('active');
            }
            if (buttonElement) {
              buttonElement.classList.add('active');
            }
          }
        </script>
      </div>
    `;
  }

  private generateErrorHTML(fileName: string, error: Error): string {
    return `
      <div class="text-error-container">
        <style>
          .text-error-container {
            padding: 2rem;
            text-align: center;
            background: #f8f9fa;
            border-radius: 8px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }

          .error-icon {
            font-size: 3rem;
            color: #dc3545;
            margin-bottom: 1rem;
          }

          .error-title {
            color: #495057;
            font-size: 1.5rem;
            margin-bottom: 1rem;
          }

          .error-message {
            color: #6c757d;
            margin-bottom: 1.5rem;
            line-height: 1.6;
          }
        </style>

        <div class="error-icon">⚠️</div>
        <h2 class="error-title">Text Preview Failed</h2>
        <p class="error-message">
          We encountered an error while trying to preview the text file "${fileName}".
        </p>
        <p class="error-message">
          Error: ${error.message}
        </p>
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