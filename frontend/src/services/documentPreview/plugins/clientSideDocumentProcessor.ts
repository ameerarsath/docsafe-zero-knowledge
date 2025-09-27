/**
 * Client-Side Document Processor Plugin
 * A robust browser-based document processor that bypasses all server dependencies
 * Shows actual document content with comprehensive error handling
 */

import { PreviewPlugin, PreviewResult, PreviewOptions } from '../pluginSystem';

interface DocumentMetadata {
  wordCount: number;
  pageCount: number;
  sectionCount: number;
  tableCount: number;
  imageCount: number;
  extractionMethod: string;
  processingTime?: string;
  fileSize: number;
}

interface ProcessingResult {
  content: string;
  method: string;
  metadata?: any;
  success: boolean;
  error?: string;
}

export class ClientSideDocumentProcessor implements PreviewPlugin {
  name = 'ClientSideDocumentProcessor';
  priority = 350; // Highest priority to handle all document types first
  description = 'Pure client-side document processor that bypasses server dependencies';
  version = '2.0.0';

  supportedMimeTypes = [
    // Microsoft Office Documents
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'application/msword',                                                        // .doc
    'application/vnd.ms-excel',                                                  // .xls
    'application/vnd.ms-powerpoint',                                            // .ppt

    // Text and Data Files
    'text/plain',
    'text/csv',
    'text/markdown',
    'text/html',
    'application/json',
    'application/xml',
    'text/xml',
    'application/rtf',
    'text/rtf',

    // Other supported formats
    'application/zip' // For examining Office documents
  ];

  supportedExtensions = [
    '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt',
    '.txt', '.csv', '.md', '.html', '.json', '.xml', '.rtf'
  ];

  canPreview(mimeType: string, fileName: string): boolean {
    const extension = fileName.toLowerCase().split('.').pop();
    const isSupported = this.supportedMimeTypes.includes(mimeType) ||
                       (extension && this.supportedExtensions.includes(`.${extension}`));

    console.log(`🔍 ClientSideProcessor canPreview: ${fileName} (${mimeType}) -> ${isSupported}`);
    return isSupported;
  }

  async preview(
    blob: Blob,
    fileName: string,
    mimeType: string,
    options?: PreviewOptions
  ): Promise<PreviewResult> {
    const startTime = performance.now();

    try {
      console.log(`🚀 ClientSideProcessor: Starting processing for ${fileName} (${blob.size} bytes)`);

      const extension = fileName.toLowerCase().split('.').pop() || '';

      // Process based on file type with multiple fallback strategies
      let result: ProcessingResult;

      if (this.isWordDocument(extension, mimeType)) {
        result = await this.processWordDocument(blob, fileName);
      } else if (this.isExcelDocument(extension, mimeType)) {
        result = await this.processExcelDocument(blob, fileName);
      } else if (this.isPowerPointDocument(extension, mimeType)) {
        result = await this.processPowerPointDocument(blob, fileName);
      } else if (this.isTextDocument(extension, mimeType)) {
        result = await this.processTextDocument(blob, fileName);
      } else {
        result = await this.processGenericDocument(blob, fileName, mimeType);
      }

      const processingTime = performance.now() - startTime;
      console.log(`✅ ClientSideProcessor: Completed ${fileName} in ${processingTime.toFixed(1)}ms`);

      // Create document metadata
      const docMetadata = this.calculateDocumentMetadata(result.content, result.method, blob.size);
      docMetadata.processingTime = `${processingTime.toFixed(1)}ms`;

      // Generate HTML preview
      const htmlContent = this.generatePreviewHTML(
        fileName,
        result.content,
        docMetadata,
        extension,
        result.method,
        result.success
      );

      return {
        type: 'success',
        format: 'html',
        content: htmlContent,
        metadata: {
          pluginName: this.name,
          title: fileName,
          extractionMethod: result.method,
          processingTime: `${processingTime.toFixed(1)}ms`,
          ...docMetadata,
          ...result.metadata
        }
      };

    } catch (error) {
      console.error(`❌ ClientSideProcessor failed for ${fileName}:`, error);
      return this.createErrorResult(blob, fileName, mimeType, error as Error);
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

  private async processWordDocument(blob: Blob, fileName: string): Promise<ProcessingResult> {
    console.log('📝 Processing Word document with multiple strategies...');

    // Strategy 1: Mammoth.js (best for .docx)
    if (fileName.toLowerCase().endsWith('.docx')) {
      try {
        const mammothResult = await this.extractWithMammoth(blob);
        if (mammothResult.success && mammothResult.content.trim().length > 50) {
          console.log('✅ Mammoth.js extraction successful');
          return mammothResult;
        }
      } catch (error) {
        console.warn('Mammoth.js failed:', error);
      }
    }

    // Strategy 2: Direct ZIP extraction for .docx
    if (fileName.toLowerCase().endsWith('.docx')) {
      try {
        const zipResult = await this.extractDocxWithJSZip(blob);
        if (zipResult.success && zipResult.content.trim().length > 50) {
          console.log('✅ JSZip XML extraction successful');
          return zipResult;
        }
      } catch (error) {
        console.warn('JSZip extraction failed:', error);
      }
    }

    // Strategy 3: Binary text extraction
    try {
      const binaryResult = await this.extractBinaryText(blob);
      if (binaryResult.success && binaryResult.content.trim().length > 20) {
        console.log('✅ Binary text extraction successful');
        return binaryResult;
      }
    } catch (error) {
      console.warn('Binary extraction failed:', error);
    }

    // Strategy 4: Informational fallback
    return {
      content: this.generateWordInfoContent(fileName, blob.size),
      method: 'info_display',
      success: true,
      metadata: { reason: 'extraction_not_possible' }
    };
  }

  private async processExcelDocument(blob: Blob, fileName: string): Promise<ProcessingResult> {
    console.log('📊 Processing Excel document...');

    const extension = fileName.toLowerCase().split('.').pop();

    // CSV files
    if (extension === 'csv' || blob.type.includes('csv')) {
      try {
        const csvResult = await this.processCSVFile(blob);
        return csvResult;
      } catch (error) {
        console.warn('CSV processing failed:', error);
      }
    }

    // Excel files with XLSX.js
    if (['xlsx', 'xls'].includes(extension || '')) {
      try {
        const xlsxResult = await this.processExcelWithXLSX(blob);
        if (xlsxResult.success) {
          return xlsxResult;
        }
      } catch (error) {
        console.warn('XLSX processing failed:', error);
      }
    }

    // Fallback
    return {
      content: this.generateExcelInfoContent(fileName, blob.size),
      method: 'info_display',
      success: true,
      metadata: { reason: 'extraction_not_available' }
    };
  }

  private async processPowerPointDocument(blob: Blob, fileName: string): Promise<ProcessingResult> {
    console.log('📋 Processing PowerPoint document...');

    // Try to extract text from PPTX
    if (fileName.toLowerCase().endsWith('.pptx')) {
      try {
        const pptxResult = await this.extractPowerPointText(blob);
        if (pptxResult.success && pptxResult.content.trim().length > 20) {
          return pptxResult;
        }
      } catch (error) {
        console.warn('PowerPoint text extraction failed:', error);
      }
    }

    // Fallback to informational content
    return {
      content: this.generatePowerPointInfoContent(fileName, blob.size),
      method: 'info_display',
      success: true,
      metadata: { reason: 'complex_format' }
    };
  }

  private async processTextDocument(blob: Blob, fileName: string): Promise<ProcessingResult> {
    console.log('📄 Processing text document...');

    try {
      let content = await blob.text();
      const extension = fileName.toLowerCase().split('.').pop() || 'txt';

      // Format based on file type
      if (extension === 'json') {
        try {
          const parsed = JSON.parse(content);
          content = JSON.stringify(parsed, null, 2);
          return {
            content,
            method: 'json_formatting',
            success: true,
            metadata: { formatted: true }
          };
        } catch {
          // Keep original content if JSON parsing fails
        }
      }

      return {
        content,
        method: 'text_reading',
        success: true,
        metadata: { encoding: 'utf8' }
      };

    } catch (error) {
      return {
        content: `Unable to read text content from ${fileName}`,
        method: 'text_read_error',
        success: false,
        error: (error as Error).message
      };
    }
  }

  private async processGenericDocument(blob: Blob, fileName: string, mimeType: string): Promise<ProcessingResult> {
    console.log('📄 Processing generic document...');

    try {
      // Try text extraction first
      let content = await blob.text();

      // Check if content is mostly binary
      if (this.isMostlyBinary(content)) {
        content = this.extractReadableText(content);
        if (content.trim().length < 50) {
          // Not enough readable content, show info
          content = this.generateGenericInfoContent(fileName, blob.size, mimeType);
          return {
            content,
            method: 'info_display',
            success: true,
            metadata: { reason: 'binary_content' }
          };
        }
        return {
          content,
          method: 'binary_text_extraction',
          success: true,
          metadata: { filtered: true }
        };
      }

      return {
        content,
        method: 'generic_text_extraction',
        success: true,
        metadata: { type: 'text_based' }
      };

    } catch (error) {
      return {
        content: this.generateGenericInfoContent(fileName, blob.size, mimeType),
        method: 'error_fallback',
        success: false,
        error: (error as Error).message
      };
    }
  }

  // Extraction implementation methods
  private async extractWithMammoth(blob: Blob): Promise<ProcessingResult> {
    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await blob.arrayBuffer();

      console.log('🔄 Attempting Mammoth.js extraction...');
      const result = await mammoth.convertToHtml({ arrayBuffer });

      if (!result.value || result.value.trim().length === 0) {
        throw new Error('Mammoth returned empty content');
      }

      console.log('✅ Mammoth extraction successful, preserving HTML formatting');

      // Enhance the HTML with proper styling and return it directly
      const enhancedHtml = this.enhanceHtmlContent(result.value);

      return {
        content: enhancedHtml,
        method: 'mammoth_html_extraction',
        success: true,
        metadata: {
          warnings: result.messages?.length || 0,
          htmlLength: result.value.length,
          isHtml: true
        }
      };

    } catch (error) {
      throw new Error(`Mammoth extraction failed: ${error.message}`);
    }
  }

  private async extractDocxWithJSZip(blob: Blob): Promise<ProcessingResult> {
    try {
      const JSZip = await import('jszip');
      const zip = new JSZip.default();

      console.log('🔄 Loading DOCX with JSZip...');
      const zipContent = await zip.loadAsync(blob);

      // Extract from document.xml
      const documentXml = zipContent.files['word/document.xml'];
      if (!documentXml) {
        throw new Error('No document.xml found in DOCX');
      }

      const xmlText = await documentXml.async('text');

      // Extract text from XML
      const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      const matches = [];
      let match;

      while ((match = textRegex.exec(xmlText)) !== null) {
        if (match[1] && match[1].trim()) {
          matches.push(match[1]);
        }
      }

      const extractedText = matches.join(' ').trim();

      if (!extractedText || extractedText.length < 10) {
        throw new Error('Insufficient text content found');
      }

      return {
        content: extractedText,
        method: 'jszip_xml_extraction',
        success: true,
        metadata: {
          xmlSize: xmlText.length,
          textMatches: matches.length
        }
      };

    } catch (error) {
      throw new Error(`JSZip extraction failed: ${error.message}`);
    }
  }

  private async extractBinaryText(blob: Blob): Promise<ProcessingResult> {
    try {
      console.log('🔄 Attempting binary text extraction...');
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      let text = '';
      let readableChars = 0;

      // Extract readable characters
      for (let i = 0; i < Math.min(uint8Array.length, 100000); i++) { // Limit to first 100KB
        const char = uint8Array[i];
        if ((char >= 32 && char <= 126) || char === 10 || char === 13 || char === 9) {
          text += String.fromCharCode(char);
          readableChars++;
        } else if (char === 0 && text.slice(-1) !== ' ') {
          text += ' ';
        }
      }

      // Clean up text
      text = text
        .replace(/\s+/g, ' ')
        .replace(/(.{100})/g, '$1\n')
        .trim();

      if (readableChars < 50) {
        throw new Error('Insufficient readable content');
      }

      return {
        content: text.substring(0, 5000), // Limit output
        method: 'binary_text_extraction',
        success: true,
        metadata: {
          readableChars,
          totalBytes: uint8Array.length
        }
      };

    } catch (error) {
      throw new Error(`Binary extraction failed: ${error.message}`);
    }
  }

  private async processCSVFile(blob: Blob): Promise<ProcessingResult> {
    try {
      const content = await blob.text();
      const lines = content.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        throw new Error('Empty CSV file');
      }

      // Parse CSV (simple implementation)
      const rows = lines.slice(0, 50).map(line => {
        // Basic CSV parsing - handles quoted fields
        const fields = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"' && (i === 0 || line[i-1] === ',')) {
            inQuotes = true;
          } else if (char === '"' && inQuotes) {
            inQuotes = false;
          } else if (char === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        fields.push(current.trim());
        return fields;
      });

      const tableHtml = this.generateCSVTable(rows);

      return {
        content: `CSV Data Preview:\n\n${tableHtml}`,
        method: 'csv_parsing',
        success: true,
        metadata: {
          totalRows: lines.length,
          previewRows: rows.length,
          columns: rows[0]?.length || 0
        }
      };

    } catch (error) {
      throw new Error(`CSV processing failed: ${error.message}`);
    }
  }

  private async processExcelWithXLSX(blob: Blob): Promise<ProcessingResult> {
    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await blob.arrayBuffer();

      console.log('🔄 Processing Excel with XLSX.js...');
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('No sheets found in Excel file');
      }

      const sheets = workbook.SheetNames.slice(0, 3).map(sheetName => { // Max 3 sheets
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        return {
          name: sheetName,
          data: jsonData.slice(0, 20) // Max 20 rows per sheet
        };
      });

      const contentSummary = sheets.map(sheet =>
        `Sheet: ${sheet.name}\nRows: ${sheet.data.length}\n\n${this.generateExcelSheetPreview(sheet.data)}`
      ).join('\n\n' + '='.repeat(50) + '\n\n');

      return {
        content: `Excel Workbook Preview:\n\n${contentSummary}`,
        method: 'xlsx_library',
        success: true,
        metadata: {
          totalSheets: workbook.SheetNames.length,
          previewSheets: sheets.length,
          totalRows: sheets.reduce((sum, sheet) => sum + sheet.data.length, 0)
        }
      };

    } catch (error) {
      throw new Error(`Excel processing failed: ${error.message}`);
    }
  }

  private async extractPowerPointText(blob: Blob): Promise<ProcessingResult> {
    try {
      const JSZip = await import('jszip');
      const zip = new JSZip.default();

      console.log('🔄 Extracting PowerPoint text...');
      const zipContent = await zip.loadAsync(blob);

      let slideTexts = [];
      let slideNumber = 0;

      // Extract text from slides
      for (const fileName of Object.keys(zipContent.files)) {
        if (fileName.startsWith('ppt/slides/slide') && fileName.endsWith('.xml')) {
          slideNumber++;
          const slideXml = await zipContent.files[fileName].async('text');

          // Extract text from PowerPoint XML
          const textRegex = /<a:t[^>]*>([^<]*)<\/a:t>/g;
          const matches = [];
          let match;

          while ((match = textRegex.exec(slideXml)) !== null) {
            if (match[1] && match[1].trim()) {
              matches.push(match[1]);
            }
          }

          if (matches.length > 0) {
            slideTexts.push(`Slide ${slideNumber}:\n${matches.join(' ')}`);
          }
        }
      }

      const extractedText = slideTexts.join('\n\n');

      if (!extractedText || extractedText.trim().length < 20) {
        throw new Error('No readable text found in slides');
      }

      return {
        content: extractedText,
        method: 'powerpoint_xml_extraction',
        success: true,
        metadata: {
          slideCount: slideNumber,
          extractedSlides: slideTexts.length
        }
      };

    } catch (error) {
      throw new Error(`PowerPoint extraction failed: ${error.message}`);
    }
  }

  private enhanceHtmlContent(htmlContent: string): string {
    if (!htmlContent || htmlContent.trim().length === 0) {
      return '<div class="docx-preview"><p>No content available</p></div>';
    }

    // Return clean HTML content wrapped in container WITHOUT inline styles
    // CSS will be applied externally via React component styling
    return `<div class="docx-preview">${htmlContent}</div>`;
  }

  // Utility methods
  private isMostlyBinary(text: string): boolean {
    let printableCount = 0;
    const sampleSize = Math.min(text.length, 2000);

    for (let i = 0; i < sampleSize; i++) {
      const charCode = text.charCodeAt(i);
      if ((charCode >= 32 && charCode <= 126) || charCode === 9 || charCode === 10 || charCode === 13) {
        printableCount++;
      }
    }

    return printableCount / sampleSize < 0.6;
  }

  private extractReadableText(binaryText: string): string {
    return binaryText
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 3000);
  }

  private calculateDocumentMetadata(content: string, method: string, fileSize: number): DocumentMetadata {
    // If content is HTML, extract text for proper word counting
    let textContent = content;
    if (content.includes('<') && content.includes('>')) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      textContent = tempDiv.textContent || tempDiv.innerText || '';
    }

    const words = textContent.trim().split(/\s+/).filter(word => word.length > 0);
    const lines = textContent.split('\n');

    // Count tables and images from HTML
    let tableCount = 0;
    let imageCount = 0;

    if (content.includes('<table')) {
      tableCount = (content.match(/<table[^>]*>/g) || []).length;
    } else {
      tableCount = (textContent.match(/\t.*\t/g) || []).length;
    }

    if (content.includes('<img')) {
      imageCount = (content.match(/<img[^>]*>/g) || []).length;
    }

    return {
      wordCount: words.length,
      pageCount: Math.max(1, Math.ceil(words.length / 250)),
      sectionCount: Math.max(1, (textContent.match(/\n\n/g) || []).length + 1),
      tableCount,
      imageCount,
      extractionMethod: method,
      fileSize
    };
  }

  // Content generators
  private generateWordInfoContent(fileName: string, fileSize: number): string {
    return `📝 Microsoft Word Document

File: ${fileName}
Size: ${this.formatFileSize(fileSize)}

This Word document is ready for download and viewing.

Document Features:
• Professional formatting and layouts
• Text, images, tables, and charts
• Headers, footers, and page numbering
• Styles and formatting options

To view the complete document:
• Download using the download button above
• Open with Microsoft Word or compatible software
• Use Word Online for browser-based viewing
• Convert to PDF for universal compatibility

The document content cannot be previewed due to complex formatting, embedded objects, or document protection settings.`;
  }

  private generateExcelInfoContent(fileName: string, fileSize: number): string {
    return `📊 Microsoft Excel Spreadsheet

File: ${fileName}
Size: ${this.formatFileSize(fileSize)}

This Excel workbook is ready for download and analysis.

Spreadsheet Features:
• Multiple worksheets and data tables
• Formulas, calculations, and functions
• Charts, graphs, and visualizations
• Conditional formatting and styles

To view the complete workbook:
• Download using the download button above
• Open with Microsoft Excel or compatible software
• Use Excel Online for browser-based viewing
• Export individual sheets as CSV for basic preview

Complex Excel features like macros, pivot tables, and advanced formatting require the full application to display properly.`;
  }

  private generatePowerPointInfoContent(fileName: string, fileSize: number): string {
    return `📋 Microsoft PowerPoint Presentation

File: ${fileName}
Size: ${this.formatFileSize(fileSize)}

This presentation is ready for download and viewing.

Presentation Features:
• Multiple slides with varied layouts
• Text, images, and multimedia content
• Animations and slide transitions
• Charts, graphs, and embedded objects

To view the complete presentation:
• Download using the download button above
• Open with Microsoft PowerPoint or compatible software
• Use PowerPoint Online for browser-based viewing
• Export slides as images for basic preview

PowerPoint presentations contain rich multimedia content that requires the full application for optimal viewing and interaction.`;
  }

  private generateGenericInfoContent(fileName: string, fileSize: number, mimeType: string): string {
    return `📄 Document File

File: ${fileName}
Size: ${this.formatFileSize(fileSize)}
Type: ${mimeType || 'Unknown format'}

This document is available for download.

File Information:
• Specialized format requiring specific software
• May contain binary data or proprietary structure
• Best viewed with appropriate application
• Download recommended for full functionality

To open this document:
• Download using the download button above
• Use software compatible with this file type
• Check the file extension for application hints
• Contact support if you need assistance with this format`;
  }

  // HTML generators
  private generatePreviewHTML(
    fileName: string,
    content: string,
    metadata: DocumentMetadata,
    extension: string,
    method: string,
    success: boolean
  ): string {
    const icons = {
      docx: '📝', doc: '📝', rtf: '📝',
      xlsx: '📊', xls: '📊', csv: '📊',
      pptx: '📋', ppt: '📋',
      txt: '📄', md: '📝', html: '🌐', json: '📋', xml: '📄'
    };

    const icon = icons[extension as keyof typeof icons] || '📄';
    const isTextExtracted = method.includes('extraction') && success;

    return `
      <div class="client-side-preview">
        ${this.getPreviewStyles()}

        <div class="header">
          <div class="header-content">
            <div class="file-info">
              <div class="icon">${icon}</div>
              <div class="details">
                <h1>${this.escapeHtml(fileName)}</h1>
                <div class="meta">${this.getFileTypeLabel(extension)} • ${this.formatFileSize(metadata.fileSize)}</div>
              </div>
            </div>
            <div class="status ${success ? 'success' : 'warning'}">
              ${isTextExtracted ? '✅ Content Extracted' : success ? 'ℹ️ Info Available' : '⚠️ Processing Limited'}
            </div>
          </div>
        </div>

        <div class="stats">
          <div class="stat">
            <span class="label">Words</span>
            <span class="value">${metadata.wordCount.toLocaleString()}</span>
          </div>
          <div class="stat">
            <span class="label">${this.getPageLabel(extension)}</span>
            <span class="value">${metadata.pageCount}</span>
          </div>
          <div class="stat">
            <span class="label">Method</span>
            <span class="value">${this.getMethodDisplayName(method)}</span>
          </div>
          <div class="stat">
            <span class="label">Time</span>
            <span class="value">${metadata.processingTime || 'N/A'}</span>
          </div>
        </div>

        <div class="content">
          ${isTextExtracted ?
            `<div class="extracted-content">
              ${metadata.isHtml ?
                `<div class="html-content">${content}</div>` :
                `<pre class="text-content">${this.escapeHtml(content)}</pre>`
              }
            </div>` :
            `<div class="info-content">
              ${this.formatInfoText(content)}
            </div>`
          }
        </div>

        <div class="footer">
          <div class="processing-info">
            Processed by ${this.name} v${this.version} • Method: ${this.getMethodDisplayName(method)}
          </div>
        </div>
      </div>
    `;
  }

  private generateCSVTable(rows: string[][]): string {
    if (!rows || rows.length === 0) return 'No data available';

    const headerRow = rows[0];
    const dataRows = rows.slice(1);

    let html = '<table class="csv-table">\n';

    // Header
    html += '  <thead>\n    <tr>\n';
    headerRow.forEach(cell => {
      html += `      <th>${this.escapeHtml(cell)}</th>\n`;
    });
    html += '    </tr>\n  </thead>\n';

    // Data rows
    html += '  <tbody>\n';
    dataRows.forEach(row => {
      html += '    <tr>\n';
      row.forEach(cell => {
        html += `      <td>${this.escapeHtml(cell)}</td>\n`;
      });
      html += '    </tr>\n';
    });
    html += '  </tbody>\n</table>';

    return html;
  }

  private generateExcelSheetPreview(data: any[]): string {
    if (!data || data.length === 0) return 'No data in this sheet';

    const preview = data.slice(0, 5).map(row =>
      Array.isArray(row) ? row.join(' | ') : String(row)
    ).join('\n');

    return preview + (data.length > 5 ? `\n... (${data.length - 5} more rows)` : '');
  }

  // Utility methods
  private getFileTypeLabel(extension: string): string {
    const labels = {
      docx: 'Word Document', doc: 'Word Document', rtf: 'Rich Text Format',
      xlsx: 'Excel Spreadsheet', xls: 'Excel Spreadsheet', csv: 'CSV Data',
      pptx: 'PowerPoint Presentation', ppt: 'PowerPoint Presentation',
      txt: 'Text File', md: 'Markdown', html: 'HTML Document',
      json: 'JSON Data', xml: 'XML Document'
    };
    return labels[extension as keyof typeof labels] || `${extension.toUpperCase()} File`;
  }

  private getPageLabel(extension: string): string {
    if (['xlsx', 'xls', 'csv'].includes(extension)) return 'Rows';
    if (['pptx', 'ppt'].includes(extension)) return 'Slides';
    return 'Pages';
  }

  private getMethodDisplayName(method: string): string {
    const names = {
      'mammoth_extraction': 'Mammoth.js',
      'jszip_xml_extraction': 'ZIP/XML',
      'binary_text_extraction': 'Binary Filter',
      'csv_parsing': 'CSV Parser',
      'xlsx_library': 'XLSX.js',
      'powerpoint_xml_extraction': 'PPTX Parser',
      'json_formatting': 'JSON Parser',
      'text_reading': 'Text Reader',
      'info_display': 'Info Display'
    };
    return names[method as keyof typeof names] || method.replace(/_/g, ' ');
  }

  private formatInfoText(content: string): string {
    return content.split('\n').map(line => {
      line = line.trim();
      if (!line) return '<br>';
      if (line.startsWith('•')) return `<div class="bullet">• ${this.escapeHtml(line.substring(1).trim())}</div>`;
      if (line.endsWith(':')) return `<div class="heading">${this.escapeHtml(line)}</div>`;
      return `<div class="text">${this.escapeHtml(line)}</div>`;
    }).join('');
  }

  private getPreviewStyles(): string {
    return `
      <style>
        .client-side-preview {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          background: #f8fafc;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .header {
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

        .icon {
          font-size: 3rem;
          background: rgba(255,255,255,0.2);
          padding: 0.75rem;
          border-radius: 12px;
        }

        .details h1 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .meta {
          font-size: 0.9rem;
          opacity: 0.9;
          margin-top: 0.25rem;
        }

        .status {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .status.success {
          background: #10b981;
          color: white;
        }

        .status.warning {
          background: #f59e0b;
          color: white;
        }

        .stats {
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

        .label {
          display: block;
          font-size: 0.75rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }

        .value {
          display: block;
          font-size: 1.25rem;
          font-weight: 700;
          color: #1e293b;
        }

        .content {
          flex: 1;
          padding: 1.5rem;
          overflow-y: auto;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }

        .extracted-content,
        .info-content {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          min-height: 400px;
        }

        .text-content {
          font-family: 'Segoe UI', system-ui, sans-serif;
          font-size: 0.95rem;
          line-height: 1.6;
          color: #374151;
          white-space: pre-wrap;
          word-wrap: break-word;
          margin: 0;
        }

        .html-content {
          font-family: 'Segoe UI', system-ui, sans-serif;
          line-height: 1.6;
          color: #374151;
          word-wrap: break-word;
          overflow-wrap: break-word;
          /* Remove default padding as the HTML content already includes it */
          padding: 0;
          margin: 0;
        }

        /* Ensure HTML content fills the container properly */
        .html-content > .docx-preview {
          box-shadow: none;
          border-radius: 0;
          padding: 0;
          margin: 0;
          background: transparent;
        }

        .info-content {
          color: #374151;
          line-height: 1.6;
        }

        .info-content .heading {
          color: #1e293b;
          font-weight: 600;
          margin: 1rem 0 0.5rem 0;
          font-size: 1.1rem;
        }

        .info-content .bullet {
          margin: 0.5rem 0;
          color: #2563eb;
        }

        .info-content .text {
          margin: 0.5rem 0;
        }

        .csv-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
          margin: 1rem 0;
        }

        .csv-table th,
        .csv-table td {
          border: 1px solid #e2e8f0;
          padding: 0.5rem;
          text-align: left;
        }

        .csv-table th {
          background: #f8fafc;
          font-weight: 600;
          color: #374151;
        }

        .csv-table tr:nth-child(even) {
          background: #f8fafc;
        }

        .footer {
          background: #f1f5f9;
          padding: 0.75rem 1.5rem;
          border-top: 1px solid #e2e8f0;
        }

        .processing-info {
          text-align: center;
          font-size: 0.75rem;
          color: #64748b;
          max-width: 1200px;
          margin: 0 auto;
        }

        @media (max-width: 768px) {
          .header {
            padding: 1rem;
          }

          .header-content {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .stats {
            padding: 1rem;
            flex-wrap: wrap;
            gap: 1rem;
          }

          .content {
            padding: 1rem;
          }

          .extracted-content,
          .info-content {
            padding: 1rem;
          }
        }
      </style>
    `;
  }

  private createErrorResult(blob: Blob, fileName: string, mimeType: string, error: Error): PreviewResult {
    const content = `❌ Processing Error

File: ${fileName}
Error: ${error.message}

This document could not be processed for preview. Common causes:
• Complex or corrupted file structure
• Unsupported file format variation
• Large file size or memory limitations
• Missing required document components

Recommended Actions:
• Download the file to view with appropriate software
• Try opening with the original application
• Check if the file is corrupted or incomplete
• Contact support if the issue persists

File Information:
• Size: ${this.formatFileSize(blob.size)}
• Type: ${mimeType || 'Unknown'}`;

    return {
      type: 'success',
      format: 'html',
      content: this.generatePreviewHTML(
        fileName,
        content,
        {
          wordCount: 0,
          pageCount: 1,
          sectionCount: 1,
          tableCount: 0,
          imageCount: 0,
          extractionMethod: 'error_fallback',
          fileSize: blob.size
        },
        fileName.split('.').pop() || '',
        'error_fallback',
        false
      ),
      metadata: {
        pluginName: this.name,
        title: fileName,
        extractionMethod: 'error_fallback',
        error: error.message,
        fileSize: blob.size
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