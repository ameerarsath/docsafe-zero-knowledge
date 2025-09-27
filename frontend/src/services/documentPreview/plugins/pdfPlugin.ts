/**
 * PDF Preview Plugin
 * Handles PDF document preview with proper rendering, navigation, and text extraction
 * Uses PDF.js for enhanced content extraction and rendering
 */

import { PreviewPlugin, PreviewResult, PreviewOptions } from '../pluginSystem';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - try multiple approaches
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url
  ).toString();
} catch {
  // Fallback to CDN if local worker fails
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
}

export class PDFPreviewPlugin implements PreviewPlugin {
  name = 'PDFPreview';
  priority = 85;
  supportedMimeTypes = [
    'application/pdf'
  ];
  supportedExtensions = ['pdf'];
  description = 'PDF document preview with navigation and zoom controls';
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
      console.log(`🔍 Starting enhanced PDF preview for ${fileName}`);

      // Create object URL for PDF
      const objectUrl = URL.createObjectURL(blob);

      // Try to extract content using PDF.js
      let pdfInfo: any = null;
      let extractedText = '';
      let pageCount = 0;
      let pdfExtractionSucceeded = false;

      try {
        console.log('📄 Attempting PDF.js text extraction...');

        // Convert blob to ArrayBuffer for PDF.js
        const arrayBuffer = await blob.arrayBuffer();

        // Load PDF document with timeout
        const loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer,
          verbosity: 0 // Reduce console spam
        });

        const pdf = await Promise.race([
          loadingTask.promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('PDF loading timeout')), 10000)
          )
        ]) as any;

        pageCount = pdf.numPages;
        pdfExtractionSucceeded = true;

        console.log(`📊 PDF loaded: ${pageCount} pages`);

        // Extract metadata
        const metadata = await pdf.getMetadata();
        pdfInfo = {
          title: metadata.info.Title || fileName,
          author: metadata.info.Author,
          subject: metadata.info.Subject,
          creator: metadata.info.Creator,
          producer: metadata.info.Producer,
          creationDate: metadata.info.CreationDate,
          modificationDate: metadata.info.ModDate,
          pageCount: pageCount
        };

        // Extract text from first few pages (up to 3 for preview)
        const pagesToExtract = Math.min(3, pageCount);
        const textPages: string[] = [];

        for (let i = 1; i <= pagesToExtract; i++) {
          try {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .filter((item: any) => item.str && item.str.trim())
              .map((item: any) => item.str)
              .join(' ');

            if (pageText.trim()) {
              textPages.push(`Page ${i}:\n${pageText}`);
            }
          } catch (pageError) {
            console.warn(`⚠️ Failed to extract text from page ${i}:`, pageError);
            textPages.push(`Page ${i}: [Text extraction failed]`);
          }
        }

        extractedText = textPages.join('\n\n');
        console.log(`✅ Extracted ${extractedText.length} characters from ${pagesToExtract} pages`);

      } catch (pdfError) {
        console.error('❌ PDF.js extraction failed:', pdfError);
        pdfExtractionSucceeded = false;

        // Provide different messages based on error type
        if (pdfError instanceof Error) {
          if (pdfError.message.includes('timeout')) {
            extractedText = 'PDF loading timed out. The document viewer below will still work.';
          } else if (pdfError.message.includes('poppler') || pdfError.message.toLowerCase().includes('page count')) {
            extractedText = 'PDF processing library not available. Basic viewing is still available below.';
          } else if (pdfError.message.includes('invalid') || pdfError.message.includes('corrupt')) {
            extractedText = 'This PDF may be corrupted or password-protected. Basic viewing may still work.';
          } else {
            extractedText = 'PDF.js library is initializing. The viewer below shows the PDF content.';
          }
        } else {
          extractedText = 'PDF text extraction not available. The document viewer below will still work.';
        }
        // Still provide a basic viewer even if extraction fails
      }

      // Get page number from options
      const pageNumber = options?.pageNumber || 1;

      // Create comprehensive PDF viewer HTML with extracted content
      const html = this.generateEnhancedPDFViewerHTML(
        objectUrl,
        fileName,
        pageNumber,
        blob.size,
        pdfInfo,
        extractedText,
        pageCount
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
          objectUrl: objectUrl, // Store for cleanup
          extractionMethod: pdfExtractionSucceeded ? 'PDF.js with text extraction' : 'PDF iframe embedding with fallback',
          extractedCharacters: extractedText.length
        },
        performance: {
          startTime,
          endTime: performance.now(),
          duration: performance.now() - startTime
        }
      };

    } catch (error) {
      console.error('❌ PDF preview failed:', error);

      return {
        type: 'error',
        format: 'html',
        content: this.generateErrorHTML(fileName, error as Error),
        error: `PDF preview failed: ${(error as Error).message}`,
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

  private generateEnhancedPDFViewerHTML(
    objectUrl: string,
    fileName: string,
    pageNumber: number,
    fileSize: number,
    pdfInfo: any,
    extractedText: string,
    pageCount: number
  ): string {
    return `
      <div class="pdf-preview-container">
        <style>
          .pdf-preview-container {
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

          .pdf-metadata {
            background: white;
            padding: 1rem;
            border-bottom: 1px solid #e0e0e0;
          }

          .metadata-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 0.75rem;
            margin-top: 0.5rem;
          }

          .metadata-item {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid #f0f0f0;
          }

          .metadata-label {
            font-weight: 600;
            color: #495057;
          }

          .metadata-value {
            color: #6c757d;
            text-align: right;
            word-break: break-word;
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

          .pdf-control-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: background-color 0.2s;
          }

          .pdf-control-btn:hover {
            background: #0056b3;
          }

          .pdf-control-btn:disabled {
            background: #6c757d;
            cursor: not-allowed;
          }

          .pdf-viewer {
            width: 100%;
            height: calc(100vh - 200px);
            min-height: 500px;
            border: none;
            background: white;
          }

          .pdf-info {
            padding: 0.5rem 1rem;
            background: #f8f9fa;
            color: #6c757d;
            font-size: 0.9rem;
            border-top: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .pdf-fallback {
            padding: 2rem;
            text-align: center;
            background: white;
            margin: 1rem;
            border-radius: 8px;
            border: 2px dashed #dee2e6;
          }

          .pdf-fallback h3 {
            color: #495057;
            margin-bottom: 1rem;
          }

          .pdf-fallback p {
            color: #6c757d;
            margin-bottom: 1.5rem;
          }

          .download-btn {
            background: #28a745;
            color: white;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
            text-decoration: none;
            display: inline-block;
            transition: background-color 0.2s;
          }

          .download-btn:hover {
            background: #1e7e34;
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

            .pdf-viewer {
              height: calc(100vh - 300px);
            }
          }
        </style>

        <!-- Tab Navigation -->
        <div class="pdf-tabs">
          <button class="pdf-tab active" onclick="showPDFTab('viewer', this)">📄 PDF Viewer</button>
          ${extractedText && extractedText.length > 50 ? '<button class="pdf-tab" onclick="showPDFTab(\'text\', this)">📝 Text Content</button>' : ''}
          ${pdfInfo ? '<button class="pdf-tab" onclick="showPDFTab(\'info\', this)">ℹ️ Document Info</button>' : ''}
        </div>

        <!-- PDF Viewer Tab -->
        <div id="pdf-viewer-tab" class="pdf-content active">
          <div class="pdf-header">
          <div class="pdf-title">
            📄 ${fileName}
          </div>
          <div class="pdf-controls">
            <button class="pdf-control-btn" onclick="window.open('${objectUrl}', '_blank')">
              🔍 Open in New Tab
            </button>
            <a href="${objectUrl}" download="${fileName}" class="pdf-control-btn" style="text-decoration: none;">
              💾 Download
            </a>
          </div>
        </div>

        <iframe
          class="pdf-viewer"
          src="${objectUrl}#page=${pageNumber}&toolbar=1&navpanes=1&scrollbar=1"
          title="PDF Preview: ${fileName}"
          sandbox="allow-scripts allow-same-origin allow-downloads"
          onload="console.log('PDF loaded successfully')"
          onerror="console.error('PDF failed to load'); this.style.display='none'; document.querySelector('.pdf-fallback').style.display='block';"
        ></iframe>

        <div class="pdf-fallback" style="display: none;">
          <h3>📄 PDF Preview Not Available</h3>
          <p>Your browser might not support inline PDF viewing, but you can still download and open the file.</p>
          <a href="${objectUrl}" download="${fileName}" class="download-btn">
            💾 Download PDF File
          </a>
        </div>

        <div class="pdf-info">
          <span>📊 File size: ${this.formatFileSize(fileSize)}</span>
          <span>🔗 PDF Document</span>
        </div>

        <!-- Text Content Tab -->
        ${extractedText && extractedText.length > 50 ? `
        <div id="pdf-text-tab" class="pdf-content">
          <div class="pdf-text-content">
            <h3>📝 Extracted Text Content</h3>
            <p>First ${Math.min(3, pageCount)} pages extracted for preview:</p>
            <div class="pdf-text-preview">${extractedText || 'No text content could be extracted from this PDF.'}</div>
          </div>
        </div>
        ` : ''}

        <!-- Document Info Tab -->
        ${pdfInfo ? `
        <div id="pdf-info-tab" class="pdf-content">
          <div class="pdf-metadata">
            <h3>ℹ️ Document Information</h3>
            <div class="metadata-grid">
              ${pdfInfo.title ? `<div class="metadata-item"><span class="metadata-label">Title:</span><span class="metadata-value">${pdfInfo.title}</span></div>` : ''}
              ${pdfInfo.author ? `<div class="metadata-item"><span class="metadata-label">Author:</span><span class="metadata-value">${pdfInfo.author}</span></div>` : ''}
              ${pdfInfo.subject ? `<div class="metadata-item"><span class="metadata-label">Subject:</span><span class="metadata-value">${pdfInfo.subject}</span></div>` : ''}
              ${pdfInfo.creator ? `<div class="metadata-item"><span class="metadata-label">Creator:</span><span class="metadata-value">${pdfInfo.creator}</span></div>` : ''}
              ${pdfInfo.producer ? `<div class="metadata-item"><span class="metadata-label">Producer:</span><span class="metadata-value">${pdfInfo.producer}</span></div>` : ''}
              <div class="metadata-item"><span class="metadata-label">Pages:</span><span class="metadata-value">${pageCount}</span></div>
              <div class="metadata-item"><span class="metadata-label">File Size:</span><span class="metadata-value">${this.formatFileSize(fileSize)}</span></div>
              ${pdfInfo.creationDate ? `<div class="metadata-item"><span class="metadata-label">Created:</span><span class="metadata-value">${new Date(pdfInfo.creationDate).toLocaleDateString()}</span></div>` : ''}
              ${pdfInfo.modificationDate ? `<div class="metadata-item"><span class="metadata-label">Modified:</span><span class="metadata-value">${new Date(pdfInfo.modificationDate).toLocaleDateString()}</span></div>` : ''}
            </div>
          </div>
        </div>
        ` : ''}

        <script>
          // Tab switching functionality
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
          // Enhanced PDF loading detection
          (function() {
            const iframe = document.querySelector('.pdf-viewer');
            const fallback = document.querySelector('.pdf-fallback');

            // Timeout fallback after 10 seconds
            setTimeout(() => {
              try {
                // Check if PDF loaded properly
                if (iframe && iframe.contentDocument === null) {
                  console.warn('PDF iframe blocked or failed to load');
                  iframe.style.display = 'none';
                  if (fallback) fallback.style.display = 'block';
                }
              } catch (e) {
                console.warn('PDF accessibility check failed:', e);
                // Cross-origin restriction is expected for PDF files
              }
            }, 10000);

            // Browser compatibility checks
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

            if (isIOS && isSafari) {
              console.log('iOS Safari detected - PDF viewing may be limited');
            }
          })();
        </script>
      </div>
    `;
  }

  private generateErrorHTML(fileName: string, error: Error): string {
    // Determine user-friendly error message and suggestions
    let userMessage = 'We encountered an error while trying to preview this PDF file.';
    let suggestions = 'Please try downloading the file to view it in your system\'s default PDF viewer.';
    let errorIcon = '⚠️';

    if (error.message.includes('poppler') || error.message.toLowerCase().includes('page count')) {
      userMessage = 'PDF processing tools are not available on the server.';
      suggestions = 'You can still download and view the PDF file. Contact your administrator if server-side PDF processing is needed.';
      errorIcon = '🔧';
    } else if (error.message.includes('timeout')) {
      userMessage = 'The PDF took too long to process.';
      suggestions = 'Try refreshing the page or download the file directly to view it.';
      errorIcon = '⏱️';
    } else if (error.message.includes('corrupt') || error.message.includes('invalid')) {
      userMessage = 'This PDF file appears to be corrupted or in an unsupported format.';
      suggestions = 'Check if the file was uploaded correctly or try re-uploading it.';
      errorIcon = '📄';
    } else if (error.message.includes('permission') || error.message.includes('access')) {
      userMessage = 'Access to this PDF file is restricted.';
      suggestions = 'Check your permissions or contact the document owner.';
      errorIcon = '🔒';
    }

    return `
      <div class="pdf-error-container">
        <style>
          .pdf-error-container {
            padding: 2rem;
            text-align: center;
            background: #f8f9fa;
            border-radius: 8px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 600px;
            margin: 0 auto;
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

          .error-suggestions {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            border-radius: 4px;
            padding: 1rem;
            margin: 1rem 0;
            color: #0c5460;
          }

          .error-details {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 1rem;
            margin: 1rem 0;
            text-align: left;
          }

          .error-details summary {
            color: #856404;
            cursor: pointer;
            font-weight: 600;
            margin-bottom: 0.5rem;
          }

          .error-details p {
            color: #856404;
            margin: 0.5rem 0 0 0;
            font-family: monospace;
            font-size: 0.9rem;
            word-break: break-word;
          }

          .download-btn {
            background: #007bff;
            color: white;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
            text-decoration: none;
            display: inline-block;
            margin-top: 1rem;
            transition: background-color 0.2s;
          }

          .download-btn:hover {
            background: #0056b3;
          }
        </style>

        <div class="error-icon">${errorIcon}</div>
        <h2 class="error-title">PDF Preview Not Available</h2>
        <p class="error-message">${userMessage}</p>

        <div class="error-suggestions">
          <strong>What you can do:</strong><br>
          ${suggestions}
        </div>

        <details class="error-details">
          <summary>Technical Details</summary>
          <p><strong>File:</strong> ${fileName}</p>
          <p><strong>Error:</strong> ${error.message}</p>
        </details>

        <button onclick="window.location.reload()" class="download-btn">
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