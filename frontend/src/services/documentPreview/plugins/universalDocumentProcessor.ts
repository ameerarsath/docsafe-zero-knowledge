/**
 * Universal Document Processor Plugin
 * A comprehensive solution for all document types with robust text extraction and fallbacks
 * Shows actual document content instead of error messages
 */

import { PreviewPlugin, PreviewResult, PreviewOptions } from '../pluginSystem';

interface DocumentMetadata {
  wordCount: number;
  pageCount: number;
  sectionCount: number;
  tableCount: number;
  imageCount: number;
  extractionMethod: string;
}

export class UniversalDocumentProcessor implements PreviewPlugin {
  name = 'UniversalDocumentProcessor';
  priority = 300; // Highest priority to handle all document types
  description = 'Universal document processor with robust text extraction for all file types';
  version = '1.0.0';

  supportedMimeTypes = [
    // Microsoft Office
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    // Text files
    'text/plain',
    'text/csv',
    'text/markdown',
    'text/html',
    'application/json',
    'application/xml',
    'text/xml',
    // Other formats
    'application/rtf',
    'text/rtf'
  ];

  supportedExtensions = [
    '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt',
    '.txt', '.csv', '.md', '.html', '.json', '.xml', '.rtf'
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
    const startTime = performance.now();

    try {
      console.log(`🌟 Universal Processor: Processing ${fileName} (${mimeType})`);

      const extension = fileName.toLowerCase().split('.').pop() || '';
      let result: PreviewResult;

      // Route to appropriate processor based on file type
      if (this.isWordDocument(extension, mimeType)) {
        result = await this.processWordDocument(blob, fileName, mimeType);
      } else if (this.isExcelDocument(extension, mimeType)) {
        result = await this.processExcelDocument(blob, fileName, mimeType);
      } else if (this.isPowerPointDocument(extension, mimeType)) {
        result = await this.processPowerPointDocument(blob, fileName, mimeType);
      } else if (this.isTextDocument(extension, mimeType)) {
        result = await this.processTextDocument(blob, fileName, mimeType);
      } else {
        result = await this.processGenericDocument(blob, fileName, mimeType);
      }

      const processingTime = performance.now() - startTime;
      console.log(`✅ Universal Processor: Completed ${fileName} in ${processingTime.toFixed(1)}ms`);

      // Add processing metadata
      if (result.metadata) {
        result.metadata.processingTime = `${processingTime.toFixed(1)}ms`;
        result.metadata.pluginName = this.name;
      }

      return result;

    } catch (error) {
      console.error(`❌ Universal Processor failed for ${fileName}:`, error);

      // Even if processing fails, return useful content
      return this.createFallbackPreview(blob, fileName, mimeType, error as Error);
    }
  }

  private isWordDocument(extension: string, mimeType: string): boolean {
    return ['docx', 'doc', 'rtf'].includes(extension) ||
           mimeType.includes('wordprocessingml') ||
           mimeType.includes('msword') ||
           mimeType.includes('rtf');
  }

  private isExcelDocument(extension: string, mimeType: string): boolean {
    return ['xlsx', 'xls', 'csv'].includes(extension) ||
           mimeType.includes('spreadsheetml') ||
           mimeType.includes('ms-excel') ||
           mimeType.includes('csv');
  }

  private isPowerPointDocument(extension: string, mimeType: string): boolean {
    return ['pptx', 'ppt'].includes(extension) ||
           mimeType.includes('presentationml') ||
           mimeType.includes('ms-powerpoint');
  }

  private isTextDocument(extension: string, mimeType: string): boolean {
    return ['txt', 'md', 'html', 'json', 'xml'].includes(extension) ||
           mimeType.startsWith('text/') ||
           mimeType.includes('json') ||
           mimeType.includes('xml');
  }

  private async processWordDocument(blob: Blob, fileName: string, mimeType: string): Promise<PreviewResult> {
    console.log('📝 Processing Word document...');

    // Try multiple extraction methods in order of preference
    const extractors = [
      () => this.extractWithMammoth(blob),
      () => this.extractWordWithJSZip(blob),
      () => this.extractBasicText(blob)
    ];

    let extractedContent = '';
    let extractionMethod = 'fallback';
    let metadata: any = {};
    let isHtmlContent = false;
    let plainTextForStats = '';

    for (const extractor of extractors) {
      try {
        const result = await extractor();
        if (result.content && result.content.trim().length > 10) {
          extractedContent = result.content;
          extractionMethod = result.method;
          metadata = (result as any).metadata || {};
          isHtmlContent = metadata.isHtml || false;
          plainTextForStats = metadata.plainText || extractedContent;
          break;
        }
      } catch (error) {
        console.warn('Word extraction method failed:', error);
      }
    }

    // If no content extracted, provide helpful information
    if (!extractedContent || extractedContent.trim().length < 10) {
      extractedContent = this.generateWordFallbackContent(fileName, blob.size);
      extractionMethod = 'info_display';
      plainTextForStats = extractedContent;
    }

    // Calculate metadata using plain text for accurate statistics
    // For HTML content, use the plain text version for more accurate word/page counts
    const statsContent = isHtmlContent && plainTextForStats ? plainTextForStats : extractedContent;
    const docMetadata = this.calculateDocumentMetadata(statsContent, extractionMethod);

    return {
      type: 'success',
      format: 'html',
      content: this.generateWordPreviewHTML(fileName, extractedContent, docMetadata, blob.size, extractionMethod, isHtmlContent),
      metadata: {
        title: fileName,
        extractionMethod,
        fileSize: blob.size,
        isHtmlContent,
        ...docMetadata,
        ...metadata
      }
    };
  }

  private async processExcelDocument(blob: Blob, fileName: string, mimeType: string): Promise<PreviewResult> {
    console.log('📊 Processing Excel document...');

    const extension = fileName.toLowerCase().split('.').pop();
    let extractedData: any = null;
    let extractionMethod = 'fallback';

    try {
      if (extension === 'csv' || mimeType.includes('csv')) {
        // CSV processing
        const text = await blob.text();
        const lines = text.split('\n').filter(line => line.trim());
        const rows = lines.map(line =>
          line.split(',').map(cell => cell.trim().replace(/^["']|["']$/g, ''))
        );

        extractedData = {
          sheets: [{ name: 'CSV Data', data: rows.slice(0, 100) }], // Limit rows
          totalRows: lines.length,
          totalSheets: 1
        };
        extractionMethod = 'csv_parsing';

      } else {
        // Excel processing with XLSX library
        try {
          const XLSX = await import('xlsx');
          const arrayBuffer = await blob.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });

          const sheets = workbook.SheetNames.map(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            return {
              name: sheetName,
              data: jsonData.slice(0, 50) // Limit to 50 rows for preview
            };
          });

          extractedData = {
            sheets: sheets,
            totalSheets: sheets.length,
            totalRows: sheets.reduce((sum, sheet) => sum + sheet.data.length, 0)
          };
          extractionMethod = 'xlsx_library';

        } catch (xlsxError) {
          console.warn('XLSX processing failed:', xlsxError);
          throw xlsxError;
        }
      }
    } catch (error) {
      console.warn('Excel processing failed, using fallback:', error);
      extractedData = {
        sheets: [],
        error: true,
        message: 'Content extraction not available for this Excel file format'
      };
      extractionMethod = 'info_display';
    }

    return {
      type: 'success',
      format: 'html',
      content: this.generateExcelPreviewHTML(fileName, extractedData, blob.size, extractionMethod),
      metadata: {
        title: fileName,
        extractionMethod,
        fileSize: blob.size,
        sheetCount: extractedData.totalSheets || 0,
        rowCount: extractedData.totalRows || 0
      }
    };
  }

  private async processPowerPointDocument(blob: Blob, fileName: string, mimeType: string): Promise<PreviewResult> {
    console.log('📋 Processing PowerPoint document...');

    // PowerPoint extraction is complex, so we'll provide a helpful info display
    // with basic metadata if possible
    let extractedContent = '';
    let extractionMethod = 'info_display';
    let metadata: any = {};

    try {
      // Try to extract basic text from PPTX if possible
      if (fileName.toLowerCase().endsWith('.pptx')) {
        const textResult = await this.extractPowerPointText(blob);
        if (textResult.content && textResult.content.trim().length > 10) {
          extractedContent = textResult.content;
          extractionMethod = 'basic_text_extraction';
          metadata = textResult.metadata || {};
        }
      }
    } catch (error) {
      console.warn('PowerPoint text extraction failed:', error);
    }

    // If no content extracted, provide helpful information
    if (!extractedContent || extractedContent.trim().length < 10) {
      extractedContent = this.generatePowerPointFallbackContent(fileName, blob.size);
      extractionMethod = 'info_display';
    }

    const docMetadata = this.calculateDocumentMetadata(extractedContent, extractionMethod);

    return {
      type: 'success',
      format: 'html',
      content: this.generatePowerPointPreviewHTML(fileName, extractedContent, docMetadata, blob.size, extractionMethod),
      metadata: {
        title: fileName,
        extractionMethod,
        fileSize: blob.size,
        ...docMetadata,
        ...metadata
      }
    };
  }

  private async processTextDocument(blob: Blob, fileName: string, mimeType: string): Promise<PreviewResult> {
    console.log('📄 Processing text document...');

    const extension = fileName.toLowerCase().split('.').pop();
    let content = '';
    let extractionMethod = 'text_reading';

    try {
      content = await blob.text();

      // Handle different text formats
      if (extension === 'json') {
        try {
          const parsed = JSON.parse(content);
          content = JSON.stringify(parsed, null, 2);
          extractionMethod = 'json_formatting';
        } catch {
          extractionMethod = 'text_reading';
        }
      } else if (extension === 'xml') {
        extractionMethod = 'xml_reading';
      } else if (extension === 'md') {
        extractionMethod = 'markdown_reading';
      } else if (extension === 'html') {
        extractionMethod = 'html_reading';
      }

    } catch (error) {
      console.warn('Text reading failed:', error);
      content = 'Unable to read text content from this file.';
      extractionMethod = 'error_fallback';
    }

    const docMetadata = this.calculateDocumentMetadata(content, extractionMethod);

    return {
      type: 'success',
      format: 'html',
      content: this.generateTextPreviewHTML(fileName, content, docMetadata, blob.size, extractionMethod, extension || 'txt'),
      metadata: {
        title: fileName,
        extractionMethod,
        fileSize: blob.size,
        ...docMetadata
      }
    };
  }

  private async processGenericDocument(blob: Blob, fileName: string, mimeType: string): Promise<PreviewResult> {
    console.log('📄 Processing generic document...');

    // Try to extract any readable text
    let content = '';
    let extractionMethod = 'binary_text_extraction';

    try {
      // Try reading as text first
      content = await blob.text();

      // If it's mostly binary, extract readable parts
      if (this.isMostlyBinary(content)) {
        content = this.extractReadableText(content);
        extractionMethod = 'binary_filtering';
      }

      if (!content || content.trim().length < 10) {
        content = this.generateGenericFallbackContent(fileName, blob.size, mimeType);
        extractionMethod = 'info_display';
      }

    } catch (error) {
      console.warn('Generic processing failed:', error);
      content = this.generateGenericFallbackContent(fileName, blob.size, mimeType);
      extractionMethod = 'error_fallback';
    }

    const docMetadata = this.calculateDocumentMetadata(content, extractionMethod);

    return {
      type: 'success',
      format: 'html',
      content: this.generateGenericPreviewHTML(fileName, content, docMetadata, blob.size, extractionMethod, mimeType),
      metadata: {
        title: fileName,
        extractionMethod,
        fileSize: blob.size,
        mimeType,
        ...docMetadata
      }
    };
  }

  // Extraction methods
  private async extractWithMammoth(blob: Blob): Promise<{content: string, method: string, metadata?: any}> {
    const mammoth = await import('mammoth');
    const arrayBuffer = await blob.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });

    if (!result.value || result.value.trim().length === 0) {
      throw new Error('Mammoth returned empty content');
    }

    // Keep the original HTML for formatting, but also extract plain text for stats
    const div = document.createElement('div');
    div.innerHTML = result.value;
    const textContent = div.textContent || div.innerText || '';

    // Enhance the HTML content with better structure preservation
    const enhancedHtml = this.enhanceMammothHTML(result.value);

    return {
      content: enhancedHtml, // Return enhanced HTML with better formatting
      method: 'mammoth_extraction',
      metadata: {
        warnings: result.messages?.map(m => m.message) || [],
        originalHtml: result.value,
        plainText: textContent, // Keep plain text for statistics
        isHtml: true // Flag to indicate HTML content
      }
    };
  }

  private async extractWordWithJSZip(blob: Blob): Promise<{content: string, method: string, metadata?: any}> {
    const JSZip = await import('jszip');
    const zip = new JSZip.default();
    const zipContent = await zip.loadAsync(blob);

    // Extract from document.xml
    const documentXml = zipContent.files['word/document.xml'];
    if (!documentXml) {
      throw new Error('No document.xml found');
    }

    const xmlContent = await documentXml.async('text');
    const textMatches = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
    const extractedText = textMatches
      .map(match => match.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, ''))
      .join(' ')
      .trim();

    if (!extractedText || extractedText.length === 0) {
      throw new Error('No text content found in document.xml');
    }

    return {
      content: extractedText,
      method: 'jszip_xml_extraction',
      metadata: {
        xmlLength: xmlContent.length,
        textMatches: textMatches.length
      }
    };
  }

  private async extractBasicText(blob: Blob): Promise<{content: string, method: string}> {
    // Last resort: try to extract any readable text from the binary
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    let text = '';
    for (let i = 0; i < uint8Array.length; i++) {
      const char = uint8Array[i];
      // Include printable ASCII and common Unicode characters
      if ((char >= 32 && char <= 126) || char === 10 || char === 13) {
        text += String.fromCharCode(char);
      } else if (char === 0 && text.slice(-1) !== ' ') {
        text += ' '; // Replace null bytes with spaces
      }
    }

    // Clean up the text
    text = text
      .replace(/\s+/g, ' ')
      .replace(/(.{80})/g, '$1\n') // Add line breaks
      .trim();

    if (text.length < 50) {
      throw new Error('Insufficient readable text found');
    }

    return {
      content: text,
      method: 'binary_text_extraction'
    };
  }

  private async extractPowerPointText(blob: Blob): Promise<{content: string, method: string, metadata?: any}> {
    try {
      const JSZip = await import('jszip');
      const zip = new JSZip.default();
      const zipContent = await zip.loadAsync(blob);

      let extractedText = '';
      let slideCount = 0;

      // Look for slide content
      for (const fileName of Object.keys(zipContent.files)) {
        if (fileName.startsWith('ppt/slides/slide') && fileName.endsWith('.xml')) {
          slideCount++;
          const slideXml = await zipContent.files[fileName].async('text');
          const textMatches = slideXml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
          const slideText = textMatches
            .map(match => match.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, ''))
            .join(' ')
            .trim();

          if (slideText) {
            extractedText += `\n\nSlide ${slideCount}:\n${slideText}`;
          }
        }
      }

      if (extractedText.trim().length === 0) {
        throw new Error('No text content found in slides');
      }

      return {
        content: extractedText.trim(),
        method: 'powerpoint_xml_extraction',
        metadata: {
          slideCount
        }
      };
    } catch (error) {
      throw new Error(`PowerPoint text extraction failed: ${error.message}`);
    }
  }

  private isMostlyBinary(text: string): boolean {
    let printableCount = 0;
    for (let i = 0; i < Math.min(text.length, 1000); i++) {
      const charCode = text.charCodeAt(i);
      if ((charCode >= 32 && charCode <= 126) || charCode === 9 || charCode === 10 || charCode === 13) {
        printableCount++;
      }
    }
    return printableCount / Math.min(text.length, 1000) < 0.7;
  }

  private extractReadableText(binaryText: string): string {
    return binaryText
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000); // Limit to first 5000 characters
  }

  // Fallback content generators
  private generateWordFallbackContent(fileName: string, fileSize: number): string {
    return `Document: ${fileName}

This Microsoft Word document is available for download and viewing.

File Information:
• Name: ${fileName}
• Size: ${this.formatFileSize(fileSize)}
• Type: Microsoft Word Document

The document content cannot be displayed in the browser preview due to:
• Complex formatting and layout
• Embedded images, tables, or media
• Document protection or encryption
• Compatibility limitations

To view the complete document:
• Download the file using the download button
• Open with Microsoft Word or compatible software
• Use Microsoft Word Online for browser viewing
• Convert to PDF format for basic preview`;
  }

  private generatePowerPointFallbackContent(fileName: string, fileSize: number): string {
    return `Presentation: ${fileName}

This PowerPoint presentation is available for download and viewing.

File Information:
• Name: ${fileName}
• Size: ${this.formatFileSize(fileSize)}
• Type: Microsoft PowerPoint Presentation

PowerPoint presentations contain:
• Multiple slides with complex layouts
• Images, charts, and multimedia content
• Animations and transitions
• Speaker notes and embedded objects

To view the complete presentation:
• Download the file using the download button
• Open with Microsoft PowerPoint or compatible software
• Use PowerPoint Online for browser viewing
• Export slides as images for basic preview`;
  }

  private generateGenericFallbackContent(fileName: string, fileSize: number, mimeType: string): string {
    return `Document: ${fileName}

This document is available for download.

File Information:
• Name: ${fileName}
• Size: ${this.formatFileSize(fileSize)}
• Type: ${mimeType || 'Unknown'}

This file format may contain:
• Specialized content requiring specific software
• Binary data not suitable for text preview
• Proprietary formatting and structure
• Media or embedded objects

To view this document:
• Download the file using the download button
• Open with appropriate software for this file type
• Check file extension for compatible applications
• Contact support if you need assistance`;
  }

  // HTML generators
  private generateWordPreviewHTML(fileName: string, content: string, metadata: DocumentMetadata, fileSize: number, method: string, isHtmlContent: boolean = false): string {
    const icon = '📝';
    const isContentExtracted = method !== 'info_display' && method !== 'error_fallback';

    // Determine content rendering based on type
    let contentHtml = '';
    if (isContentExtracted) {
      if (isHtmlContent) {
        // Render HTML content with enhanced formatting - preserve Mammoth.js structure
        contentHtml = `<div class="formatted-document mammoth-content">${content}</div>`;
      } else {
        // Render plain text with basic formatting
        contentHtml = `<pre class="extracted-text">${this.escapeHtml(content)}</pre>`;
      }
    } else {
      contentHtml = `<div class="info-content">${this.formatInfoContent(content)}</div>`;
    }

    return `
      <div class="universal-preview">
        ${this.getPreviewStyles()}
        ${isHtmlContent ? this.getFormattedDocumentStyles() : ''}

        <div class="document-header">
          <div class="header-content">
            <div class="file-info">
              <div class="doc-icon">${icon}</div>
              <div class="file-details">
                <h1>${this.escapeHtml(fileName)}</h1>
                <div class="file-meta">Microsoft Word Document • ${this.formatFileSize(fileSize)}</div>
              </div>
            </div>
            <div class="status-badge ${isContentExtracted ? 'success' : 'info'}">
              ${isContentExtracted ? '✅ Content Extracted' : 'ℹ️ Info Available'}
              ${isHtmlContent ? ' • Rich Formatting' : ''}
            </div>
          </div>
        </div>

        <div class="stats-bar">
          <div class="stat">
            <span class="stat-label">Words</span>
            <span class="stat-value">${metadata.wordCount.toLocaleString()}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Est. Pages</span>
            <span class="stat-value">${metadata.pageCount}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Method</span>
            <span class="stat-value">${this.getMethodDisplayName(method)}</span>
          </div>
          ${isHtmlContent ? `
          <div class="stat">
            <span class="stat-label">Format</span>
            <span class="stat-value">Rich Text</span>
          </div>` : ''}
        </div>

        <div class="document-content">
          <div class="content-preview">
            ${contentHtml}
          </div>
        </div>
      </div>
    `;
  }

  private generateExcelPreviewHTML(fileName: string, data: any, fileSize: number, method: string): string {
    const icon = '📊';
    const hasData = data.sheets && data.sheets.length > 0 && !data.error;

    let contentHtml = '';
    if (hasData) {
      const firstSheet = data.sheets[0];
      contentHtml = `
        <div class="sheet-preview">
          <h3>📊 ${firstSheet.name}</h3>
          ${this.generateTableHTML(firstSheet.data)}
          ${data.sheets.length > 1 ? `<p class="sheet-info">+ ${data.sheets.length - 1} more sheets</p>` : ''}
        </div>
      `;
    } else {
      contentHtml = `<div class="info-content">${this.formatInfoContent(data.message || 'Excel data extraction not available')}</div>`;
    }

    return `
      <div class="universal-preview">
        ${this.getPreviewStyles()}

        <div class="document-header">
          <div class="header-content">
            <div class="file-info">
              <div class="doc-icon">${icon}</div>
              <div class="file-details">
                <h1>${this.escapeHtml(fileName)}</h1>
                <div class="file-meta">Microsoft Excel Spreadsheet • ${this.formatFileSize(fileSize)}</div>
              </div>
            </div>
            <div class="status-badge ${hasData ? 'success' : 'info'}">
              ${hasData ? '✅ Data Extracted' : 'ℹ️ Info Available'}
            </div>
          </div>
        </div>

        <div class="stats-bar">
          <div class="stat">
            <span class="stat-label">Sheets</span>
            <span class="stat-value">${data.totalSheets || 0}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Rows</span>
            <span class="stat-value">${data.totalRows || 0}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Method</span>
            <span class="stat-value">${this.getMethodDisplayName(method)}</span>
          </div>
        </div>

        <div class="document-content">
          <div class="content-preview">
            ${contentHtml}
          </div>
        </div>
      </div>
    `;
  }

  private generatePowerPointPreviewHTML(fileName: string, content: string, metadata: DocumentMetadata, fileSize: number, method: string): string {
    const icon = '📋';
    const isContentExtracted = method !== 'info_display' && method !== 'error_fallback';

    return `
      <div class="universal-preview">
        ${this.getPreviewStyles()}

        <div class="document-header">
          <div class="header-content">
            <div class="file-info">
              <div class="doc-icon">${icon}</div>
              <div class="file-details">
                <h1>${this.escapeHtml(fileName)}</h1>
                <div class="file-meta">Microsoft PowerPoint Presentation • ${this.formatFileSize(fileSize)}</div>
              </div>
            </div>
            <div class="status-badge ${isContentExtracted ? 'success' : 'info'}">
              ${isContentExtracted ? '✅ Text Extracted' : 'ℹ️ Info Available'}
            </div>
          </div>
        </div>

        <div class="stats-bar">
          <div class="stat">
            <span class="stat-label">Words</span>
            <span class="stat-value">${metadata.wordCount.toLocaleString()}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Est. Slides</span>
            <span class="stat-value">${metadata.sectionCount || 'Unknown'}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Method</span>
            <span class="stat-value">${this.getMethodDisplayName(method)}</span>
          </div>
        </div>

        <div class="document-content">
          <div class="content-preview">
            ${isContentExtracted ?
              `<pre class="extracted-text">${this.escapeHtml(content)}</pre>` :
              `<div class="info-content">${this.formatInfoContent(content)}</div>`
            }
          </div>
        </div>
      </div>
    `;
  }

  private generateTextPreviewHTML(fileName: string, content: string, metadata: DocumentMetadata, fileSize: number, method: string, extension: string): string {
    const icons = { txt: '📄', json: '📋', xml: '📄', md: '📝', html: '🌐' };
    const icon = icons[extension as keyof typeof icons] || '📄';

    return `
      <div class="universal-preview">
        ${this.getPreviewStyles()}

        <div class="document-header">
          <div class="header-content">
            <div class="file-info">
              <div class="doc-icon">${icon}</div>
              <div class="file-details">
                <h1>${this.escapeHtml(fileName)}</h1>
                <div class="file-meta">${extension.toUpperCase()} File • ${this.formatFileSize(fileSize)}</div>
              </div>
            </div>
            <div class="status-badge success">✅ Text Loaded</div>
          </div>
        </div>

        <div class="stats-bar">
          <div class="stat">
            <span class="stat-label">Words</span>
            <span class="stat-value">${metadata.wordCount.toLocaleString()}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Lines</span>
            <span class="stat-value">${content.split('\n').length}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Type</span>
            <span class="stat-value">${extension.toUpperCase()}</span>
          </div>
        </div>

        <div class="document-content">
          <div class="content-preview">
            <pre class="text-content ${extension}">${this.escapeHtml(content)}</pre>
          </div>
        </div>
      </div>
    `;
  }

  private generateGenericPreviewHTML(fileName: string, content: string, metadata: DocumentMetadata, fileSize: number, method: string, mimeType: string): string {
    const icon = '📄';
    const isContentExtracted = method !== 'info_display' && method !== 'error_fallback';

    return `
      <div class="universal-preview">
        ${this.getPreviewStyles()}

        <div class="document-header">
          <div class="header-content">
            <div class="file-info">
              <div class="doc-icon">${icon}</div>
              <div class="file-details">
                <h1>${this.escapeHtml(fileName)}</h1>
                <div class="file-meta">${mimeType || 'Unknown type'} • ${this.formatFileSize(fileSize)}</div>
              </div>
            </div>
            <div class="status-badge ${isContentExtracted ? 'success' : 'info'}">
              ${isContentExtracted ? '✅ Content Available' : 'ℹ️ Info Available'}
            </div>
          </div>
        </div>

        <div class="stats-bar">
          <div class="stat">
            <span class="stat-label">Size</span>
            <span class="stat-value">${this.formatFileSize(fileSize)}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Type</span>
            <span class="stat-value">${mimeType?.split('/')[1] || 'Unknown'}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Method</span>
            <span class="stat-value">${this.getMethodDisplayName(method)}</span>
          </div>
        </div>

        <div class="document-content">
          <div class="content-preview">
            ${isContentExtracted ?
              `<pre class="extracted-text">${this.escapeHtml(content)}</pre>` :
              `<div class="info-content">${this.formatInfoContent(content)}</div>`
            }
          </div>
        </div>
      </div>
    `;
  }

  // Utility methods
  private calculateDocumentMetadata(content: string, method: string): DocumentMetadata {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    const lines = content.split('\n');

    // Fix page count calculation for DOCX - use more realistic estimate
    let pageCount = 1;
    if (words.length > 0) {
      // For typical documents: ~500 words per page (more realistic than 250)
      // For short documents (< 100 words): always 1 page
      // For very long documents: cap the estimate reasonably
      if (words.length < 100) {
        pageCount = 1;
      } else if (words.length < 2000) {
        pageCount = Math.ceil(words.length / 500);
      } else {
        // For very long documents, use a more conservative estimate
        pageCount = Math.ceil(words.length / 600);
      }
    }

    // Enhanced structure detection for better metadata
    let sectionCount = 1;
    let tableCount = 0;

    if (method === 'mammoth_extraction') {
      // For Mammoth-generated content, we might have HTML structure info
      // Count headings as sections
      const headingCount = (content.match(/<h[1-6][^>]*>/gi) || []).length;
      sectionCount = Math.max(1, headingCount);

      // Count tables
      tableCount = (content.match(/<table[^>]*>/gi) || []).length;
    } else {
      // For plain text, use paragraph breaks
      sectionCount = (content.match(/\n\n/g) || []).length + 1;
      tableCount = (content.match(/\t.*\t/g) || []).length;
    }

    return {
      wordCount: words.length,
      pageCount: Math.max(1, pageCount),
      sectionCount: Math.max(1, sectionCount),
      tableCount: tableCount,
      imageCount: 0, // Not extracted in text mode
      extractionMethod: method
    };
  }

  private generateTableHTML(data: any[]): string {
    if (!data || data.length === 0) return '<p>No data available</p>';

    const maxRows = Math.min(data.length, 20); // Limit to 20 rows
    const headerRow = data[0];
    const dataRows = data.slice(1, maxRows);

    return `
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              ${headerRow.map((cell: any) => `<th>${this.escapeHtml(String(cell || ''))}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${dataRows.map(row => `
              <tr>
                ${row.map((cell: any) => `<td>${this.escapeHtml(String(cell || ''))}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${data.length > maxRows ? `<p class="table-note">Showing ${maxRows} of ${data.length} rows</p>` : ''}
      </div>
    `;
  }

  private formatInfoContent(content: string): string {
    return content.split('\n').map(line => {
      if (line.startsWith('•')) {
        return `<li>${this.escapeHtml(line.substring(1).trim())}</li>`;
      } else if (line.trim().endsWith(':')) {
        return `<h4>${this.escapeHtml(line)}</h4>`;
      } else {
        return `<p>${this.escapeHtml(line)}</p>`;
      }
    }).join('');
  }

  private getMethodDisplayName(method: string): string {
    const names = {
      'mammoth_extraction': 'Mammoth.js',
      'jszip_xml_extraction': 'XML Parser',
      'binary_text_extraction': 'Text Filter',
      'csv_parsing': 'CSV Parser',
      'xlsx_library': 'XLSX.js',
      'json_formatting': 'JSON Parser',
      'xml_reading': 'XML Reader',
      'text_reading': 'Text Reader',
      'info_display': 'Info Display',
      'error_fallback': 'Fallback'
    };
    return names[method as keyof typeof names] || method;
  }

  private getPreviewStyles(): string {
    return `
      <style>
        .universal-preview {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f8fafc;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .document-header {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          padding: 1.5rem;
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1200px;
          margin: 0 auto;
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .doc-icon {
          font-size: 3rem;
          background: rgba(255,255,255,0.2);
          padding: 0.75rem;
          border-radius: 12px;
        }

        .file-details h1 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .file-meta {
          font-size: 0.9rem;
          opacity: 0.9;
          margin-top: 0.25rem;
        }

        .status-badge {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .status-badge.success {
          background: #10b981;
          color: white;
        }

        .status-badge.info {
          background: #3b82f6;
          color: white;
        }

        .stats-bar {
          background: white;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          gap: 2rem;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }

        .stat {
          text-align: center;
        }

        .stat-label {
          display: block;
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }

        .stat-value {
          display: block;
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
        }

        .document-content {
          flex: 1;
          padding: 1.5rem;
          overflow-y: auto;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }

        .content-preview {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          min-height: 400px;

          /* ✅ Fix scrolling and alignment */
          max-height: 80vh;   /* keep preview inside viewport */
          overflow-y: auto;   /* enable vertical scroll */
          text-align: left;   /* ensure left alignment */
          white-space: pre-wrap; /* preserve spacing/line breaks */
        }

        .extracted-text {
          font-family: 'Segoe UI', system-ui, sans-serif;
          font-size: 0.95rem;
          line-height: 1.6;
          color: #374151;
          white-space: pre-wrap;
          word-wrap: break-word;
          overflow-wrap: break-word;
          margin: 0;
        }

        .text-content {
          font-family: 'Courier New', monospace;
          font-size: 0.9rem;
          line-height: 1.5;
          color: #374151;
          white-space: pre-wrap;
          word-wrap: break-word;
          overflow-wrap: break-word;
          margin: 0;
        }

        .info-content {
          color: #374151;
          line-height: 1.6;
        }

        .info-content h4 {
          color: #1e293b;
          margin: 1rem 0 0.5rem 0;
          font-size: 1rem;
        }

        .info-content p {
          margin: 0.5rem 0;
        }

        .info-content li {
          margin: 0.25rem 0;
          list-style: none;
          padding-left: 1rem;
          position: relative;
        }

        .info-content li::before {
          content: "•";
          color: #2563eb;
          position: absolute;
          left: 0;
        }

        .table-container {
          overflow-x: auto;
          margin: 1rem 0;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .data-table th,
        .data-table td {
          border: 1px solid #e2e8f0;
          padding: 0.5rem;
          text-align: left;
        }

        .data-table th {
          background: #f8fafc;
          font-weight: 600;
          color: #374151;
        }

        .data-table tr:nth-child(even) {
          background: #f8fafc;
        }

        .table-note {
          text-align: center;
          color: #64748b;
          font-size: 0.875rem;
          margin: 0.5rem 0;
          font-style: italic;
        }

        .sheet-info {
          color: #64748b;
          font-size: 0.875rem;
          margin: 1rem 0;
          text-align: center;
        }

        @media (max-width: 768px) {
          .document-header {
            padding: 1rem;
          }

          .header-content {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .stats-bar {
            padding: 1rem;
            flex-wrap: wrap;
            gap: 1rem;
          }

          .document-content {
            padding: 1rem;
          }

          .content-preview {
            padding: 1rem;
          }

          .extracted-text,
          .text-content {
            font-size: 0.9rem;
          }
        }
      </style>
    `;
  }

  private getFormattedDocumentStyles(): string {
    return `
      <style>
        .formatted-document {
          font-family: 'Times New Roman', 'Times', serif;
          font-size: 16px;
          line-height: 1.6;
          color: #1a1a1a;
          background: white;
          padding: 2rem;
          margin: 0;
          max-width: none;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        /* Typography Enhancements */
        .formatted-document h1,
        .formatted-document h2,
        .formatted-document h3,
        .formatted-document h4,
        .formatted-document h5,
        .formatted-document h6 {
          font-family: 'Calibri', 'Arial', sans-serif;
          color: #2c3e50;
          margin: 1.2em 0 0.6em 0;
          font-weight: 600;
          line-height: 1.3;
          page-break-after: avoid;
        }

        .formatted-document h1 {
          font-size: 2em;
          border-bottom: 3px solid #3498db;
          padding-bottom: 0.3em;
          margin-top: 0;
        }

        .formatted-document h2 {
          font-size: 1.6em;
          border-bottom: 2px solid #95a5a6;
          padding-bottom: 0.2em;
        }

        .formatted-document h3 {
          font-size: 1.3em;
          color: #34495e;
        }

        .formatted-document h4 {
          font-size: 1.1em;
          color: #34495e;
        }

        .formatted-document h5,
        .formatted-document h6 {
          font-size: 1em;
          color: #7f8c8d;
        }

        /* Paragraph Styling */
        .formatted-document p {
          margin: 1em 0;
          text-align: justify;
          text-justify: inter-word;
        }

        /* Enhanced List Styling for better DOCX rendering */
        .formatted-document ul,
        .formatted-document ol {
          margin: 0.8em 0;
          padding-left: 1.8em;
          line-height: 1.6;
        }

        .formatted-document ul {
          list-style-type: disc;
        }

        .formatted-document ul ul {
          list-style-type: circle;
          margin: 0.4em 0;
          padding-left: 1.5em;
        }

        .formatted-document ul ul ul {
          list-style-type: square;
        }

        .formatted-document ol {
          list-style-type: decimal;
        }

        .formatted-document ol ol {
          list-style-type: lower-alpha;
          margin: 0.4em 0;
          padding-left: 1.5em;
        }

        .formatted-document ol ol ol {
          list-style-type: lower-roman;
        }

        .formatted-document li {
          margin: 0.4em 0;
          line-height: 1.6;
        }

        .formatted-document li p {
          margin: 0.2em 0;
        }

        /* Text Formatting */
        .formatted-document strong,
        .formatted-document b {
          font-weight: 700;
          color: #2c3e50;
        }

        .formatted-document em,
        .formatted-document i {
          font-style: italic;
          color: #34495e;
        }

        .formatted-document u {
          text-decoration: underline;
          text-decoration-color: #3498db;
        }

        /* Enhanced Table Styling for DOCX compatibility */
        .formatted-document table {
          border-collapse: collapse;
          width: 100%;
          margin: 1.2em 0;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          font-size: 0.95em;
        }

        .formatted-document table th,
        .formatted-document table td {
          border: 1px solid #d1d5db;
          padding: 0.6em 0.8em;
          text-align: left;
          vertical-align: top;
          line-height: 1.4;
        }

        .formatted-document table th {
          background: #f3f4f6;
          font-weight: 600;
          color: #374151;
          text-align: center;
        }

        .formatted-document table tr:nth-child(even) {
          background: #f9fafb;
        }

        .formatted-document table tr:hover {
          background: #f0f9ff;
        }

        /* Table responsiveness */
        @media (max-width: 768px) {
          .formatted-document table {
            font-size: 0.85em;
          }

          .formatted-document table th,
          .formatted-document table td {
            padding: 0.4em 0.6em;
          }
        }

        /* Block Quotes */
        .formatted-document blockquote {
          border-left: 4px solid #3498db;
          background: #f8f9fa;
          margin: 1.5em 0;
          padding: 1em 1.5em;
          font-style: italic;
          color: #555;
        }

        /* Code and Preformatted Text */
        .formatted-document code {
          background: #f4f4f4;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
          color: #e74c3c;
        }

        .formatted-document pre {
          background: #f8f8f8;
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 1em;
          overflow-x: auto;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
          line-height: 1.4;
        }

        /* Links */
        .formatted-document a {
          color: #3498db;
          text-decoration: none;
          border-bottom: 1px dotted #3498db;
        }

        .formatted-document a:hover {
          color: #2980b9;
          border-bottom: 1px solid #2980b9;
        }

        /* Spacing and Layout */
        .formatted-document > *:first-child {
          margin-top: 0;
        }

        .formatted-document > *:last-child {
          margin-bottom: 0;
        }

        /* Special formatting for mammoth-generated content */
        .formatted-document .mammoth-style-heading {
          font-weight: 600;
          color: #2c3e50;
          margin: 1.2em 0 0.6em 0;
        }

        .formatted-document .mammoth-style-normal {
          margin: 0.8em 0;
        }

        /* Enhanced Mammoth.js content styling */
        .mammoth-content {
          /* Ensure proper spacing and alignment */
          text-align: left;
        }

        .mammoth-content p {
          margin: 0.6em 0;
          text-align: inherit;
        }

        .mammoth-content p:first-child {
          margin-top: 0;
        }

        .mammoth-content p:last-child {
          margin-bottom: 0;
        }

        /* Handle center and right alignment if present in HTML */
        .mammoth-content [style*="text-align: center"],
        .mammoth-content .center,
        .mammoth-content .text-center {
          text-align: center !important;
        }

        .mammoth-content [style*="text-align: right"],
        .mammoth-content .right,
        .mammoth-content .text-right {
          text-align: right !important;
        }

        .mammoth-content [style*="text-align: justify"],
        .mammoth-content .justify,
        .mammoth-content .text-justify {
          text-align: justify !important;
        }

        /* Preserve inline styling for text formatting */
        .mammoth-content [style*="font-weight: bold"],
        .mammoth-content [style*="font-weight:bold"] {
          font-weight: 700 !important;
        }

        .mammoth-content [style*="font-style: italic"],
        .mammoth-content [style*="font-style:italic"] {
          font-style: italic !important;
        }

        .mammoth-content [style*="text-decoration: underline"],
        .mammoth-content [style*="text-decoration:underline"] {
          text-decoration: underline !important;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .formatted-document {
            padding: 1rem;
            font-size: 14px;
          }

          .formatted-document h1 {
            font-size: 1.6em;
          }

          .formatted-document h2 {
            font-size: 1.4em;
          }

          .formatted-document h3 {
            font-size: 1.2em;
          }

          .formatted-document table {
            font-size: 0.9em;
          }

          .formatted-document ul,
          .formatted-document ol {
            padding-left: 1.5em;
          }
        }

        /* Print Styles */
        @media print {
          .formatted-document {
            background: white;
            color: black;
            font-size: 12pt;
            line-height: 1.4;
          }

          .formatted-document h1,
          .formatted-document h2,
          .formatted-document h3 {
            page-break-after: avoid;
          }
        }
      </style>
    `;
  }

  private createFallbackPreview(blob: Blob, fileName: string, mimeType: string, error: Error): PreviewResult {
    const content = `Document: ${fileName}

Processing Error: ${error.message}

This document is available for download. The preview failed due to:
• File format complexity
• Processing limitations
• Unsupported content structure
• Technical constraints

To view this document:
• Download the file using the download button
• Open with appropriate software
• Contact support if you need assistance

File Information:
• Name: ${fileName}
• Size: ${this.formatFileSize(blob.size)}
• Type: ${mimeType || 'Unknown'}`;

    return {
      type: 'success',
      format: 'html',
      content: this.generateGenericPreviewHTML(fileName, content, {
        wordCount: 0,
        pageCount: 1,
        sectionCount: 1,
        tableCount: 0,
        imageCount: 0,
        extractionMethod: 'error_fallback'
      }, blob.size, 'error_fallback', mimeType),
      metadata: {
        title: fileName,
        extractionMethod: 'error_fallback',
        fileSize: blob.size,
        error: error.message
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

  private enhanceMammothHTML(html: string): string {
    // Enhance Mammoth.js HTML output for better structure and formatting
    let enhanced = html;

    // Improve paragraph spacing and structure
    enhanced = enhanced.replace(/<p><\/p>/g, '<p>&nbsp;</p>'); // Empty paragraphs
    enhanced = enhanced.replace(/(<p[^>]*>)\s*(<\/p>)/g, '$1&nbsp;$2'); // Very short paragraphs

    // Ensure proper heading structure
    enhanced = enhanced.replace(/<p><strong>([^<]+)<\/strong><\/p>/g, '<h3>$1</h3>'); // Bold paragraphs as headings

    // Improve list formatting - handle nested lists better
    enhanced = enhanced.replace(/(<\/ul>)\s*(<ul>)/g, '$1$2'); // Merge adjacent lists
    enhanced = enhanced.replace(/(<\/ol>)\s*(<ol>)/g, '$1$2'); // Merge adjacent ordered lists

    // Add line breaks for better readability
    enhanced = enhanced.replace(/(<\/p>)(?!\s*<)/g, '$1\n');
    enhanced = enhanced.replace(/(<\/li>)(?!\s*<)/g, '$1\n');
    enhanced = enhanced.replace(/(<\/h[1-6]>)(?!\s*<)/g, '$1\n');

    // Handle tables better - add proper spacing
    enhanced = enhanced.replace(/(<table[^>]*>)/g, '\n$1\n');
    enhanced = enhanced.replace(/(<\/table>)/g, '\n$1\n');

    // Clean up excessive whitespace but preserve structure
    enhanced = enhanced.replace(/\n\s*\n\s*\n/g, '\n\n');

    return enhanced.trim();
  }
}