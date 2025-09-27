/**
 * Robust Office Document Plugin
 * Handles all non-PDF file types with server-side processing and user-friendly error messages
 * Specifically designed to fix "File is not a zip file" errors for Office documents
 */

import { PreviewPlugin, PreviewResult, PreviewOptions } from '../pluginSystem';

export class RobustOfficePlugin implements PreviewPlugin {
  name = 'RobustOffice';
  priority = 150; // Lower priority - backup for Universal processor
  description = 'Robust Office document preview with server-side processing and user-friendly error handling';
  version = '1.0.0';

  supportedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'text/plain',
    'text/csv',
    'application/json',
    'application/xml',
    'text/xml'
  ];

  supportedExtensions = ['.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.txt', '.csv', '.json', '.xml'];

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
      console.log(`🔧 Robust Office Plugin: Processing ${fileName} (${mimeType})`);

      // Try client-side processing first for better reliability
      let result: PreviewResult;

      try {
        result = await this.processClientSide(blob, fileName, mimeType);
        console.log(`✅ Client-side processing successful for ${fileName}`);
      } catch (clientError) {
        console.warn(`⚠️ Client-side processing failed, trying server-side:`, clientError);
        try {
          result = await this.processWithServer(blob, fileName, mimeType);
          console.log(`✅ Server-side processing successful for ${fileName}`);
        } catch (serverError) {
          console.warn(`⚠️ Server-side processing also failed:`, serverError);

          // Check if server error indicates processing limitation rather than actual error
          const serverErrorMessage = (serverError as Error).message || '';
          if (serverErrorMessage.includes('Server processing not available') ||
              serverErrorMessage.includes('Server processing limitation') ||
              serverErrorMessage.includes('Microsoft Word or compatible software') ||
              serverErrorMessage.includes('Office document processing not available')) {
            console.log('🔄 Both client and server processing failed due to limitations, throwing to allow other plugins');
            throw new Error(`RobustOffice plugin cannot process this file: ${serverErrorMessage}`);
          }

          // For actual errors, create fallback
          result = this.createUserFriendlyFallback(fileName, mimeType, clientError as Error);
        }
      }

      console.log(`✅ Robust Office Plugin: Completed in ${(performance.now() - startTime).toFixed(1)}ms`);
      return result;

    } catch (error) {
      console.error(`❌ Robust Office Plugin failed for ${fileName}:`, error);
      return this.createUserFriendlyFallback(fileName, mimeType, error as Error);
    }
  }

  private async processClientSide(
    blob: Blob,
    fileName: string,
    mimeType: string
  ): Promise<PreviewResult> {
    const extension = fileName.toLowerCase().split('.').pop();
    const docType = this.getDocumentType(fileName, mimeType);

    console.log(`🔧 Client-side processing for ${docType} file: ${fileName}`);

    if (extension === 'docx' || mimeType.includes('wordprocessingml')) {
      return await this.processDocxClientSide(blob, fileName, mimeType);
    } else if (extension === 'xlsx' || mimeType.includes('spreadsheetml')) {
      return await this.processExcelClientSide(blob, fileName, mimeType);
    } else if (extension === 'pptx' || mimeType.includes('presentationml')) {
      return await this.processPowerPointClientSide(blob, fileName, mimeType);
    } else if (extension === 'txt' || mimeType.includes('text/plain')) {
      return await this.processTextClientSide(blob, fileName, mimeType);
    } else if (extension === 'csv' || mimeType.includes('text/csv')) {
      return await this.processCsvClientSide(blob, fileName, mimeType);
    } else if (extension === 'json' || mimeType.includes('application/json')) {
      return await this.processJsonClientSide(blob, fileName, mimeType);
    } else if (extension === 'xml' || mimeType.includes('application/xml')) {
      return await this.processXmlClientSide(blob, fileName, mimeType);
    } else {
      throw new Error(`Unsupported file type for client-side processing: ${extension}`);
    }
  }

  private async processDocxClientSide(blob: Blob, fileName: string, mimeType: string): Promise<PreviewResult> {
    try {
      console.log('📝 Processing DOCX with mammoth.js...');

      // Dynamic import to handle potential missing dependency
      const mammoth = await import('mammoth').catch(() => {
        throw new Error('Mammoth.js library not available');
      });

      const arrayBuffer = await blob.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });

      if (result.value && result.value.trim()) {
        const wordCount = this.countWords(result.value);
        return {
          type: 'success',
          format: 'html',
          content: this.generateWordPreviewHTML(fileName, result.value, wordCount, blob.size),
          metadata: {
            title: fileName,
            pluginName: this.name,
            extractionMethod: 'mammoth.js',
            wordCount: wordCount,
            fileSize: blob.size,
            warnings: result.messages?.map(m => m.message) || []
          }
        };
      } else {
        throw new Error('No content extracted from DOCX file');
      }
    } catch (error) {
      console.warn('Mammoth processing failed, trying basic text extraction:', error);
      return await this.processDocxBasic(blob, fileName, mimeType);
    }
  }

  private async processExcelClientSide(blob: Blob, fileName: string, mimeType: string): Promise<PreviewResult> {
    try {
      console.log('📊 Processing Excel with xlsx.js...');

      const XLSX = await import('xlsx').catch(() => {
        throw new Error('XLSX library not available');
      });

      const arrayBuffer = await blob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const sheetNames = workbook.SheetNames;
      const firstSheet = workbook.Sheets[sheetNames[0]];
      const csvData = XLSX.utils.sheet_to_csv(firstSheet);
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

      return {
        type: 'success',
        format: 'html',
        content: this.generateExcelPreviewHTML(fileName, csvData, jsonData, sheetNames, blob.size),
        metadata: {
          title: fileName,
          pluginName: this.name,
          extractionMethod: 'xlsx.js',
          sheetCount: sheetNames.length,
          fileSize: blob.size
        }
      };
    } catch (error) {
      console.warn('XLSX processing failed:', error);
      throw new Error(`Excel processing failed: ${error.message}`);
    }
  }

  private async processPowerPointClientSide(blob: Blob, fileName: string, mimeType: string): Promise<PreviewResult> {
    // PowerPoint requires more complex processing, so we'll show a helpful message
    return {
      type: 'success',
      format: 'html',
      content: this.generatePowerPointPreviewHTML(fileName, blob.size),
      metadata: {
        title: fileName,
        pluginName: this.name,
        extractionMethod: 'client-side-info',
        fileSize: blob.size
      }
    };
  }

  private async processTextClientSide(blob: Blob, fileName: string, mimeType: string): Promise<PreviewResult> {
    const text = await blob.text();
    const wordCount = this.countWords(text);

    return {
      type: 'success',
      format: 'html',
      content: this.generateTextPreviewHTML(fileName, text, wordCount, blob.size),
      metadata: {
        title: fileName,
        pluginName: this.name,
        extractionMethod: 'text-reading',
        wordCount: wordCount,
        fileSize: blob.size
      }
    };
  }

  private async processCsvClientSide(blob: Blob, fileName: string, mimeType: string): Promise<PreviewResult> {
    const text = await blob.text();
    const lines = text.split('\n').filter(line => line.trim());
    const rows = lines.map(line => line.split(',').map(cell => cell.trim()));

    return {
      type: 'success',
      format: 'html',
      content: this.generateCsvPreviewHTML(fileName, rows, blob.size),
      metadata: {
        title: fileName,
        pluginName: this.name,
        extractionMethod: 'csv-parsing',
        rowCount: rows.length,
        fileSize: blob.size
      }
    };
  }

  private async processJsonClientSide(blob: Blob, fileName: string, mimeType: string): Promise<PreviewResult> {
    const text = await blob.text();
    const json = JSON.parse(text);

    return {
      type: 'success',
      format: 'html',
      content: this.generateJsonPreviewHTML(fileName, json, blob.size),
      metadata: {
        title: fileName,
        pluginName: this.name,
        extractionMethod: 'json-parsing',
        fileSize: blob.size
      }
    };
  }

  private async processXmlClientSide(blob: Blob, fileName: string, mimeType: string): Promise<PreviewResult> {
    const text = await blob.text();

    return {
      type: 'success',
      format: 'html',
      content: this.generateXmlPreviewHTML(fileName, text, blob.size),
      metadata: {
        title: fileName,
        pluginName: this.name,
        extractionMethod: 'xml-reading',
        fileSize: blob.size
      }
    };
  }

  private async processDocxBasic(blob: Blob, fileName: string, mimeType: string): Promise<PreviewResult> {
    // Basic DOCX processing without mammoth - extract some text if possible
    try {
      const JSZip = await import('jszip').catch(() => {
        throw new Error('JSZip library not available');
      });

      const zip = new JSZip.default();
      const zipContent = await zip.loadAsync(blob);

      // Try to extract document.xml
      const documentXml = zipContent.files['word/document.xml'];
      if (documentXml) {
        const xmlContent = await documentXml.async('text');
        const textMatches = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
        const extractedText = textMatches
          .map(match => match.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, ''))
          .join(' ')
          .trim();

        if (extractedText) {
          const wordCount = this.countWords(extractedText);
          return {
            type: 'success',
            format: 'html',
            content: this.generateBasicWordPreviewHTML(fileName, extractedText, wordCount, blob.size),
            metadata: {
              title: fileName,
              pluginName: this.name,
              extractionMethod: 'basic-xml-parsing',
              wordCount: wordCount,
              fileSize: blob.size
            }
          };
        }
      }

      throw new Error('No readable content found in DOCX');
    } catch (error) {
      throw new Error(`Basic DOCX processing failed: ${error.message}`);
    }
  }

  private async processWithServer(
    blob: Blob,
    fileName: string,
    mimeType: string
  ): Promise<PreviewResult> {
    try {
      console.log('🔄 Processing document:', { fileName, mimeType, size: blob.size });
      
      // Create FormData and append the blob directly
      const formData = new FormData();
      formData.append('file', blob, fileName);
      
      // Add metadata
      formData.append('mime_type', mimeType);
      formData.append('filename', fileName);

      // Custom fetch implementation to ensure proper binary handling
      const response = await fetch('/api/v1/documents/preview', {
        method: 'POST',
        headers: {
          // Let the browser set the Content-Type for FormData
          'Accept': 'application/json',
          // Add auth token if available
          'Authorization': `Bearer ${localStorage.getItem('access_token') || sessionStorage.getItem('access_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Preview generation failed:', errorText);
        throw new Error(`Preview generation failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('📊 Server preview result:', data);

      if (data.type === 'error' || data.type === 'processing_unavailable' || !data.preview) {
        const errorDetail = data.message || 'Server preview failed';
        console.error('Document preview failed:', errorDetail);

        // Check if this is a server processing error that should be handled by other plugins
        if (data.type === 'processing_unavailable' ||
            data.can_fallback === true ||
            errorDetail.includes('Microsoft Word or compatible software') ||
            errorDetail.includes('Office document processing not available') ||
            errorDetail.includes('requires Microsoft Word') ||
            errorDetail.includes('cannot be previewed') ||
            data.type === 'info') {
          console.log('🔄 Server returned processing limitation, throwing to allow other plugins to handle');
          throw new Error(`Server processing not available: ${errorDetail}`);
        }

        // For actual errors, return user-friendly fallback
        return this.createUserFriendlyFallback(fileName, mimeType, new Error(errorDetail));
      }

      // Convert server result to user-friendly display
      return this.convertServerResult(data, fileName, mimeType, blob.size);

    } catch (error) {
      console.error('❌ Server-side processing failed:', error);
      throw error;
    }
  }

  private convertServerResult(serverResult: any, fileName: string, mimeType: string, fileSize: number): PreviewResult {
    const docType = this.getDocumentType(fileName, mimeType);
    
    if (serverResult.type === 'text' && serverResult.preview) {
      // Successfully extracted text content
      return {
        type: 'success',
        format: 'html',
        content: this.generateOfficeDocumentPreviewHTML(fileName, docType, serverResult, fileSize),
        metadata: {
          title: fileName,
          pluginName: this.name,
          extractionMethod: 'server-side',
          serverProcessing: true,
          ...serverResult
        }
      };
    }

    if (serverResult.type === 'info' || serverResult.type === 'error' || serverResult.type === 'processing_unavailable') {
      // Check if this is a server limitation that other plugins should handle
      const message = serverResult.message || '';
      if (serverResult.type === 'processing_unavailable' ||
          serverResult.can_fallback === true ||
          message.includes('Microsoft Word or compatible software') ||
          message.includes('Office document processing not available') ||
          message.includes('requires Microsoft Word') ||
          message.includes('cannot be previewed')) {
        console.log('🔄 Server result indicates processing limitation, allowing other plugins to handle');
        throw new Error(`Server processing limitation: ${message}`);
      }

      // Server provided info message (file can't be previewed but is accessible)
      return {
        type: 'success',
        format: 'html',
        content: this.generateInfoDisplayHTML(fileName, docType, serverResult, fileSize),
        metadata: {
          title: fileName,
          pluginName: this.name,
          fallback: true,
          serverMessage: serverResult.message
        }
      };
    }

    // Default case - show generic document info
    return {
      type: 'success',
      format: 'html',
      content: this.generateGenericDocumentHTML(fileName, docType, fileSize),
      metadata: {
        title: fileName,
        pluginName: this.name,
        fallback: true
      }
    };
  }

  private generateOfficeDocumentPreviewHTML(fileName: string, docType: string, serverResult: any, fileSize: number): string {
    const icon = this.getDocumentIcon(docType);
    const preview = serverResult.preview || '';
    const wordCount = serverResult.word_count || 0;

    return `
      <div class="robust-office-preview">
        <style>
          .robust-office-preview {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f8f9fa;
            border-radius: 8px;
            overflow: hidden;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .office-header {
            background: linear-gradient(135deg, #0078d4 0%, #106ebe 100%);
            color: white;
            padding: 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          .office-icon {
            font-size: 2.5rem;
          }
          .office-title h3 {
            margin: 0;
            font-size: 1.3rem;
            font-weight: 600;
          }
          .office-subtitle {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-top: 0.25rem;
          }
          .office-stats {
            background: white;
            padding: 1rem 1.5rem;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            gap: 2rem;
            font-size: 0.9rem;
            color: #666;
          }
          .stat-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .office-content {
            flex: 1;
            padding: 1.5rem;
            background: white;
            overflow-y: auto;
            line-height: 1.6;
          }
          .content-preview {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 1.5rem;
            font-family: 'Segoe UI', system-ui, sans-serif;
            max-height: 400px;
            overflow-y: auto;
            line-height: 1.6;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }

          /* Enhanced styling for HTML content */
          .content-preview h1, .content-preview h2, .content-preview h3,
          .content-preview h4, .content-preview h5, .content-preview h6 {
            font-weight: bold;
            margin: 1.5rem 0 0.75rem 0;
            color: #1a202c;
            line-height: 1.3;
          }

          .content-preview h1 { font-size: 2em; margin-top: 0; }
          .content-preview h2 { font-size: 1.5em; }
          .content-preview h3 { font-size: 1.3em; }
          .content-preview h4 { font-size: 1.1em; }
          .content-preview h5 { font-size: 1em; }
          .content-preview h6 { font-size: 0.9em; }

          .content-preview p {
            margin: 0.75rem 0;
            text-align: inherit;
            line-height: 1.6;
          }

          .content-preview ul, .content-preview ol {
            margin: 1rem 0;
            padding-left: 2rem;
          }

          .content-preview li {
            margin: 0.25rem 0;
            line-height: 1.6;
          }

          .content-preview table {
            border-collapse: collapse;
            width: 100%;
            margin: 1rem 0;
            border: 1px solid #e2e8f0;
          }

          .content-preview table td, .content-preview table th {
            border: 1px solid #e2e8f0;
            padding: 8px 12px;
            text-align: left;
            vertical-align: top;
            line-height: 1.4;
          }

          .content-preview table th {
            background-color: #f8fafc;
            font-weight: bold;
          }

          .content-preview strong, .content-preview b {
            font-weight: bold;
          }

          .content-preview em, .content-preview i {
            font-style: italic;
          }

          .content-preview u {
            text-decoration: underline;
          }

          .content-preview img {
            max-width: 100%;
            height: auto;
            margin: 0.5rem 0;
          }

          /* Specific styling for HTML content from Mammoth.js */
          .html-content {
            white-space: normal !important;
            font-family: 'Segoe UI', system-ui, sans-serif !important;
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

        <div class="office-header">
          <div class="office-icon">${icon}</div>
          <div class="office-title">
            <h3>${this.escapeHtml(fileName)}</h3>
            <div class="office-subtitle">${this.capitalize(docType)} Document</div>
          </div>
          <div class="success-badge">✅ Processed</div>
        </div>

        <div class="office-stats">
          <div class="stat-item">
            <span>📄</span>
            <span>Type: ${this.capitalize(docType)}</span>
          </div>
          <div class="stat-item">
            <span>💾</span>
            <span>Size: ${this.formatFileSize(fileSize)}</span>
          </div>
          ${wordCount > 0 ? `
            <div class="stat-item">
              <span>📝</span>
              <span>Words: ${wordCount.toLocaleString()}</span>
            </div>
          ` : ''}
          <div class="stat-item">
            <span>🔧</span>
            <span>Processing: Server-side</span>
          </div>
        </div>

        <div class="office-content">
          <h4>📖 Document Preview</h4>
          <div class="content-preview">${this.escapeHtml(preview)}</div>

          <div style="margin-top: 1.5rem; padding: 1rem; background: #e3f2fd; border-radius: 6px; border-left: 4px solid #2196f3;">
            <strong>💡 For full document experience:</strong><br>
            Download this file to view it with the appropriate application.
            This will preserve all formatting, images, tables, and interactive elements.
          </div>
        </div>
      </div>
    `;
  }

  private generateInfoDisplayHTML(fileName: string, docType: string, serverResult: any, fileSize: number): string {
    const icon = this.getDocumentIcon(docType);
    const message = serverResult.message || 'This document cannot be fully previewed in the browser.';
    const suggestion = serverResult.suggestion || `Download to view with the appropriate application.`;

    return `
      <div class="robust-office-info">
        <style>
          .robust-office-info {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f8f9fa;
            border-radius: 8px;
            overflow: hidden;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .info-header {
            background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
            color: white;
            padding: 1.5rem;
            text-align: center;
          }
          .info-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
          }
          .info-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
          }
          .info-subtitle {
            opacity: 0.9;
          }
          .info-content {
            flex: 1;
            padding: 2rem;
            background: white;
            text-align: center;
          }
          .info-message {
            background: #fff3e0;
            border: 1px solid #ffcc02;
            border-radius: 8px;
            padding: 1.5rem;
            margin: 1.5rem 0;
            line-height: 1.6;
          }
          .download-suggestion {
            background: #e8f5e8;
            border: 1px solid #4caf50;
            border-radius: 8px;
            padding: 1.5rem;
            margin: 1.5rem 0;
          }
          .file-details {
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
          <div class="info-icon">${icon}</div>
          <div class="info-title">Document Preview</div>
          <div class="info-subtitle">${this.escapeHtml(fileName)}</div>
        </div>

        <div class="info-content">
          <div class="info-message">
            <strong>ℹ️ ${message}</strong>
          </div>

          <div class="file-details">
            <div class="detail-row">
              <span><strong>📄 File Name:</strong></span>
              <span>${this.escapeHtml(fileName)}</span>
            </div>
            <div class="detail-row">
              <span><strong>📁 Document Type:</strong></span>
              <span>${this.capitalize(docType)}</span>
            </div>
            <div class="detail-row">
              <span><strong>💾 File Size:</strong></span>
              <span>${this.formatFileSize(fileSize)}</span>
            </div>
            <div class="detail-row">
              <span><strong>🔧 Processing:</strong></span>
              <span>Server-side analysis</span>
            </div>
          </div>

          <div class="download-suggestion">
            <strong>💡 ${suggestion}</strong><br><br>
            For the complete document experience with all formatting, images, tables, and interactive features,
            please download this file and open it with the appropriate application.
          </div>
        </div>
      </div>
    `;
  }

  private generateGenericDocumentHTML(fileName: string, docType: string, fileSize: number): string {
    const icon = this.getDocumentIcon(docType);

    return `
      <div class="generic-document-preview">
        <style>
          .generic-document-preview {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 2rem;
            text-align: center;
            background: #f8f9fa;
            border-radius: 8px;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .generic-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }
          .generic-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #333;
            margin-bottom: 1rem;
          }
          .generic-content {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            margin: 1rem 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
        </style>

        <div class="generic-icon">${icon}</div>
        <h2 class="generic-title">${this.escapeHtml(fileName)}</h2>

        <div class="generic-content">
          <p><strong>${this.capitalize(docType)} Document</strong></p>
          <p>Size: ${this.formatFileSize(fileSize)}</p>
          <p>This document is ready for download and viewing.</p>

          <div style="margin-top: 1rem; padding: 1rem; background: #e3f2fd; border-radius: 6px;">
            <strong>📥 Download this file to:</strong><br>
            • View complete content with all formatting<br>
            • Access embedded images and media<br>
            • Use interactive features<br>
            • Edit and collaborate with others
          </div>
        </div>
      </div>
    `;
  }

  private createUserFriendlyFallback(fileName: string, mimeType: string, error: Error): PreviewResult {
    const docType = this.getDocumentType(fileName, mimeType);
    const icon = this.getDocumentIcon(docType);

    return {
      type: 'success', // Return success to show our custom error handling
      format: 'html',
      content: `
        <div class="document-error-fallback">
          <style>
            .document-error-fallback {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 2rem;
              text-align: center;
              background: #f8f9fa;
              border-radius: 8px;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: center;
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
              text-align: left;
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
          <h2 class="error-title">Preview Temporarily Unavailable</h2>

          <div class="error-content">
            <p><strong>${icon} ${this.escapeHtml(fileName)}</strong></p>
            <p>${this.capitalize(docType)} Document</p>

            <div class="recovery-section">
              <strong>✅ Document is accessible!</strong><br><br>
              This is a temporary preview issue. Your document is intact and can be downloaded normally.
              <br><br>
              <strong>What you can do:</strong><br>
              • Download the file to view it properly<br>
              • Try refreshing the page<br>
              • Contact support if the problem persists
            </div>
          </div>
        </div>
      `,
      metadata: {
        title: fileName,
        pluginName: this.name,
        fallback: true,
        originalError: error.message,
        documentType: docType
      }
    };
  }

  private getDocumentType(fileName: string, mimeType: string): string {
    const extension = fileName.toLowerCase().split('.').pop();

    if (mimeType.includes('wordprocessingml') || ['doc', 'docx'].includes(extension || '')) {
      return 'word';
    }
    if (mimeType.includes('spreadsheetml') || ['xls', 'xlsx'].includes(extension || '')) {
      return 'excel';
    }
    if (mimeType.includes('presentationml') || ['ppt', 'pptx'].includes(extension || '')) {
      return 'powerpoint';
    }
    if (mimeType.includes('text') || ['txt'].includes(extension || '')) {
      return 'text';
    }
    if (['csv'].includes(extension || '')) {
      return 'csv';
    }
    if (['json'].includes(extension || '')) {
      return 'json';
    }
    if (['xml'].includes(extension || '')) {
      return 'xml';
    }
    return 'document';
  }

  private getDocumentIcon(docType: string): string {
    const icons = {
      word: '📝',
      excel: '📊',
      powerpoint: '📋',
      text: '📄',
      csv: '📊',
      json: '📋',
      xml: '📄',
      document: '📄'
    };
    return icons[docType as keyof typeof icons] || icons.document;
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
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

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private generateWordPreviewHTML(fileName: string, htmlContent: string, wordCount: number, fileSize: number): string {
    const icon = this.getDocumentIcon('word');
    return `
      <div class="robust-office-preview">
        <style>
          .robust-office-preview {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f8f9fa;
            border-radius: 8px;
            overflow: hidden;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .office-header {
            background: linear-gradient(135deg, #2b5ce6 0%, #1e40af 100%);
            color: white;
            padding: 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          .office-icon {
            font-size: 2.5rem;
          }
          .office-title h3 {
            margin: 0;
            font-size: 1.3rem;
            font-weight: 600;
          }
          .office-subtitle {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-top: 0.25rem;
          }
          .office-stats {
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
          .office-content {
            flex: 1;
            padding: 1.5rem;
            background: white;
            overflow-y: auto;
            line-height: 1.6;
          }
          .content-preview {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 1.5rem;
            max-height: 400px;
            overflow-y: auto;
          }
          .success-badge {
            background: #10b981;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
          }
        </style>

        <div class="office-header">
          <div class="office-icon">${icon}</div>
          <div class="office-title">
            <h3>${this.escapeHtml(fileName)}</h3>
            <div class="office-subtitle">Word Document Preview</div>
          </div>
          <div class="success-badge">✅ Processed</div>
        </div>

        <div class="office-stats">
          <div class="stat-item">
            <span>📄</span>
            <span>Type: Word Document</span>
          </div>
          <div class="stat-item">
            <span>💾</span>
            <span>Size: ${this.formatFileSize(fileSize)}</span>
          </div>
          <div class="stat-item">
            <span>📝</span>
            <span>Words: ${wordCount.toLocaleString()}</span>
          </div>
          <div class="stat-item">
            <span>🔧</span>
            <span>Processing: Client-side</span>
          </div>
        </div>

        <div class="office-content">
          <h4>📖 Document Content</h4>
          <div class="content-preview html-content">${htmlContent}</div>
        </div>
      </div>
    `;
  }

  private generateBasicWordPreviewHTML(fileName: string, textContent: string, wordCount: number, fileSize: number): string {
    const icon = this.getDocumentIcon('word');
    return `
      <div class="robust-office-preview">
        <style>
          .robust-office-preview {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f8f9fa;
            border-radius: 8px;
            overflow: hidden;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .office-header {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            padding: 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          .office-icon {
            font-size: 2.5rem;
          }
          .office-title h3 {
            margin: 0;
            font-size: 1.3rem;
            font-weight: 600;
          }
          .office-subtitle {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-top: 0.25rem;
          }
          .office-stats {
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
          .office-content {
            flex: 1;
            padding: 1.5rem;
            background: white;
            overflow-y: auto;
            line-height: 1.6;
          }
          .content-preview {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 1.5rem;
            white-space: pre-wrap;
            font-family: system-ui, sans-serif;
            max-height: 400px;
            overflow-y: auto;
          }
          .warning-badge {
            background: #f59e0b;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
          }
        </style>

        <div class="office-header">
          <div class="office-icon">${icon}</div>
          <div class="office-title">
            <h3>${this.escapeHtml(fileName)}</h3>
            <div class="office-subtitle">Basic Text Extraction</div>
          </div>
          <div class="warning-badge">⚠️ Basic Mode</div>
        </div>

        <div class="office-stats">
          <div class="stat-item">
            <span>📄</span>
            <span>Type: Word Document</span>
          </div>
          <div class="stat-item">
            <span>💾</span>
            <span>Size: ${this.formatFileSize(fileSize)}</span>
          </div>
          <div class="stat-item">
            <span>📝</span>
            <span>Words: ${wordCount.toLocaleString()}</span>
          </div>
          <div class="stat-item">
            <span>🔧</span>
            <span>Mode: Basic extraction</span>
          </div>
        </div>

        <div class="office-content">
          <h4>📖 Extracted Text Content</h4>
          <div class="content-preview">${this.escapeHtml(textContent)}</div>

          <div style="margin-top: 1.5rem; padding: 1rem; background: #fef3c7; border-radius: 6px; border-left: 4px solid #f59e0b;">
            <strong>💡 Note:</strong> This is a basic text extraction. Some formatting, images, tables, and layout elements may not be visible.
            For the complete document experience, download and open in Microsoft Word.
          </div>
        </div>
      </div>
    `;
  }

  private generateExcelPreviewHTML(fileName: string, csvData: string, jsonData: any[], sheetNames: string[], fileSize: number): string {
    const icon = this.getDocumentIcon('excel');
    const rows = csvData.split('\n').filter(row => row.trim()).slice(0, 20); // Limit to 20 rows

    return `
      <div class="robust-office-preview">
        <style>
          .robust-office-preview {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f8f9fa;
            border-radius: 8px;
            overflow: hidden;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .office-header {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            color: white;
            padding: 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          .office-icon {
            font-size: 2.5rem;
          }
          .office-title h3 {
            margin: 0;
            font-size: 1.3rem;
            font-weight: 600;
          }
          .office-subtitle {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-top: 0.25rem;
          }
          .office-stats {
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
          .office-content {
            flex: 1;
            padding: 1.5rem;
            background: white;
            overflow-y: auto;
            line-height: 1.6;
          }
          .excel-table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
            font-size: 0.9rem;
          }
          .excel-table th,
          .excel-table td {
            border: 1px solid #e9ecef;
            padding: 0.5rem;
            text-align: left;
          }
          .excel-table th {
            background: #f8f9fa;
            font-weight: 600;
          }
          .excel-table tr:nth-child(even) {
            background: #f8f9fa;
          }
          .success-badge {
            background: #059669;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
          }
        </style>

        <div class="office-header">
          <div class="office-icon">${icon}</div>
          <div class="office-title">
            <h3>${this.escapeHtml(fileName)}</h3>
            <div class="office-subtitle">Excel Spreadsheet</div>
          </div>
          <div class="success-badge">✅ Processed</div>
        </div>

        <div class="office-stats">
          <div class="stat-item">
            <span>📊</span>
            <span>Type: Excel Spreadsheet</span>
          </div>
          <div class="stat-item">
            <span>💾</span>
            <span>Size: ${this.formatFileSize(fileSize)}</span>
          </div>
          <div class="stat-item">
            <span>📄</span>
            <span>Sheets: ${sheetNames.length}</span>
          </div>
          <div class="stat-item">
            <span>📝</span>
            <span>Rows: ${jsonData.length}</span>
          </div>
        </div>

        <div class="office-content">
          <h4>📊 Spreadsheet Data (Sheet: ${sheetNames[0]})</h4>
          <div style="overflow-x: auto;">
            <table class="excel-table">
              ${rows.map((row, index) => {
                const cells = row.split(',').map(cell => cell.trim());
                return `<tr>${cells.map(cell => `<${index === 0 ? 'th' : 'td'}>${this.escapeHtml(cell)}</${index === 0 ? 'th' : 'td'}>`).join('')}</tr>`;
              }).join('')}
            </table>
          </div>

          ${rows.length >= 20 ? '<p style="text-align: center; color: #666; font-size: 0.9rem;">Showing first 20 rows</p>' : ''}

          ${sheetNames.length > 1 ? `
            <div style="margin-top: 1.5rem; padding: 1rem; background: #e0f2fe; border-radius: 6px;">
              <strong>📄 Additional Sheets:</strong> ${sheetNames.slice(1).join(', ')}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  private generateTextPreviewHTML(fileName: string, textContent: string, wordCount: number, fileSize: number): string {
    const icon = this.getDocumentIcon('text');
    const lines = textContent.split('\n').length;

    return `
      <div class="robust-office-preview">
        <style>
          .robust-office-preview {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f8f9fa;
            border-radius: 8px;
            overflow: hidden;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .office-header {
            background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
            color: white;
            padding: 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          .office-icon {
            font-size: 2.5rem;
          }
          .office-title h3 {
            margin: 0;
            font-size: 1.3rem;
            font-weight: 600;
          }
          .office-subtitle {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-top: 0.25rem;
          }
          .office-stats {
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
          .office-content {
            flex: 1;
            padding: 1.5rem;
            background: white;
            overflow-y: auto;
            line-height: 1.6;
          }
          .content-preview {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 1.5rem;
            white-space: pre-wrap;
            font-family: 'Courier New', monospace;
            max-height: 400px;
            overflow-y: auto;
            font-size: 0.9rem;
          }
          .success-badge {
            background: #6b7280;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
          }
        </style>

        <div class="office-header">
          <div class="office-icon">${icon}</div>
          <div class="office-title">
            <h3>${this.escapeHtml(fileName)}</h3>
            <div class="office-subtitle">Text File</div>
          </div>
          <div class="success-badge">✅ Processed</div>
        </div>

        <div class="office-stats">
          <div class="stat-item">
            <span>📃</span>
            <span>Type: Text File</span>
          </div>
          <div class="stat-item">
            <span>💾</span>
            <span>Size: ${this.formatFileSize(fileSize)}</span>
          </div>
          <div class="stat-item">
            <span>📝</span>
            <span>Words: ${wordCount.toLocaleString()}</span>
          </div>
          <div class="stat-item">
            <span>📄</span>
            <span>Lines: ${lines}</span>
          </div>
        </div>

        <div class="office-content">
          <h4>📖 Text Content</h4>
          <div class="content-preview">${this.escapeHtml(textContent)}</div>
        </div>
      </div>
    `;
  }

  private generateCsvPreviewHTML(fileName: string, rows: string[][], fileSize: number): string {
    const icon = this.getDocumentIcon('csv');
    const displayRows = rows.slice(0, 20); // Show first 20 rows

    return `
      <div class="robust-office-preview">
        <style>
          .robust-office-preview {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f8f9fa;
            border-radius: 8px;
            overflow: hidden;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .office-header {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            color: white;
            padding: 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          .office-icon {
            font-size: 2.5rem;
          }
          .office-title h3 {
            margin: 0;
            font-size: 1.3rem;
            font-weight: 600;
          }
          .office-subtitle {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-top: 0.25rem;
          }
          .office-stats {
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
          .office-content {
            flex: 1;
            padding: 1.5rem;
            background: white;
            overflow-y: auto;
            line-height: 1.6;
          }
          .csv-table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
            font-size: 0.9rem;
          }
          .csv-table th,
          .csv-table td {
            border: 1px solid #e9ecef;
            padding: 0.5rem;
            text-align: left;
          }
          .csv-table th {
            background: #f8f9fa;
            font-weight: 600;
          }
          .csv-table tr:nth-child(even) {
            background: #f8f9fa;
          }
          .success-badge {
            background: #059669;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
          }
        </style>

        <div class="office-header">
          <div class="office-icon">${icon}</div>
          <div class="office-title">
            <h3>${this.escapeHtml(fileName)}</h3>
            <div class="office-subtitle">CSV Data</div>
          </div>
          <div class="success-badge">✅ Processed</div>
        </div>

        <div class="office-stats">
          <div class="stat-item">
            <span>📊</span>
            <span>Type: CSV File</span>
          </div>
          <div class="stat-item">
            <span>💾</span>
            <span>Size: ${this.formatFileSize(fileSize)}</span>
          </div>
          <div class="stat-item">
            <span>📄</span>
            <span>Rows: ${rows.length}</span>
          </div>
          <div class="stat-item">
            <span>📊</span>
            <span>Columns: ${rows[0]?.length || 0}</span>
          </div>
        </div>

        <div class="office-content">
          <h4>📊 CSV Data</h4>
          <div style="overflow-x: auto;">
            <table class="csv-table">
              ${displayRows.map((row, index) => {
                return `<tr>${row.map(cell => `<${index === 0 ? 'th' : 'td'}>${this.escapeHtml(cell)}</${index === 0 ? 'th' : 'td'}>`).join('')}</tr>`;
              }).join('')}
            </table>
          </div>

          ${rows.length > 20 ? '<p style="text-align: center; color: #666; font-size: 0.9rem;">Showing first 20 rows</p>' : ''}
        </div>
      </div>
    `;
  }

  private generateJsonPreviewHTML(fileName: string, jsonData: any, fileSize: number): string {
    const icon = this.getDocumentIcon('json');
    const jsonString = JSON.stringify(jsonData, null, 2);
    const lines = jsonString.split('\n').length;

    return `
      <div class="robust-office-preview">
        <style>
          .robust-office-preview {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f8f9fa;
            border-radius: 8px;
            overflow: hidden;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .office-header {
            background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
            color: white;
            padding: 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          .office-icon {
            font-size: 2.5rem;
          }
          .office-title h3 {
            margin: 0;
            font-size: 1.3rem;
            font-weight: 600;
          }
          .office-subtitle {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-top: 0.25rem;
          }
          .office-stats {
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
          .office-content {
            flex: 1;
            padding: 1.5rem;
            background: white;
            overflow-y: auto;
            line-height: 1.6;
          }
          .json-preview {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 1.5rem;
            white-space: pre-wrap;
            font-family: 'Courier New', monospace;
            max-height: 400px;
            overflow-y: auto;
            font-size: 0.9rem;
          }
          .success-badge {
            background: #7c3aed;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
          }
        </style>

        <div class="office-header">
          <div class="office-icon">${icon}</div>
          <div class="office-title">
            <h3>${this.escapeHtml(fileName)}</h3>
            <div class="office-subtitle">JSON Data</div>
          </div>
          <div class="success-badge">✅ Processed</div>
        </div>

        <div class="office-stats">
          <div class="stat-item">
            <span>📋</span>
            <span>Type: JSON File</span>
          </div>
          <div class="stat-item">
            <span>💾</span>
            <span>Size: ${this.formatFileSize(fileSize)}</span>
          </div>
          <div class="stat-item">
            <span>📄</span>
            <span>Lines: ${lines}</span>
          </div>
          <div class="stat-item">
            <span>🔧</span>
            <span>Format: Parsed & Formatted</span>
          </div>
        </div>

        <div class="office-content">
          <h4>📋 JSON Data</h4>
          <div class="json-preview">${this.escapeHtml(jsonString)}</div>
        </div>
      </div>
    `;
  }

  private generateXmlPreviewHTML(fileName: string, xmlContent: string, fileSize: number): string {
    const icon = this.getDocumentIcon('xml');
    const lines = xmlContent.split('\n').length;
    const preview = xmlContent.length > 5000 ? xmlContent.substring(0, 5000) + '\n\n... (content truncated)' : xmlContent;

    return `
      <div class="robust-office-preview">
        <style>
          .robust-office-preview {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f8f9fa;
            border-radius: 8px;
            overflow: hidden;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .office-header {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            color: white;
            padding: 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          .office-icon {
            font-size: 2.5rem;
          }
          .office-title h3 {
            margin: 0;
            font-size: 1.3rem;
            font-weight: 600;
          }
          .office-subtitle {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-top: 0.25rem;
          }
          .office-stats {
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
          .office-content {
            flex: 1;
            padding: 1.5rem;
            background: white;
            overflow-y: auto;
            line-height: 1.6;
          }
          .xml-preview {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 1.5rem;
            white-space: pre-wrap;
            font-family: 'Courier New', monospace;
            max-height: 400px;
            overflow-y: auto;
            font-size: 0.9rem;
          }
          .success-badge {
            background: #dc2626;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
          }
        </style>

        <div class="office-header">
          <div class="office-icon">${icon}</div>
          <div class="office-title">
            <h3>${this.escapeHtml(fileName)}</h3>
            <div class="office-subtitle">XML Document</div>
          </div>
          <div class="success-badge">✅ Processed</div>
        </div>

        <div class="office-stats">
          <div class="stat-item">
            <span>📄</span>
            <span>Type: XML Document</span>
          </div>
          <div class="stat-item">
            <span>💾</span>
            <span>Size: ${this.formatFileSize(fileSize)}</span>
          </div>
          <div class="stat-item">
            <span>📄</span>
            <span>Lines: ${lines}</span>
          </div>
          <div class="stat-item">
            <span>🔧</span>
            <span>Mode: Raw XML</span>
          </div>
        </div>

        <div class="office-content">
          <h4>📄 XML Content</h4>
          <div class="xml-preview">${this.escapeHtml(preview)}</div>
        </div>
      </div>
    `;
  }

  private generatePowerPointPreviewHTML(fileName: string, fileSize: number): string {
    const icon = this.getDocumentIcon('powerpoint');

    return `
      <div class="robust-office-preview">
        <style>
          .robust-office-preview {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f8f9fa;
            border-radius: 8px;
            overflow: hidden;
            height: 100%;
            display: flex;
            flex-direction: column;
          }
          .office-header {
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            color: white;
            padding: 1.5rem;
            display: flex;
            align-items: center;
            gap: 1rem;
          }
          .office-icon {
            font-size: 2.5rem;
          }
          .office-title h3 {
            margin: 0;
            font-size: 1.3rem;
            font-weight: 600;
          }
          .office-subtitle {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-top: 0.25rem;
          }
          .office-stats {
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
          .office-content {
            flex: 1;
            padding: 1.5rem;
            background: white;
            overflow-y: auto;
            line-height: 1.6;
          }
          .info-badge {
            background: #2563eb;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
          }
          .info-box {
            background: #dbeafe;
            border: 1px solid #3b82f6;
            border-radius: 8px;
            padding: 1.5rem;
            margin: 1rem 0;
          }
        </style>

        <div class="office-header">
          <div class="office-icon">${icon}</div>
          <div class="office-title">
            <h3>${this.escapeHtml(fileName)}</h3>
            <div class="office-subtitle">PowerPoint Presentation</div>
          </div>
          <div class="info-badge">ℹ️ Info</div>
        </div>

        <div class="office-stats">
          <div class="stat-item">
            <span>📋</span>
            <span>Type: PowerPoint</span>
          </div>
          <div class="stat-item">
            <span>💾</span>
            <span>Size: ${this.formatFileSize(fileSize)}</span>
          </div>
          <div class="stat-item">
            <span>🔧</span>
            <span>Status: Available for download</span>
          </div>
        </div>

        <div class="office-content">
          <div class="info-box">
            <h4 style="color: #1e40af; margin-top: 0;">📋 PowerPoint Presentation</h4>
            <p style="color: #1e40af;">This PowerPoint presentation is ready for download. PowerPoint files contain slides with complex layouts, animations, and multimedia content that are best viewed in their native application.</p>

            <h5 style="color: #1e40af;">💡 To view this presentation:</h5>
            <ul style="color: #1e40af;">
              <li>Download the file to your device</li>
              <li>Open with Microsoft PowerPoint or compatible software</li>
              <li>Use PowerPoint Online for browser-based viewing</li>
              <li>Convert to PDF for basic preview support</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }
}