/**
 * Enhanced PDF Preview Plugin
 *
 * Fixes:
 * - Poppler dependency issues
 * - PDF processing failures
 * - Page count extraction without server dependencies
 * - Graceful fallbacks for all PDF operations
 */

import { PreviewPlugin, PreviewResult, PreviewOptions } from '../pluginSystem';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker with enhanced error handling
try {
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.js',
      import.meta.url
    ).toString();
  }
} catch {
  // Fallback to CDN if local worker fails
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
  } catch {
    console.warn('⚠️ PDF.js worker configuration failed, text extraction may be limited');
  }
}

export class EnhancedPDFPlugin implements PreviewPlugin {
  name = 'EnhancedPDFPlugin';
  priority = 100; // Higher priority than other PDF plugins
  supportedMimeTypes = ['application/pdf'];
  supportedExtensions = ['pdf'];
  description = 'Enhanced PDF preview with robust error handling and no server dependencies';
  version = '2.0.0';

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
      console.log(`🚀 Enhanced PDF preview starting for ${fileName}`);

      // Create object URL for PDF viewer
      const objectUrl = URL.createObjectURL(blob);

      // Initialize PDF info
      let pdfInfo: any = null;
      let extractedText = '';
      let pageCount = 0;
      let extractionMethod = 'browser-native';

      // Try PDF.js extraction with comprehensive error handling
      try {
        console.log('📄 Attempting PDF.js processing...');

        const pdfData = await this.processPDFWithPDFJS(blob);
        if (pdfData.success) {
          pdfInfo = pdfData.info;
          extractedText = pdfData.text;
          pageCount = pdfData.pageCount;
          extractionMethod = 'pdfjs-extraction';
          console.log(`✅ PDF.js extraction successful: ${pageCount} pages, ${extractedText.length} chars`);
        } else {
          console.warn('⚠️ PDF.js extraction failed, using fallback');
          extractedText = this.getFallbackText(pdfData.error);
        }
      } catch (pdfError) {
        console.warn('⚠️ PDF.js processing failed:', pdfError);
        extractedText = this.getFallbackText(pdfError);
      }

      // Try alternative page count extraction if PDF.js failed
      if (pageCount === 0) {
        try {
          pageCount = await this.extractPageCountFallback(blob);
          if (pageCount > 0) {
            extractionMethod = 'fallback-parsing';
            console.log(`📊 Fallback page count extraction: ${pageCount} pages`);
          }
        } catch (pageError) {
          console.warn('⚠️ Fallback page count extraction failed:', pageError);
        }
      }

      // Generate comprehensive PDF viewer
      const html = this.generateRobustPDFViewer(
        objectUrl,
        fileName,
        blob.size,
        pdfInfo,
        extractedText,
        pageCount,
        extractionMethod,
        options?.pageNumber || 1
      );

      return {
        type: 'success',
        format: 'html',
        content: html,
        text: extractedText,
        pages: pageCount || undefined,
        metadata: {
          ...pdfInfo,
          title: pdfInfo?.title || fileName,
          pluginName: this.name,
          fileSize: blob.size,
          processingTime: `${(performance.now() - startTime).toFixed(1)}ms`,
          objectUrl: objectUrl,
          extractionMethod,
          hasPageCount: pageCount > 0,
          extractedCharacters: extractedText.length
        },
        performance: {
          startTime,
          endTime: performance.now(),
          duration: performance.now() - startTime
        }
      };

    } catch (error) {
      console.error('❌ Enhanced PDF preview failed:', error);
      return this.generateErrorResult(fileName, blob.size, error as Error, performance.now() - startTime);
    }
  }

  /**
   * Process PDF with PDF.js including comprehensive error handling
   */
  private async processPDFWithPDFJS(blob: Blob): Promise<{
    success: boolean;
    info?: any;
    text?: string;
    pageCount?: number;
    error?: any;
  }> {
    try {
      // Convert blob to ArrayBuffer
      const arrayBuffer = await blob.arrayBuffer();

      // Load PDF with timeout and error handling
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        verbosity: 0, // Reduce console noise
        standardFontDataUrl: undefined, // Prevent font loading issues
        cMapUrl: undefined, // Prevent cmap loading issues
        disableFontFace: true, // Prevent font rendering issues
        isEvalSupported: false, // Security
        disableRange: false,
        disableStream: false,
        disableAutoFetch: false
      });

      // Set a reasonable timeout
      const pdf = await Promise.race([
        loadingTask.promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('PDF loading timeout')), 15000)
        )
      ]) as any;

      const pageCount = pdf.numPages;
      console.log(`📊 PDF loaded successfully: ${pageCount} pages`);

      // Extract metadata safely
      let metadata: any = {};
      try {
        const pdfMetadata = await pdf.getMetadata();
        metadata = {
          title: pdfMetadata.info?.Title || null,
          author: pdfMetadata.info?.Author || null,
          subject: pdfMetadata.info?.Subject || null,
          creator: pdfMetadata.info?.Creator || null,
          producer: pdfMetadata.info?.Producer || null,
          creationDate: pdfMetadata.info?.CreationDate || null,
          modificationDate: pdfMetadata.info?.ModDate || null,
          pageCount: pageCount
        };
      } catch (metaError) {
        console.warn('⚠️ PDF metadata extraction failed:', metaError);
        metadata = { pageCount };
      }

      // Extract text from first few pages with error handling
      let extractedText = '';
      const pagesToExtract = Math.min(3, pageCount);
      const textPages: string[] = [];

      for (let i = 1; i <= pagesToExtract; i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();

          const pageText = textContent.items
            .filter((item: any) => item.str && item.str.trim())
            .map((item: any) => item.str)
            .join(' ')
            .trim();

          if (pageText) {
            textPages.push(`Page ${i}:\n${pageText}`);
          } else {
            textPages.push(`Page ${i}: [No text content]`);
          }

          // Clean up page resources
          page.cleanup();
        } catch (pageError) {
          console.warn(`⚠️ Failed to extract text from page ${i}:`, pageError);
          textPages.push(`Page ${i}: [Text extraction failed]`);
        }
      }

      extractedText = textPages.join('\n\n');

      // Clean up PDF resources
      pdf.destroy();

      return {
        success: true,
        info: metadata,
        text: extractedText,
        pageCount: pageCount
      };

    } catch (error) {
      console.error('❌ PDF.js processing failed:', error);
      return {
        success: false,
        error: error
      };
    }
  }

  /**
   * Fallback page count extraction using basic PDF parsing
   */
  private async extractPageCountFallback(blob: Blob): Promise<number> {
    try {
      // Read PDF as text and look for page count indicators
      const text = await blob.text();

      // Look for /Count in PDF structure
      const countMatch = text.match(/\/Count\s+(\d+)/);
      if (countMatch) {
        return parseInt(countMatch[1], 10);
      }

      // Look for /N (number of pages) in PDF structure
      const nMatch = text.match(/\/N\s+(\d+)/);
      if (nMatch) {
        return parseInt(nMatch[1], 10);
      }

      // Count page objects (less reliable but better than nothing)
      const pageMatches = text.match(/\/Type\s*\/Page\b/g);
      if (pageMatches) {
        return pageMatches.length;
      }

      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get fallback text based on error type
   */
  private getFallbackText(error: any): string {
    if (!error) return 'PDF content preview not available.';

    const errorMsg = error.message || error.toString();

    if (errorMsg.includes('timeout')) {
      return 'PDF loading timed out. The document viewer below should still work.';
    }

    if (errorMsg.includes('worker')) {
      return 'PDF text extraction unavailable (worker issue). Document viewer is functional.';
    }

    if (errorMsg.includes('poppler') || errorMsg.toLowerCase().includes('page count')) {
      return 'Server-side PDF processing unavailable. Client-side viewer is available below.';
    }

    if (errorMsg.includes('corrupt') || errorMsg.includes('invalid')) {
      return 'PDF may be corrupted or password-protected. Basic viewing may still work.';
    }

    return 'PDF text preview unavailable. Document viewer below should work normally.';
  }

  /**
   * Generate robust PDF viewer HTML
   */
  private generateRobustPDFViewer(
    objectUrl: string,
    fileName: string,
    fileSize: number,
    pdfInfo: any,
    extractedText: string,
    pageCount: number,
    extractionMethod: string,
    initialPage: number
  ): string {
    const hasText = extractedText && extractedText.length > 50;
    const hasInfo = pdfInfo && Object.keys(pdfInfo).length > 1;

    return `
      <div class="enhanced-pdf-container">
        <style>
          .enhanced-pdf-container {
            width: 100%;
            height: 100%;
            min-height: 600px;
            background: #f5f5f5;
            border-radius: 8px;
            overflow: hidden;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            flex-direction: column;
          }

          .pdf-header {
            background: #ffffff;
            padding: 1rem;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }

          .pdf-title {
            font-weight: 600;
            color: #333;
            font-size: 1.1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .pdf-controls {
            display: flex;
            gap: 0.5rem;
            align-items: center;
          }

          .pdf-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: background-color 0.2s;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
          }

          .pdf-btn:hover {
            background: #0056b3;
          }

          .pdf-btn.secondary {
            background: #6c757d;
          }

          .pdf-btn.secondary:hover {
            background: #545b62;
          }

          .pdf-tabs {
            display: flex;
            background: #fff;
            border-bottom: 1px solid #e0e0e0;
          }

          .pdf-tab {
            padding: 0.75rem 1.5rem;
            background: transparent;
            border: none;
            cursor: pointer;
            font-size: 0.9rem;
            color: #666;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
          }

          .pdf-tab.active {
            color: #007bff;
            border-bottom-color: #007bff;
            background: #f8f9fa;
          }

          .pdf-tab:hover {
            background: #f8f9fa;
            color: #007bff;
          }

          .pdf-content {
            flex: 1;
            display: none;
            overflow-y: auto;
          }

          .pdf-content.active {
            display: block;
          }

          .pdf-viewer-frame {
            width: 100%;
            height: calc(100vh - 200px);
            min-height: 500px;
            border: none;
            background: white;
          }

          .pdf-text-content {
            padding: 1.5rem;
            background: white;
            max-height: calc(100vh - 300px);
            overflow-y: auto;
          }

          .pdf-text-preview {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 1rem;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.9rem;
            line-height: 1.6;
            white-space: pre-wrap;
            color: #495057;
            max-height: 400px;
            overflow-y: auto;
          }

          .pdf-info-content {
            padding: 1.5rem;
            background: white;
          }

          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 0.75rem;
            margin-top: 0.5rem;
          }

          .info-item {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid #f0f0f0;
          }

          .info-label {
            font-weight: 600;
            color: #495057;
          }

          .info-value {
            color: #6c757d;
            text-align: right;
            word-break: break-word;
          }

          .extraction-info {
            background: #e3f2fd;
            border: 1px solid #bbdefb;
            border-radius: 4px;
            padding: 0.75rem;
            margin: 1rem 0;
            font-size: 0.9rem;
            color: #1565c0;
          }

          .pdf-fallback {
            display: none;
            text-align: center;
            padding: 2rem;
            background: white;
            margin: 1rem;
            border-radius: 8px;
            border: 2px dashed #dee2e6;
          }

          .pdf-fallback.show {
            display: block;
          }

          @media (max-width: 768px) {
            .pdf-header {
              flex-direction: column;
              gap: 1rem;
              align-items: stretch;
            }

            .pdf-controls {
              justify-content: center;
            }

            .pdf-viewer-frame {
              height: calc(100vh - 300px);
            }
          }
        </style>

        <!-- Header -->
        <div class="pdf-header">
          <div class="pdf-title">
            📄 ${fileName}
            ${pageCount > 0 ? `<span style="color: #666; font-size: 0.9rem;">(${pageCount} pages)</span>` : ''}
          </div>
          <div class="pdf-controls">
            <button class="pdf-btn" onclick="window.open('${objectUrl}', '_blank')">
              🔍 Open in New Tab
            </button>
            <a href="${objectUrl}" download="${fileName}" class="pdf-btn secondary">
              💾 Download
            </a>
          </div>
        </div>

        <!-- Tabs -->
        <div class="pdf-tabs">
          <button class="pdf-tab active" onclick="showPDFTab('viewer', this)">📄 PDF Viewer</button>
          ${hasText ? '<button class="pdf-tab" onclick="showPDFTab(\'text\', this)">📝 Text Content</button>' : ''}
          ${hasInfo ? '<button class="pdf-tab" onclick="showPDFTab(\'info\', this)">ℹ️ Document Info</button>' : ''}
        </div>

        <!-- PDF Viewer Tab -->
        <div id="pdf-viewer-tab" class="pdf-content active">
          <iframe
            class="pdf-viewer-frame"
            src="${objectUrl}#page=${initialPage}&toolbar=1&navpanes=1&scrollbar=1"
            title="PDF Preview: ${fileName}"
            onload="console.log('PDF loaded successfully')"
            onerror="handlePDFError()"
          ></iframe>

          <div class="pdf-fallback" id="pdf-fallback">
            <h3>📄 PDF Preview</h3>
            <p>Your browser supports PDF viewing. Click below to view or download the document.</p>
            <button class="pdf-btn" onclick="window.open('${objectUrl}', '_blank')">
              📄 Open in New Tab
            </button>
            <a href="${objectUrl}" download="${fileName}" class="pdf-btn secondary">
              💾 Download PDF
            </a>
          </div>
        </div>

        <!-- Text Content Tab -->
        ${hasText ? `
        <div id="pdf-text-tab" class="pdf-content">
          <div class="pdf-text-content">
            <h3>📝 Extracted Text Content</h3>
            <div class="extraction-info">
              ℹ️ Content extracted using: ${extractionMethod}
              ${pageCount > 0 ? ` • Showing first ${Math.min(3, pageCount)} pages` : ''}
            </div>
            <div class="pdf-text-preview">${extractedText || 'No text content could be extracted from this PDF.'}</div>
          </div>
        </div>
        ` : ''}

        <!-- Document Info Tab -->
        ${hasInfo ? `
        <div id="pdf-info-tab" class="pdf-content">
          <div class="pdf-info-content">
            <h3>ℹ️ Document Information</h3>
            <div class="info-grid">
              ${pdfInfo.title ? `<div class="info-item"><span class="info-label">Title:</span><span class="info-value">${pdfInfo.title}</span></div>` : ''}
              ${pdfInfo.author ? `<div class="info-item"><span class="info-label">Author:</span><span class="info-value">${pdfInfo.author}</span></div>` : ''}
              ${pdfInfo.subject ? `<div class="info-item"><span class="info-label">Subject:</span><span class="info-value">${pdfInfo.subject}</span></div>` : ''}
              ${pdfInfo.creator ? `<div class="info-item"><span class="info-label">Creator:</span><span class="info-value">${pdfInfo.creator}</span></div>` : ''}
              ${pdfInfo.producer ? `<div class="info-item"><span class="info-label">Producer:</span><span class="info-value">${pdfInfo.producer}</span></div>` : ''}
              <div class="info-item"><span class="info-label">Pages:</span><span class="info-value">${pageCount || 'Unknown'}</span></div>
              <div class="info-item"><span class="info-label">File Size:</span><span class="info-value">${this.formatFileSize(fileSize)}</span></div>
              ${pdfInfo.creationDate ? `<div class="info-item"><span class="info-label">Created:</span><span class="info-value">${new Date(pdfInfo.creationDate).toLocaleDateString()}</span></div>` : ''}
            </div>
            <div class="extraction-info">
              🔧 Processing method: ${extractionMethod}
            </div>
          </div>
        </div>
        ` : ''}

        <script>
          function showPDFTab(tabName, buttonElement) {
            // Hide all content tabs
            const allTabs = document.querySelectorAll('.pdf-content');
            allTabs.forEach(tab => tab.classList.remove('active'));

            // Remove active class from all tab buttons
            const allButtons = document.querySelectorAll('.pdf-tab');
            allButtons.forEach(btn => btn.classList.remove('active'));

            // Show selected tab and activate button
            const selectedTab = document.getElementById('pdf-' + tabName + '-tab');
            if (selectedTab) {
              selectedTab.classList.add('active');
            }
            if (buttonElement) {
              buttonElement.classList.add('active');
            }
          }

          function handlePDFError() {
            console.warn('PDF iframe failed to load, showing fallback');
            const fallback = document.getElementById('pdf-fallback');
            if (fallback) {
              fallback.classList.add('show');
            }
          }

          // Enhanced PDF loading detection
          setTimeout(() => {
            const iframe = document.querySelector('.pdf-viewer-frame');
            const fallback = document.getElementById('pdf-fallback');

            if (iframe && fallback) {
              try {
                // Check if PDF loaded (may fail due to CORS, which is normal)
                if (iframe.contentDocument === null) {
                  // This is actually normal for PDF files due to CORS
                  console.log('PDF iframe loaded (CORS restriction is expected)');
                }
              } catch (e) {
                // CORS error is expected and normal for PDF files
                console.log('PDF loaded (CORS restriction is normal)');
              }
            }
          }, 3000);
        </script>
      </div>
    `;
  }

  /**
   * Generate error result with enhanced error information
   */
  private generateErrorResult(fileName: string, fileSize: number, error: Error, duration: number): PreviewResult {
    return {
      type: 'error',
      format: 'html',
      content: this.generateEnhancedErrorHTML(fileName, error),
      error: `Enhanced PDF preview failed: ${error.message}`,
      metadata: {
        title: fileName,
        pluginName: this.name,
        fileSize: fileSize,
        processingTime: `${duration.toFixed(1)}ms`,
        fallback: true,
        originalError: error.message,
        errorType: error.constructor.name
      }
    };
  }

  /**
   * Generate enhanced error HTML with specific guidance
   */
  private generateEnhancedErrorHTML(fileName: string, error: Error): string {
    let userMessage = 'PDF preview is currently unavailable.';
    let suggestions = 'You can download the file to view it in your system\'s PDF viewer.';
    let errorIcon = '⚠️';
    let technicalInfo = error.message;

    if (error.message.includes('poppler') || error.message.toLowerCase().includes('page count')) {
      userMessage = 'Server-side PDF processing is not available.';
      suggestions = 'The browser\'s built-in PDF viewer should still work. Try downloading the file if needed.';
      errorIcon = '🔧';
      technicalInfo = 'This error occurs when server-side PDF processing tools (Poppler) are not installed. Client-side viewing should still work.';
    } else if (error.message.includes('timeout')) {
      userMessage = 'PDF processing took too long.';
      suggestions = 'Try refreshing the page or downloading the file directly.';
      errorIcon = '⏱️';
    } else if (error.message.includes('worker')) {
      userMessage = 'PDF text extraction is temporarily unavailable.';
      suggestions = 'The PDF viewer should still work normally. Text search may be limited.';
      errorIcon = '🔧';
    }

    return `
      <div style="padding: 2rem; text-align: center; background: #f8f9fa; border-radius: 8px; font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="font-size: 3rem; margin-bottom: 1rem;">${errorIcon}</div>
        <h2 style="color: #495057; font-size: 1.5rem; margin-bottom: 1rem;">PDF Preview Issue</h2>
        <p style="color: #6c757d; margin-bottom: 1.5rem; line-height: 1.6;">${userMessage}</p>

        <div style="background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 4px; padding: 1rem; margin: 1rem 0; color: #0c5460;">
          <strong>What you can do:</strong><br>
          ${suggestions}
        </div>

        <details style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 1rem; margin: 1rem 0; text-align: left;">
          <summary style="cursor: pointer; font-weight: 600; color: #856404;">Technical Details</summary>
          <p style="margin: 0.5rem 0 0 0; font-family: monospace; font-size: 0.9rem; color: #856404; word-break: break-word;">
            <strong>File:</strong> ${fileName}<br>
            <strong>Error:</strong> ${technicalInfo}
          </p>
        </details>

        <button onclick="window.location.reload()" style="background: #007bff; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; margin: 0.5rem; transition: background-color 0.2s;">
          🔄 Refresh Page
        </button>
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