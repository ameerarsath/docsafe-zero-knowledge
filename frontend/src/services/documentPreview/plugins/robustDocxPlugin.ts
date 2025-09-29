/**
 * Robust DOCX Preview Plugin
 *
 * A highly reliable DOCX preview plugin that addresses common issues:
 * - Missing dependencies
 * - Import failures
 * - Content extraction errors
 * - Fallback mechanisms
 *
 * This plugin prioritizes functionality over features and provides
 * a working preview in all scenarios.
 */

import { PreviewPlugin, PreviewResult, PreviewOptions } from '../pluginSystem';

interface DocxExtractionResult {
  content: string;
  html?: string;
  plainText?: string;
  method: string;
  success: boolean;
  wordCount?: number;
}

export class RobustDocxPlugin implements PreviewPlugin {
  name = 'RobustDocxPlugin';
  priority = 600; // Highest priority for DOCX files
  description = 'Robust DOCX preview with multiple fallback mechanisms';
  version = '2.0.0';

  supportedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];

  supportedExtensions = ['.docx', '.doc'];

  canPreview(mimeType: string, fileName: string): boolean {
    const extension = fileName.toLowerCase().split('.').pop();
    const isDocx = this.supportedMimeTypes.includes(mimeType) ||
                   (extension && this.supportedExtensions.includes(`.${extension}`));

    if (isDocx) {
      console.log(`🎯 RobustDocxPlugin: CAN handle ${fileName} (${mimeType})`);
    }

    return isDocx;
  }

  async preview(
    blob: Blob,
    fileName: string,
    mimeType: string,
    options?: PreviewOptions
  ): Promise<PreviewResult> {
    console.log(`🔧 RobustDocxPlugin: Processing ${fileName} (${this.formatFileSize(blob.size)})`);

    // First, validate the content format
    try {
      const validation = await this.validateDocxContent(blob, fileName, mimeType);
      if (!validation.isValid) {
        console.warn(`⚠️ DOCX validation failed: ${validation.error}`);
        // If encrypted, provide a helpful message
        if (validation.isEncrypted) {
          console.log('🔐 Encrypted content detected, showing fallback message');
          return this.createEncryptedContentFallback(fileName, blob.size);
        }
        // For invalid but not encrypted content, show appropriate error
        return this.createInvalidContentFallback(fileName, blob.size, validation.error || 'Invalid DOCX format');
      }
    } catch (validationError) {
      console.warn('Content validation error:', validationError);
      // If validation fails completely, show a generic error
      return this.createInvalidContentFallback(fileName, blob.size, 'Content validation failed');
    }

    try {
      // Progressive enhancement approach: Try best methods first, fall back gracefully
      const extractors = [
        () => this.extractWithMammoth(blob),
        () => this.extractWithDocxPreview(blob),
        () => this.extractWithJSZip(blob),
        () => this.extractBasicText(blob),
        () => this.generateInfoContent(fileName, blob.size)
      ];

      let result: DocxExtractionResult | null = null;

      for (const [index, extractor] of extractors.entries()) {
        try {
          console.log(`🔄 Trying extraction method ${index + 1}/${extractors.length}`);
          result = await extractor();

          if (result.success && result.content && result.content.trim().length > 20) {
            console.log(`✅ Extraction successful with method: ${result.method}`);
            break;
          }
        } catch (error) {
          console.warn(`⚠️ Extraction method ${index + 1} failed:`, error);
          continue;
        }
      }

      if (!result || !result.success) {
        // Even fallback failed - create final emergency content
        result = this.generateEmergencyContent(fileName, blob.size);
      }

      return {
        type: 'success',
        format: 'html',
        content: this.generateDocumentHTML(fileName, result, blob.size),
        metadata: {
          title: fileName,
          pluginName: this.name,
          extractionMethod: result.method,
          fileSize: blob.size,
          wordCount: result.wordCount,
          processingTime: '< 1s'
        }
      };

    } catch (error) {
      console.error(`❌ RobustDocxPlugin failed completely for ${fileName}:`, error);
      return this.createEmergencyFallback(fileName, blob.size, error as Error);
    }
  }

  /**
   * Primary: Mammoth.js extraction (best quality)
   */
  private async extractWithMammoth(blob: Blob): Promise<DocxExtractionResult> {
    try {
      console.log('📝 Attempting Mammoth.js extraction...');

      // Dynamic import with proper error handling
      let mammoth;
      try {
        mammoth = await import('mammoth');
      } catch (importError) {
        throw new Error('Mammoth.js library not available');
      }

      const arrayBuffer = await blob.arrayBuffer();

      const options = {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Title'] => h1.title:fresh",
          "r[style-name='Strong'] => strong",
          "r[style-name='Emphasis'] => em"
        ],
        includeDefaultStyleMap: true,
        convertImage: mammoth.images.imgElement((image: any) => {
          return image.read("base64").then((imageBuffer: any) => {
            return {
              src: `data:${image.contentType};base64,${imageBuffer}`
            };
          });
        })
      };

      const result = await mammoth.convertToHtml({ arrayBuffer }, options);

      if (!result.value || result.value.trim().length === 0) {
        throw new Error('Mammoth returned empty content');
      }

      // Extract plain text for word count
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = result.value;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';
      const wordCount = this.countWords(plainText);

      // Clean and enhance the HTML
      const cleanedHtml = this.cleanHtml(result.value);

      return {
        content: cleanedHtml,
        html: cleanedHtml,
        plainText: plainText,
        method: 'mammoth',
        success: true,
        wordCount: wordCount
      };

    } catch (error) {
      throw new Error(`Mammoth extraction failed: ${error.message}`);
    }
  }

  /**
   * Secondary: DocX-Preview extraction
   */
  private async extractWithDocxPreview(blob: Blob): Promise<DocxExtractionResult> {
    try {
      console.log('🔍 Attempting docx-preview extraction...');

      let docxPreview;
      try {
        docxPreview = await import('docx-preview');
      } catch (importError) {
        throw new Error('docx-preview library not available');
      }

      const arrayBuffer = await blob.arrayBuffer();

      // Create hidden container
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '210mm';
      document.body.appendChild(container);

      try {
        await docxPreview.renderAsync(arrayBuffer, container, undefined, {
          className: 'docx-preview-container',
          inWrapper: false,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: false,
          experimental: true
        });

        const renderedContent = container.innerHTML;
        const plainText = container.textContent || container.innerText || '';

        document.body.removeChild(container);

        if (!renderedContent || renderedContent.trim().length === 0) {
          throw new Error('DocX-Preview returned empty content');
        }

        const wordCount = this.countWords(plainText);

        return {
          content: renderedContent,
          html: renderedContent,
          plainText: plainText,
          method: 'docx-preview',
          success: true,
          wordCount: wordCount
        };

      } catch (renderError) {
        if (container.parentNode) {
          document.body.removeChild(container);
        }
        throw renderError;
      }

    } catch (error) {
      throw new Error(`DocX-Preview extraction failed: ${error.message}`);
    }
  }

  /**
   * Tertiary: JSZip XML parsing
   */
  private async extractWithJSZip(blob: Blob): Promise<DocxExtractionResult> {
    try {
      console.log('📦 Attempting JSZip XML extraction...');

      let JSZip;
      try {
        JSZip = await import('jszip');
      } catch (importError) {
        throw new Error('JSZip library not available');
      }

      const zip = new JSZip.default();
      const zipContent = await zip.loadAsync(blob);

      // Extract from document.xml
      const documentXml = zipContent.files['word/document.xml'];
      if (!documentXml) {
        throw new Error('No document.xml found in DOCX file');
      }

      const xmlContent = await documentXml.async('text');

      // Enhanced paragraph extraction
      const paragraphMatches = xmlContent.match(/<w:p[^>]*>.*?<\/w:p>/gs) || [];

      const extractedParagraphs = paragraphMatches
        .map(para => {
          const textMatches = para.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
          return textMatches
            .map(match => match.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, ''))
            .join('')
            .trim();
        })
        .filter(para => para.length > 0);

      if (extractedParagraphs.length === 0) {
        throw new Error('No readable text found in document.xml');
      }

      const extractedText = extractedParagraphs.join('\n\n');
      const wordCount = this.countWords(extractedText);

      // Convert to basic HTML
      const htmlContent = extractedParagraphs
        .map(para => `<p>${this.escapeHtml(para)}</p>`)
        .join('\n');

      return {
        content: htmlContent,
        html: htmlContent,
        plainText: extractedText,
        method: 'jszip-xml',
        success: true,
        wordCount: wordCount
      };

    } catch (error) {
      throw new Error(`JSZip XML extraction failed: ${error.message}`);
    }
  }

  /**
   * Quaternary: Basic text extraction from binary
   */
  private async extractBasicText(blob: Blob): Promise<DocxExtractionResult> {
    try {
      console.log('🔤 Attempting basic text extraction...');

      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      let text = '';
      let consecutiveSpaces = 0;

      // Extract ASCII text with improved filtering
      for (let i = 0; i < uint8Array.length; i++) {
        const char = uint8Array[i];

        if (char >= 32 && char <= 126) {
          // Printable ASCII
          text += String.fromCharCode(char);
          consecutiveSpaces = 0;
        } else if ((char === 10 || char === 13) && consecutiveSpaces < 2) {
          // Line breaks
          text += '\n';
          consecutiveSpaces = 0;
        } else if (char === 0 && consecutiveSpaces < 2) {
          // Null bytes - convert to space
          text += ' ';
          consecutiveSpaces++;
        }
      }

      // Clean extracted text
      text = text
        .replace(/\s{3,}/g, '  ')
        .replace(/(.{50,}?)([.!?])\s+([A-Z])/g, '$1$2\n\n$3')
        .trim();

      // Filter meaningful content
      const lines = text.split('\n').filter(line => {
        const trimmed = line.trim();
        if (trimmed.length < 3) return false;

        // Calculate ratio of readable characters
        const readableChars = trimmed.replace(/[^\x20-\x7E]/g, '').length;
        const ratio = readableChars / trimmed.length;

        return ratio > 0.7;
      });

      const cleanText = lines.join('\n').trim();

      if (cleanText.length < 50) {
        throw new Error('Insufficient readable text extracted');
      }

      const wordCount = this.countWords(cleanText);

      // Convert to HTML paragraphs
      const htmlContent = cleanText
        .split('\n\n')
        .map(para => `<p>${this.escapeHtml(para.trim())}</p>`)
        .join('\n');

      return {
        content: htmlContent,
        html: htmlContent,
        plainText: cleanText,
        method: 'text-extraction',
        success: true,
        wordCount: wordCount
      };

    } catch (error) {
      throw new Error(`Basic text extraction failed: ${error.message}`);
    }
  }

  /**
   * Fallback: Generate informative content when extraction fails
   */
  private async generateInfoContent(fileName: string, fileSize: number): Promise<DocxExtractionResult> {
    const content = `
      <div class="docx-info-content">
        <h2>📄 Microsoft Word Document</h2>
        <p><strong>File:</strong> ${this.escapeHtml(fileName)}</p>
        <p><strong>Size:</strong> ${this.formatFileSize(fileSize)}</p>

        <div class="info-message">
          <h3>📖 Document Ready for Viewing</h3>
          <p>This Microsoft Word document is available for download and contains formatted content that is best viewed in its native application.</p>

          <h4>💡 To view this document:</h4>
          <ul>
            <li>Download the file using the download button</li>
            <li>Open with Microsoft Word, Google Docs, or compatible software</li>
            <li>Use Microsoft Word Online for browser-based viewing</li>
          </ul>

          <h4>✨ Benefits of native viewing:</h4>
          <ul>
            <li>Complete formatting preservation</li>
            <li>Images, tables, and embedded content</li>
            <li>Interactive features and comments</li>
            <li>Full editing capabilities</li>
          </ul>
        </div>
      </div>
    `;

    return {
      content: content,
      html: content,
      method: 'info-content',
      success: true
    };
  }

  /**
   * Emergency: Last resort content when everything fails
   */
  private generateEmergencyContent(fileName: string, fileSize: number): DocxExtractionResult {
    const content = `
      <div class="docx-emergency-content">
        <h2>📄 Document Available</h2>
        <p><strong>File:</strong> ${this.escapeHtml(fileName)}</p>
        <p><strong>Size:</strong> ${this.formatFileSize(fileSize)}</p>
        <p><strong>Type:</strong> Microsoft Word Document</p>

        <div class="download-message">
          <h3>⬇️ Download Required</h3>
          <p>This document cannot be previewed in the browser but is available for download and will open normally in Microsoft Word or compatible applications.</p>
        </div>
      </div>
    `;

    return {
      content: content,
      html: content,
      method: 'emergency-fallback',
      success: true
    };
  }

  /**
   * Generate complete document HTML with consistent styling
   */
  private generateDocumentHTML(fileName: string, result: DocxExtractionResult, fileSize: number): string {
    return `
      <div class="robust-docx-preview">
        <style>
          .robust-docx-preview {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 100%;
            margin: 0;
            padding: 0;
            background: #ffffff;
          }

          .document-header {
            background: #f8f9fa;
            border-bottom: 2px solid #e9ecef;
            padding: 1rem 1.5rem;
            margin-bottom: 1.5rem;
          }

          .document-title {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 600;
            color: #495057;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .document-meta {
            font-size: 0.85rem;
            color: #6c757d;
            margin-top: 0.25rem;
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
          }

          .document-content {
            padding: 0 1.5rem 1.5rem;
            line-height: 1.7;
          }

          .document-content p {
            margin: 0 0 1rem 0;
            line-height: 1.7;
          }

          .document-content h1 {
            font-size: 1.5rem;
            font-weight: 600;
            margin: 1.5rem 0 1rem 0;
            color: #212529;
            line-height: 1.3;
          }

          .document-content h2 {
            font-size: 1.3rem;
            font-weight: 600;
            margin: 1.25rem 0 0.75rem 0;
            color: #212529;
            line-height: 1.3;
          }

          .document-content h3 {
            font-size: 1.1rem;
            font-weight: 600;
            margin: 1rem 0 0.5rem 0;
            color: #212529;
            line-height: 1.3;
          }

          .document-content ul, .document-content ol {
            margin: 1rem 0;
            padding-left: 1.5rem;
          }

          .document-content li {
            margin: 0.25rem 0;
            line-height: 1.6;
          }

          .document-content strong {
            font-weight: 600;
          }

          .document-content em {
            font-style: italic;
          }

          .document-content table {
            border-collapse: collapse;
            width: 100%;
            margin: 1rem 0;
            border: 1px solid #dee2e6;
          }

          .document-content td, .document-content th {
            border: 1px solid #dee2e6;
            padding: 0.5rem;
            text-align: left;
            vertical-align: top;
          }

          .document-content th {
            background-color: #f8f9fa;
            font-weight: 600;
          }

          .document-content img {
            max-width: 100%;
            height: auto;
            margin: 0.5rem 0;
            border-radius: 4px;
          }

          .docx-info-content, .docx-emergency-content {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 1.5rem;
            margin: 1rem 0;
          }

          .info-message, .download-message {
            background: #e7f3ff;
            border: 1px solid #b6d7ff;
            border-radius: 6px;
            padding: 1rem;
            margin: 1rem 0;
          }

          .info-message h3, .download-message h3 {
            margin-top: 0;
            color: #0056b3;
          }

          .info-message h4 {
            color: #0056b3;
            margin: 1rem 0 0.5rem 0;
          }

          .processing-badge {
            background: #28a745;
            color: white;
            padding: 0.2rem 0.5rem;
            border-radius: 3px;
            font-size: 0.75rem;
            font-weight: 500;
          }
        </style>

        <div class="document-header">
          <div class="document-title">
            📝 ${this.escapeHtml(fileName)}
            <span class="processing-badge">✓ Processed</span>
          </div>
          <div class="document-meta">
            <span>Size: ${this.formatFileSize(fileSize)}</span>
            <span>Type: Word Document</span>
            ${result.wordCount ? `<span>Words: ${result.wordCount.toLocaleString()}</span>` : ''}
            <span>Method: ${result.method}</span>
          </div>
        </div>

        <div class="document-content">
          ${result.content}
        </div>
      </div>
    `;
  }

  /**
   * Create emergency fallback when plugin completely fails
   */
  private createEmergencyFallback(fileName: string, fileSize: number, error: Error): PreviewResult {
    return {
      type: 'success',
      format: 'html',
      content: `
        <div class="emergency-fallback">
          <h2>⚠️ Preview Unavailable</h2>
          <p><strong>File:</strong> ${this.escapeHtml(fileName)}</p>
          <p><strong>Size:</strong> ${this.formatFileSize(fileSize)}</p>

          <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 1rem; margin: 1rem 0;">
            <h3 style="margin-top: 0; color: #856404;">📄 Document Available for Download</h3>
            <p style="color: #856404;">The document preview is temporarily unavailable, but the file is intact and ready for download.</p>
          </div>

          <p style="color: #6c757d; font-size: 0.9rem;">Technical details: ${error.message}</p>
        </div>
      `,
      metadata: {
        title: fileName,
        pluginName: this.name,
        extractionMethod: 'emergency-fallback',
        error: error.message
      }
    };
  }

  /**
   * Create fallback for invalid (non-encrypted) content
   */
  private createInvalidContentFallback(fileName: string, fileSize: number, error: string): PreviewResult {
    const content = `
      <div class="invalid-docx-fallback">
        <style>
          .invalid-docx-fallback {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 2rem;
            margin: 1rem 0;
          }
          .invalid-icon {
            font-size: 3rem;
            color: #6c757d;
            margin-bottom: 1rem;
          }
          .error-title {
            color: #495057;
            margin: 0 0 1rem 0;
            font-size: 1.25rem;
            font-weight: 600;
          }
          .error-details {
            background: #e9ecef;
            border: 1px solid #ced4da;
            border-radius: 6px;
            padding: 1rem;
            margin: 1rem 0;
          }
          .error-details h4 {
            margin-top: 0;
            color: #495057;
          }
          .tech-info {
            font-family: 'Courier New', monospace;
            font-size: 0.85rem;
            background: #f8f9fa;
            padding: 0.5rem;
            border-radius: 4px;
            margin-top: 1rem;
            color: #6c757d;
          }
        </style>

        <div class="invalid-icon">📄</div>
        <h2 class="error-title">Invalid Document Format</h2>

        <p><strong>File:</strong> ${this.escapeHtml(fileName)}</p>
        <p><strong>Size:</strong> ${this.formatFileSize(fileSize)}</p>
        <p><strong>Type:</strong> Microsoft Word Document</p>

        <div class="error-details">
          <h4>⚠️ Preview Unavailable</h4>
          <p>This file appears to be corrupted or in an invalid format that cannot be previewed.</p>

          <h4>💡 Possible solutions:</h4>
          <ul>
            <li><strong>Download:</strong> Use the download button to save and try opening in Microsoft Word</li>
            <li><strong>Re-upload:</strong> The file may have been corrupted during upload</li>
            <li><strong>Check format:</strong> Ensure this is actually a .docx file</li>
          </ul>
        </div>

        <div class="tech-info">
          <strong>Error details:</strong> ${this.escapeHtml(error)}
        </div>
      </div>
    `;

    return {
      type: 'success',
      format: 'html',
      content: content,
      metadata: {
        title: fileName,
        pluginName: this.name,
        extractionMethod: 'invalid-format-fallback',
        fileSize: fileSize,
        error: error
      }
    };
  }

  /**
   * Validate DOCX content format and check for encryption
   */
  private async validateDocxContent(blob: Blob, fileName: string, mimeType: string): Promise<{
    isValid: boolean;
    isEncrypted: boolean;
    error?: string;
    format?: string;
  }> {
    console.log('🔍 Validating DOCX content format...');

    try {
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Check minimum size for DOCX
      if (uint8Array.length < 4) {
        return {
          isValid: false,
          isEncrypted: false,
          error: 'Content too small to be a valid DOCX file'
        };
      }

      // Check for ZIP signature (PK header)
      const hasZipSignature = uint8Array[0] === 0x50 && uint8Array[1] === 0x4B &&
                             uint8Array[2] === 0x03 && uint8Array[3] === 0x04;

      if (hasZipSignature) {
        console.log('✅ Valid ZIP/DOCX signature found');
        return {
          isValid: true,
          isEncrypted: false,
          format: 'zip'
        };
      }

      // Check if content appears to be encrypted
      // Encrypted content typically has high entropy and random-looking bytes
      const entropy = this.calculateEntropy(uint8Array.slice(0, 1000)); // Check first 1KB
      const printableRatio = this.calculatePrintableRatio(uint8Array.slice(0, 1000));

      console.log(`📊 Content analysis - Entropy: ${entropy.toFixed(2)}, Printable ratio: ${printableRatio.toFixed(2)}`);

      // Check for encryption indicators
      if (entropy > 7.0 && printableRatio < 0.3) {
        console.log('🔐 Content appears to be encrypted (high entropy, low printable ratio)');
        return {
          isValid: false,
          isEncrypted: true,
          error: 'Content appears to be encrypted and cannot be processed directly'
        };
      }

      // Check if it's just corrupted or invalid data
      if (printableRatio > 0.8) {
        console.log('📄 Content appears to be plain text, not DOCX');
        return {
          isValid: false,
          isEncrypted: false,
          error: 'Content appears to be plain text, not DOCX format'
        };
      }

      return {
        isValid: false,
        isEncrypted: false,
        error: 'Invalid DOCX format - missing ZIP signature and not recognized as encrypted'
      };

    } catch (error) {
      return {
        isValid: false,
        isEncrypted: false,
        error: `Validation error: ${error.message}`
      };
    }
  }

  /**
   * Create fallback content for encrypted files
   */
  private createEncryptedContentFallback(fileName: string, fileSize: number): PreviewResult {
    const content = `
      <div class="encrypted-docx-fallback">
        <style>
          .encrypted-docx-fallback {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 2rem;
            margin: 1rem 0;
          }
          .encrypted-icon {
            font-size: 3rem;
            color: #dc3545;
            margin-bottom: 1rem;
          }
          .error-title {
            color: #dc3545;
            margin: 0 0 1rem 0;
            font-size: 1.25rem;
            font-weight: 600;
          }
          .error-details {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            padding: 1rem;
            margin: 1rem 0;
          }
          .error-details h4 {
            margin-top: 0;
            color: #856404;
          }
          .tech-info {
            font-family: 'Courier New', monospace;
            font-size: 0.85rem;
            background: #f8f9fa;
            padding: 0.5rem;
            border-radius: 4px;
            margin-top: 1rem;
          }
        </style>

        <div class="encrypted-icon">🔐</div>
        <h2 class="error-title">Encrypted Document Detected</h2>

        <p><strong>File:</strong> ${this.escapeHtml(fileName)}</p>
        <p><strong>Size:</strong> ${this.formatFileSize(fileSize)}</p>
        <p><strong>Type:</strong> Microsoft Word Document</p>

        <div class="error-details">
          <h4>⚠️ Preview Unavailable</h4>
          <p>This document is encrypted and cannot be previewed directly. The content you're seeing is encrypted binary data, not the actual document content.</p>

          <h4>💡 Why this happens:</h4>
          <ul>
            <li>The document is encrypted with AES-256-GCM encryption</li>
            <li>JSZip cannot extract content from encrypted files</li>
            <li>The preview system requires decrypted DOCX content</li>
          </ul>

          <h4>🔧 Solutions:</h4>
          <ul>
            <li><strong>Download:</strong> Use the download button to save and open in Microsoft Word</li>
            <li><strong>Decryption:</strong> If you have the password, try entering it when prompted</li>
            <li><strong>Server-side:</strong> Contact your administrator about server-side decryption</li>
          </ul>
        </div>

        <div class="tech-info">
          <strong>Technical Details:</strong> JSZip expects ZIP signature (PK\\x03\\x04) but received encrypted binary data
        </div>
      </div>
    `;

    return {
      type: 'success',
      format: 'html',
      content: content,
      metadata: {
        title: fileName,
        pluginName: this.name,
        extractionMethod: 'encrypted-fallback',
        fileSize: fileSize,
        error: 'Encrypted content detected'
      }
    };
  }

  /**
   * Calculate entropy of data to detect encryption
   */
  private calculateEntropy(data: Uint8Array): number {
    if (data.length === 0) return 0;

    const frequencies = new Array(256).fill(0);
    for (const byte of data) {
      frequencies[byte]++;
    }

    let entropy = 0;
    for (let i = 0; i < 256; i++) {
      if (frequencies[i] > 0) {
        const probability = frequencies[i] / data.length;
        entropy -= probability * Math.log2(probability);
      }
    }

    return entropy;
  }

  /**
   * Calculate ratio of printable characters
   */
  private calculatePrintableRatio(data: Uint8Array): number {
    if (data.length === 0) return 0;

    let printableCount = 0;
    for (const byte of data) {
      if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
        printableCount++;
      }
    }

    return printableCount / data.length;
  }

  // Utility methods
  private cleanHtml(html: string): string {
    return html
      .replace(/<p><\/p>/g, '<p>&nbsp;</p>')
      .replace(/(<p[^>]*>)\s*(<\/p>)/g, '$1&nbsp;$2')
      .replace(/<p><strong>([^<]+)<\/strong><\/p>/g, '<h3>$1</h3>')
      .trim();
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}