/**
 * Universal Formatted Document Preview Plugin
 * Handles DOCX, Excel, TXT, Images, and other file types with proper formatting
 * Features: Professional formatting, smooth scrolling, cross-file compatibility, error handling
 */

import { PreviewPlugin, PreviewResult, PreviewOptions } from '../pluginSystem';

interface ProcessedContent {
  html: string;
  plainText: string;
  contentType: 'document' | 'spreadsheet' | 'text' | 'image' | 'unsupported';
  metadata: {
    wordCount?: number;
    pageCount?: number;
    sheetCount?: number;
    imageInfo?: { width: number; height: number; };
  };
}

export class UniversalFormattedPreviewPlugin implements PreviewPlugin {
  name = 'UniversalFormattedPreviewPlugin';
  priority = 600; // Highest priority to handle all documents
  description = 'Universal document preview with proper formatting, scrolling, and cross-file compatibility';
  version = '2.0.0';

  supportedMimeTypes = [
    // Word documents
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    // Excel documents
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    // Text files
    'text/plain',
    'text/csv',
    'application/json',
    'text/markdown',
    'text/html',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/webp',
    'image/svg+xml'
  ];

  supportedExtensions = [
    '.docx', '.doc', '.xlsx', '.xls', '.txt', '.csv', '.json', '.md', '.html',
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'
  ];

  canPreview(mimeType: string, fileName: string): boolean {
    const extension = fileName.toLowerCase().split('.').pop();
    return this.supportedMimeTypes.includes(mimeType) ||
           (extension && this.supportedExtensions.includes(`.${extension}`));
  }

  async preview(
    blob: Blob,
    fileName: string,
    mimeType: string,
    options?: PreviewOptions
  ): Promise<PreviewResult> {
    console.log(`🚀 Universal Preview: Processing ${fileName} (${mimeType})`);

    try {
      // Determine content type
      const contentType = this.determineContentType(mimeType, fileName);

      // Process content based on type
      const processedContent = await this.processContent(blob, fileName, mimeType, contentType);

      // Get modified date from options if available
      const modifiedDate = options?.metadata?.modifiedDate || new Date().toLocaleDateString();

      // Generate formatted HTML
      const formattedHtml = this.generateFormattedPreview(fileName, mimeType, processedContent, blob.size, modifiedDate);

      console.log(`✅ Universal Preview: Successfully processed ${fileName}`);

      return {
        type: 'success',
        format: 'html',
        content: formattedHtml,
        metadata: {
          title: fileName,
          fileSize: blob.size,
          mimeType: mimeType,
          modifiedDate: modifiedDate,
          contentType: processedContent.contentType,
          extractionMethod: 'universal_formatted',
          ...processedContent.metadata
        }
      };

    } catch (error) {
      console.error(`❌ Universal Preview failed for ${fileName}:`, error);
      const modifiedDate = options?.metadata?.modifiedDate || new Date().toLocaleDateString();
      return this.createErrorFallback(fileName, mimeType, blob.size, modifiedDate, error as Error);
    }
  }

  private determineContentType(mimeType: string, fileName: string): 'document' | 'spreadsheet' | 'text' | 'image' | 'unsupported' {
    if (mimeType.includes('wordprocessingml') || mimeType.includes('msword') || fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      return 'document';
    }
    if (mimeType.includes('spreadsheetml') || mimeType.includes('ms-excel') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      return 'spreadsheet';
    }
    if (mimeType.startsWith('text/') || fileName.match(/\.(txt|csv|json|md|html)$/i)) {
      return 'text';
    }
    if (mimeType.startsWith('image/')) {
      return 'image';
    }
    return 'unsupported';
  }

  private async processContent(blob: Blob, fileName: string, mimeType: string, contentType: string): Promise<ProcessedContent> {
    switch (contentType) {
      case 'document':
        return await this.processWordDocument(blob);
      case 'spreadsheet':
        return await this.processSpreadsheet(blob);
      case 'text':
        return await this.processTextFile(blob, mimeType);
      case 'image':
        return await this.processImage(blob, fileName);
      default:
        throw new Error(`Unsupported content type: ${contentType}`);
    }
  }

  // DOCX/DOC Processing with Mammoth.js
  private async processWordDocument(blob: Blob): Promise<ProcessedContent> {
    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await blob.arrayBuffer();

      const options = {
        arrayBuffer,
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh",
          "p[style-name='Title'] => h1.title:fresh",
          "p[style-name='Subtitle'] => h2.subtitle:fresh"
        ],
        includeDefaultStyleMap: true,
        includeEmbeddedStyleMap: true
      };

      const result = await mammoth.convertToHtml(options);

      // Enhance HTML structure
      const enhancedHtml = this.enhanceDocumentHTML(result.value);

      // Extract plain text for metadata
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = enhancedHtml;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';

      const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;
      const pageCount = Math.max(1, Math.ceil(wordCount / 500)); // Realistic page estimation

      return {
        html: enhancedHtml,
        plainText: plainText,
        contentType: 'document',
        metadata: { wordCount, pageCount }
      };

    } catch (error) {
      // Fallback to basic text extraction
      const text = await this.extractBasicText(blob);
      return {
        html: `<div class="fallback-content"><pre>${this.escapeHtml(text)}</pre></div>`,
        plainText: text,
        contentType: 'document',
        metadata: { wordCount: text.split(/\s+/).length, pageCount: 1 }
      };
    }
  }

  // Excel/Spreadsheet Processing
  private async processSpreadsheet(blob: Blob): Promise<ProcessedContent> {
    try {
      // Try to parse as CSV first (simpler)
      const text = await blob.text();
      const lines = text.split('\n').slice(0, 100); // Limit to first 100 rows for preview

      if (lines.length > 1 && lines[0].includes(',')) {
        // Looks like CSV, create table
        const tableHtml = this.createTableFromCSV(lines);
        return {
          html: tableHtml,
          plainText: text,
          contentType: 'spreadsheet',
          metadata: { sheetCount: 1 }
        };
      }

      // Fallback for Excel files
      return {
        html: `<div class="spreadsheet-preview">
          <div class="file-info">
            <h3>📊 Excel Spreadsheet</h3>
            <p>This Excel file contains structured data that can be downloaded for viewing in Excel or compatible applications.</p>
            <div class="download-hint">
              <strong>To view:</strong> Download the file and open with Microsoft Excel, LibreOffice Calc, or Google Sheets.
            </div>
          </div>
        </div>`,
        plainText: 'Excel spreadsheet preview not available',
        contentType: 'spreadsheet',
        metadata: { sheetCount: 1 }
      };

    } catch (error) {
      throw new Error(`Failed to process spreadsheet: ${error.message}`);
    }
  }

  // Text File Processing
  private async processTextFile(blob: Blob, mimeType: string): Promise<ProcessedContent> {
    try {
      const text = await blob.text();
      let html = '';

      if (mimeType === 'text/csv') {
        // CSV - create table
        const lines = text.split('\n').slice(0, 50); // Limit rows for preview
        html = this.createTableFromCSV(lines);
      } else if (mimeType === 'application/json') {
        // JSON - formatted code block
        try {
          const parsed = JSON.parse(text);
          const formatted = JSON.stringify(parsed, null, 2);
          html = `<div class="json-preview"><pre class="code-block">${this.escapeHtml(formatted)}</pre></div>`;
        } catch {
          html = `<div class="text-preview"><pre class="code-block">${this.escapeHtml(text)}</pre></div>`;
        }
      } else if (mimeType === 'text/markdown') {
        // Markdown - basic conversion
        html = this.convertMarkdownToHTML(text);
      } else if (mimeType === 'text/html') {
        // HTML - sanitized display
        html = `<div class="html-preview">${text}</div>`; // Note: In production, sanitize this
      } else {
        // Plain text - preserve formatting
        html = `<div class="text-preview"><pre class="text-content">${this.escapeHtml(text)}</pre></div>`;
      }

      return {
        html: html,
        plainText: text,
        contentType: 'text',
        metadata: { wordCount: text.split(/\s+/).length }
      };

    } catch (error) {
      throw new Error(`Failed to process text file: ${error.message}`);
    }
  }

  // Image Processing
  private async processImage(blob: Blob, fileName: string): Promise<ProcessedContent> {
    try {
      const imageUrl = URL.createObjectURL(blob);

      // Create image element to get dimensions
      const img = new Image();
      const imageInfo = await new Promise<{width: number, height: number}>((resolve, reject) => {
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageUrl;
      });

      const html = `
        <div class="image-preview-container">
          <div class="image-content">
            <img src="${imageUrl}" alt="${fileName}" class="preview-image" />
          </div>
        </div>
      `;

      return {
        html: html,
        plainText: `Image: ${fileName} (${imageInfo.width}×${imageInfo.height})`,
        contentType: 'image',
        metadata: { imageInfo }
      };

    } catch (error) {
      throw new Error(`Failed to process image: ${error.message}`);
    }
  }

  // Helper method to enhance document HTML
  private enhanceDocumentHTML(html: string): string {
    let enhanced = html;

    // Convert bold paragraphs to headings
    enhanced = enhanced.replace(/<p><strong>([^<]+)<\/strong><\/p>/g, '<h3 class="auto-heading">$1</h3>');
    enhanced = enhanced.replace(/<p><b>([^<]+)<\/b><\/p>/g, '<h3 class="auto-heading">$1</h3>');

    // Convert ALL CAPS paragraphs to headings
    enhanced = enhanced.replace(/<p>([A-Z\s]{5,})<\/p>/g, '<h2 class="caps-heading">$1</h2>');

    // Add classes to elements for styling
    enhanced = enhanced.replace(/<p>/g, '<p class="doc-paragraph">');
    enhanced = enhanced.replace(/<h1>/g, '<h1 class="doc-heading-1">');
    enhanced = enhanced.replace(/<h2>/g, '<h2 class="doc-heading-2">');
    enhanced = enhanced.replace(/<h3>/g, '<h3 class="doc-heading-3">');
    enhanced = enhanced.replace(/<li>/g, '<li class="doc-list-item">');
    enhanced = enhanced.replace(/<table>/g, '<table class="doc-table">');

    return `<div class="document-body">${enhanced}</div>`;
  }

  // Helper method to create table from CSV
  private createTableFromCSV(lines: string[]): string {
    if (lines.length === 0) return '<p>Empty CSV file</p>';

    const rows = lines.map(line => line.split(',').map(cell => cell.trim()));
    const headers = rows[0];
    const dataRows = rows.slice(1).filter(row => row.some(cell => cell.length > 0));

    let html = '<div class="csv-table-container"><table class="csv-table">';

    // Headers
    html += '<thead><tr>';
    headers.forEach(header => {
      html += `<th>${this.escapeHtml(header)}</th>`;
    });
    html += '</tr></thead>';

    // Data rows
    html += '<tbody>';
    dataRows.forEach(row => {
      html += '<tr>';
      row.forEach((cell, index) => {
        html += `<td>${this.escapeHtml(cell || '')}</td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';

    return html;
  }

  // Basic markdown conversion
  private convertMarkdownToHTML(text: string): string {
    let html = text
      .replace(/^# (.*$)/gm, '<h1 class="md-heading-1">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="md-heading-2">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="md-heading-3">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p class="md-paragraph">')
      .replace(/\n/g, '<br>');

    return `<div class="markdown-preview"><p class="md-paragraph">${html}</p></div>`;
  }

  // Extract basic text from binary files
  private async extractBasicText(blob: Blob): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let text = '';

    // Extract printable characters
    for (let i = 0; i < Math.min(uint8Array.length, 10000); i++) {
      const char = uint8Array[i];
      if ((char >= 32 && char <= 126) || char === 10 || char === 13) {
        text += String.fromCharCode(char);
      }
    }

    return text.replace(/\s{3,}/g, '  ').trim();
  }

  // Generate formatted preview HTML with clean, professional 4-line header
  private generateFormattedPreview(fileName: string, mimeType: string, content: ProcessedContent, fileSize: number, modifiedDate: string): string {
    // Build metadata string with dot separators for line 3
    const metadataParts = [];
    metadataParts.push(this.formatFileSize(fileSize));

    if (content.metadata.wordCount && content.metadata.wordCount > 0) {
      metadataParts.push(`${content.metadata.wordCount} words`);
    }

    if (content.metadata.pageCount && content.metadata.pageCount > 0) {
      metadataParts.push(`${content.metadata.pageCount} pages`);
    }

    if (content.metadata.sheetCount && content.metadata.sheetCount > 0) {
      metadataParts.push(`${content.metadata.sheetCount} sheets`);
    }

    if (content.metadata.imageInfo) {
      const { width, height } = content.metadata.imageInfo;
      metadataParts.push(`${width} × ${height} pixels`);
      // For images, remove word count as it's not relevant
      if (content.contentType === 'image') {
        const wordIndex = metadataParts.findIndex(part => part.includes('words'));
        if (wordIndex > -1) {
          metadataParts.splice(wordIndex, 1);
        }
      }
    }

    const metadataString = metadataParts.join(' · ');

    return `
      <div class="universal-preview-container">
        ${this.getUniversalStyles()}

        <div class="document-wrapper">
          <div class="document-content-area">
            ${content.html}
          </div>
        </div>
      </div>
    `;
  }

  // Error fallback
  private createErrorFallback(fileName: string, mimeType: string, fileSize: number, modifiedDate: string, error: Error): PreviewResult {
    const html = `
      <div class="universal-preview-container">
        ${this.getUniversalStyles()}

        <div class="document-wrapper">
          <div class="error-container">
            <div class="error-icon">⚠️</div>
            <h2 class="error-title">Preview Not Available</h2>
            <p class="error-message">
              Unable to generate preview for this file type.
            </p>
            <div class="error-details">
              <p><strong>Reason:</strong> ${error.message}</p>
            </div>
            <div class="error-actions">
              <p>You can still download this file to view it in the appropriate application.</p>
            </div>
          </div>
        </div>
      </div>
    `;

    return {
      type: 'success',
      format: 'html',
      content: html,
      metadata: {
        title: fileName,
        fileSize: fileSize,
        mimeType: mimeType,
        modifiedDate: modifiedDate,
        error: error.message,
        extractionMethod: 'error_fallback'
      }
    };
  }

  // Comprehensive CSS styles
  private getUniversalStyles(): string {
    return `
      <style>
        /* Universal Preview Container */
        .universal-preview-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: #ffffff;
          color: #333333;
          line-height: 1.6;
          max-height: 85vh;
          overflow-y: auto;
          overflow-x: auto;
          scroll-behavior: smooth;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
        }

        /* Document Wrapper */
        .document-wrapper {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          min-height: 100%;
        }

        /* Professional 4-Line Header */
        .professional-header {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-bottom: 1px solid #e2e8f0;
          padding: 1rem 2rem;
        }

        .header-four-line {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .header-line {
          line-height: 1.4;
          word-break: break-word;
        }

        .filename-line {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1e293b;
        }

        .mimetype-line {
          font-size: 0.875rem;
          color: #4a5568;
          font-weight: 500;
        }

        .metadata-line {
          font-size: 0.875rem;
          color: #64748b;
          font-weight: 500;
        }

        .modified-line {
          font-size: 0.875rem;
          color: #64748b;
          font-style: italic;
        }

        /* Document Content Area */
        .document-content-area {
          padding: 1.5rem 2rem 2rem 2rem;
          min-height: 400px;
        }

        /* Document Body Styles */
        .document-body {
          font-family: 'Times New Roman', serif;
          font-size: 16px;
          line-height: 1.8;
          color: #2d3748;
          text-align: justify;
        }

        .doc-paragraph {
          margin: 1rem 0;
          text-indent: 0;
          line-height: 1.8;
        }

        .doc-heading-1 {
          font-size: 2.5rem;
          font-weight: bold;
          margin: 2rem 0 1rem 0;
          text-align: center;
          color: #2d3748;
          border-bottom: 3px solid #667eea;
          padding-bottom: 0.5rem;
        }

        .doc-heading-2 {
          font-size: 2rem;
          font-weight: bold;
          margin: 1.75rem 0 0.875rem 0;
          color: #2d3748;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 0.25rem;
        }

        .doc-heading-3 {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 1.5rem 0 0.75rem 0;
          color: #2d3748;
        }

        .auto-heading, .caps-heading {
          color: #4a5568;
          font-weight: 600;
        }

        .doc-list-item {
          margin: 0.5rem 0;
          line-height: 1.8;
        }

        .doc-table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5rem 0;
          font-size: 0.95rem;
        }

        .doc-table th,
        .doc-table td {
          border: 1px solid #e2e8f0;
          padding: 0.75rem;
          text-align: left;
          vertical-align: top;
        }

        .doc-table th {
          background: #f7fafc;
          font-weight: 600;
          color: #4a5568;
        }

        .doc-table tr:nth-child(even) {
          background: #f9fafb;
        }

        /* Text Content Styles */
        .text-preview {
          background: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 6px;
          overflow: auto;
        }

        .text-content {
          padding: 1.5rem;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 14px;
          line-height: 1.6;
          color: #2d3748;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .code-block {
          background: #1a202c;
          color: #e2e8f0;
          padding: 1.5rem;
          border-radius: 6px;
          overflow-x: auto;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 14px;
          line-height: 1.5;
        }

        /* CSV Table Styles */
        .csv-table-container {
          overflow: auto;
          max-height: 70vh;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
        }

        .csv-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .csv-table th,
        .csv-table td {
          border: 1px solid #e2e8f0;
          padding: 0.5rem 0.75rem;
          text-align: left;
          white-space: nowrap;
        }

        .csv-table th {
          background: #667eea;
          color: white;
          font-weight: 600;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .csv-table tr:nth-child(even) {
          background: #f8f9fa;
        }

        /* Image Preview Styles */
        .image-preview-container {
          text-align: center;
        }

        .image-info {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
        }

        .image-info h3 {
          margin: 0 0 0.5rem 0;
          color: #4a5568;
        }

        .image-info p {
          margin: 0.25rem 0;
          color: #718096;
        }

        .image-content {
          background: #f8f9fa;
          padding: 2rem;
          border-radius: 6px;
        }

        .preview-image {
          max-width: 100%;
          max-height: 70vh;
          height: auto;
          border-radius: 6px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease;
        }

        .preview-image:hover {
          transform: scale(1.02);
        }

        /* Spreadsheet Preview */
        .spreadsheet-preview {
          text-align: center;
          padding: 3rem;
        }

        .file-info h3 {
          color: #4a5568;
          margin-bottom: 1rem;
          font-size: 1.5rem;
        }

        .file-info p {
          color: #718096;
          margin-bottom: 1rem;
        }

        .download-hint {
          background: #e6fffa;
          border: 1px solid #81e6d9;
          border-radius: 6px;
          padding: 1rem;
          color: #2d3748;
          font-size: 0.9rem;
        }

        /* Markdown Styles */
        .markdown-preview {
          color: #2d3748;
        }

        .md-heading-1,
        .md-heading-2,
        .md-heading-3 {
          color: #2d3748;
          font-weight: 600;
          margin: 1.5rem 0 0.75rem 0;
        }

        .md-paragraph {
          margin: 1rem 0;
          line-height: 1.8;
        }

        /* Error Styles */
        .error-container {
          text-align: center;
          padding: 4rem 2rem;
          max-width: 600px;
          margin: 0 auto;
        }

        .error-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .error-title {
          color: #e53e3e;
          margin: 0 0 1rem 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .error-message {
          color: #4a5568;
          margin-bottom: 2rem;
          font-size: 1.1rem;
        }

        .error-details {
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          text-align: left;
        }

        .error-details p {
          margin: 0.5rem 0;
          color: #4a5568;
        }

        .error-actions {
          color: #718096;
          font-style: italic;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .universal-preview-container {
            max-height: 90vh;
          }

          .professional-header {
            padding: 1rem 1.5rem;
          }

          .filename-line {
            font-size: 1rem;
          }

          .mimetype-line,
          .metadata-line,
          .modified-line {
            font-size: 0.8rem;
          }

          .header-four-line {
            gap: 0.2rem;
          }

          .document-content-area {
            padding: 1rem 1.5rem;
          }

          .doc-heading-1 {
            font-size: 2rem;
          }

          .doc-heading-2 {
            font-size: 1.5rem;
          }
        }

        /* Smooth Scrolling */
        .universal-preview-container {
          scroll-behavior: smooth;
        }

        .universal-preview-container::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .universal-preview-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }

        .universal-preview-container::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }

        .universal-preview-container::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }

        /* Print Styles */
        @media print {
          .universal-preview-container {
            max-height: none;
            overflow: visible;
            box-shadow: none;
          }

          .professional-header {
            background: none !important;
            border-bottom: 1px solid #000 !important;
          }

          .filename-line,
          .mimetype-line,
          .metadata-line,
          .modified-line {
            color: black !important;
          }
        }
      </style>
    `;
  }

  // Utility methods
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }


  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}