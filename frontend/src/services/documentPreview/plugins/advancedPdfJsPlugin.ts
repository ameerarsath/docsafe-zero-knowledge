/**
 * Advanced PDF.js Plugin
 *
 * Provides enhanced PDF viewing with PDF.js rendering engine
 * This plugin acts as a fallback or secondary option to the default PDF plugin
 */

import { PreviewPlugin, PreviewResult, PreviewOptions } from '../pluginSystem';

// Dynamic import of PDF.js to handle loading gracefully
let pdfjsLib: any = null;

// Initialize PDF.js
const initPDFJS = async () => {
  if (pdfjsLib) return pdfjsLib;

  try {
    pdfjsLib = await import('pdfjs-dist');

    // Set up the worker
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.js',
        import.meta.url
      ).toString();
    } catch {
      // Fallback to CDN
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
    }

    console.log('✅ PDF.js initialized successfully');
    return pdfjsLib;
  } catch (error) {
    console.error('❌ Failed to initialize PDF.js:', error);
    throw error;
  }
};

export class AdvancedPDFJSPlugin implements PreviewPlugin {
  name = 'AdvancedPDFJSPlugin';
  priority = 99; // High priority, but lower than DefaultPDFPlugin
  supportedMimeTypes = ['application/pdf'];
  supportedExtensions = ['pdf'];
  description = 'Advanced PDF viewer using PDF.js rendering engine with text extraction';
  version = '1.5.0';

  canPreview(mimeType: string, fileName: string): boolean {
    console.log(`🔍 AdvancedPDFJSPlugin checking: ${fileName} (${mimeType})`);
    const extension = fileName.toLowerCase().split('.').pop();
    const canHandle = this.supportedMimeTypes.includes(mimeType) ||
           (extension && this.supportedExtensions.includes(extension));
    console.log(`📄 AdvancedPDFJSPlugin can handle: ${canHandle}`);
    return canHandle;
  }

  async preview(
    blob: Blob,
    fileName: string,
    mimeType: string,
    options?: PreviewOptions
  ): Promise<PreviewResult> {
    const startTime = performance.now();

    try {
      console.log(`🚀 AdvancedPDFJSPlugin starting preview for ${fileName}`);

      // Initialize PDF.js
      const pdfjs = await initPDFJS();

      // Create object URL for fallback
      const objectUrl = URL.createObjectURL(blob);

      // Load PDF document
      const arrayBuffer = await blob.arrayBuffer();
      const loadingTask = pdfjs.getDocument({
        data: arrayBuffer,
        verbosity: 0
      });

      const pdf = await Promise.race([
        loadingTask.promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('PDF loading timeout')), 15000)
        )
      ]) as any;

      console.log(`📊 PDF loaded: ${pdf.numPages} pages`);

      // Extract metadata
      const metadata = await pdf.getMetadata();
      const pdfInfo = {
        title: metadata.info.Title || fileName,
        author: metadata.info.Author,
        subject: metadata.info.Subject,
        creator: metadata.info.Creator,
        producer: metadata.info.Producer,
        pageCount: pdf.numPages
      };

      // Render first page as preview
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1.5 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d')!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await firstPage.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      const pageImageUrl = canvas.toDataURL('image/png');

      // Extract text from first page
      const textContent = await firstPage.getTextContent();
      const pageText = textContent.items
        .filter((item: any) => item.str && item.str.trim())
        .map((item: any) => item.str)
        .join(' ');

      // Generate advanced PDF viewer HTML
      const html = this.generateAdvancedPDFViewerHTML(
        objectUrl,
        fileName,
        blob.size,
        pdfInfo,
        pageImageUrl,
        pageText,
        pdf.numPages
      );

      console.log(`✅ AdvancedPDFJSPlugin preview generated successfully`);

      return {
        type: 'success',
        format: 'html',
        content: html,
        text: pageText,
        pages: pdf.numPages,
        metadata: {
          ...pdfInfo,
          pluginName: this.name,
          fileSize: blob.size,
          processingTime: `${(performance.now() - startTime).toFixed(1)}ms`,
          extractionMethod: 'PDF.js rendering engine with text extraction',
          objectUrl: objectUrl,
          canvasRendered: true
        },
        performance: {
          startTime,
          endTime: performance.now(),
          duration: performance.now() - startTime
        }
      };

    } catch (error) {
      console.error('❌ Advanced PDF.js preview failed:', error);

      // Fallback to basic viewer
      try {
        const objectUrl = URL.createObjectURL(blob);
        const html = this.generateFallbackHTML(objectUrl, fileName, blob.size, error as Error);

        return {
          type: 'success', // Still return success with fallback
          format: 'html',
          content: html,
          text: `PDF Document: ${fileName} (Advanced features unavailable)`,
          error: `PDF.js processing failed: ${(error as Error).message}`,
          metadata: {
            title: fileName,
            pluginName: this.name,
            fileSize: blob.size,
            processingTime: `${(performance.now() - startTime).toFixed(1)}ms`,
            fallback: true,
            originalError: (error as Error).message,
            objectUrl: objectUrl
          }
        };
      } catch (fallbackError) {
        return {
          type: 'error',
          format: 'text',
          content: `PDF preview failed: ${(error as Error).message}`,
          error: (error as Error).message,
          metadata: {
            title: fileName,
            pluginName: this.name,
            fileSize: blob.size,
            processingTime: `${(performance.now() - startTime).toFixed(1)}ms`,
            failed: true
          }
        };
      }
    }
  }

  private generateAdvancedPDFViewerHTML(
    objectUrl: string,
    fileName: string,
    fileSize: number,
    pdfInfo: any,
    pageImageUrl: string,
    extractedText: string,
    pageCount: number
  ): string {
    const uniqueId = `pdfjs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return `
      <div id="${uniqueId}" class="advanced-pdfjs-container">
        <style>
          .advanced-pdfjs-container {
            width: 100%;
            height: 100%;
            min-height: 700px;
            background: #f8f9fa;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            flex-direction: column;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }

          .pdfjs-header {
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            padding: 1rem 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
          }

          .pdfjs-title-section {
            display: flex;
            align-items: center;
            gap: 1rem;
            flex: 1;
          }

          .pdfjs-icon {
            font-size: 1.8rem;
            opacity: 0.9;
          }

          .pdfjs-title {
            font-weight: 600;
            font-size: 1.2rem;
            margin: 0;
          }

          .pdfjs-meta {
            font-size: 0.9rem;
            opacity: 0.8;
            margin: 0.25rem 0 0 0;
          }

          .pdfjs-actions {
            display: flex;
            gap: 0.75rem;
            flex-wrap: wrap;
          }

          .pdfjs-btn {
            padding: 0.5rem 1rem;
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 6px;
            background: rgba(255,255,255,0.1);
            color: white;
            cursor: pointer;
            font-size: 0.9rem;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s;
            backdrop-filter: blur(10px);
          }

          .pdfjs-btn:hover {
            background: rgba(255,255,255,0.2);
            transform: translateY(-1px);
          }

          .pdfjs-content-area {
            flex: 1;
            display: flex;
            background: white;
          }

          .pdfjs-sidebar {
            width: 300px;
            background: #f8f9fa;
            border-right: 1px solid #dee2e6;
            padding: 1.5rem;
            overflow-y: auto;
          }

          .pdfjs-main-view {
            flex: 1;
            padding: 1.5rem;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .page-preview {
            max-width: 100%;
            max-height: 600px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            margin-bottom: 1rem;
          }

          .pdf-embed-viewer {
            width: 100%;
            height: 600px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            margin-top: 1rem;
          }

          .info-section {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
          }

          .info-section h4 {
            margin: 0 0 0.75rem 0;
            color: #495057;
            font-size: 1rem;
            font-weight: 600;
          }

          .info-item {
            display: flex;
            justify-content: space-between;
            padding: 0.4rem 0;
            border-bottom: 1px solid #f8f9fa;
            font-size: 0.9rem;
          }

          .info-item:last-child {
            border-bottom: none;
          }

          .info-label {
            font-weight: 500;
            color: #6c757d;
          }

          .info-value {
            color: #495057;
            text-align: right;
            word-break: break-word;
            max-width: 150px;
          }

          .text-preview {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 6px;
            padding: 1rem;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.85rem;
            line-height: 1.5;
            color: #495057;
            max-height: 200px;
            overflow-y: auto;
            white-space: pre-wrap;
          }

          .feature-badge {
            background: #28a745;
            color: white;
            padding: 0.2rem 0.5rem;
            border-radius: 3px;
            font-size: 0.75rem;
            font-weight: 500;
          }

          @media (max-width: 768px) {
            .pdfjs-content-area {
              flex-direction: column;
            }

            .pdfjs-sidebar {
              width: 100%;
              border-right: none;
              border-bottom: 1px solid #dee2e6;
            }

            .pdfjs-header {
              flex-direction: column;
              align-items: stretch;
            }

            .pdfjs-actions {
              justify-content: center;
            }
          }
        </style>

        <!-- Header -->
        <div class="pdfjs-header">
          <div class="pdfjs-title-section">
            <div class="pdfjs-icon">📄</div>
            <div>
              <h3 class="pdfjs-title">${fileName}</h3>
              <p class="pdfjs-meta">
                ${pageCount} pages • ${this.formatFileSize(fileSize)}
                <span class="feature-badge">PDF.js Enhanced</span>
              </p>
            </div>
          </div>
          <div class="pdfjs-actions">
            <button class="pdfjs-btn" onclick="window.open('${objectUrl}', '_blank')">
              🔍 Full View
            </button>
            <a href="${objectUrl}" download="${fileName}" class="pdfjs-btn">
              💾 Download
            </a>
          </div>
        </div>

        <!-- Content Area -->
        <div class="pdfjs-content-area">
          <!-- Sidebar with info -->
          <div class="pdfjs-sidebar">
            <div class="info-section">
              <h4>📋 Document Info</h4>
              <div class="info-item">
                <span class="info-label">Pages:</span>
                <span class="info-value">${pageCount}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Size:</span>
                <span class="info-value">${this.formatFileSize(fileSize)}</span>
              </div>
              ${pdfInfo.title && pdfInfo.title !== fileName ? `
              <div class="info-item">
                <span class="info-label">Title:</span>
                <span class="info-value">${pdfInfo.title}</span>
              </div>` : ''}
              ${pdfInfo.author ? `
              <div class="info-item">
                <span class="info-label">Author:</span>
                <span class="info-value">${pdfInfo.author}</span>
              </div>` : ''}
              ${pdfInfo.creator ? `
              <div class="info-item">
                <span class="info-label">Creator:</span>
                <span class="info-value">${pdfInfo.creator}</span>
              </div>` : ''}
            </div>

            ${extractedText && extractedText.length > 20 ? `
            <div class="info-section">
              <h4>📝 Text Preview</h4>
              <div class="text-preview">${extractedText.substring(0, 300)}${extractedText.length > 300 ? '...' : ''}</div>
            </div>` : ''}
          </div>

          <!-- Main view area -->
          <div class="pdfjs-main-view">
            <h4>📄 Page 1 Preview</h4>
            <img src="${pageImageUrl}" alt="PDF Page 1 Preview" class="page-preview" />

            <iframe
              class="pdf-embed-viewer"
              src="${objectUrl}#toolbar=1&navpanes=0&scrollbar=1"
              title="Full PDF Viewer"
            ></iframe>
          </div>
        </div>

        <script>
          console.log('🚀 Advanced PDF.js viewer initialized for ${fileName}');

          // Cleanup on unload
          window.addEventListener('beforeunload', () => {
            try {
              URL.revokeObjectURL('${objectUrl}');
            } catch (e) {
              console.warn('Could not revoke object URL:', e);
            }
          });
        </script>
      </div>
    `;
  }

  private generateFallbackHTML(objectUrl: string, fileName: string, fileSize: number, error: Error): string {
    return `
      <div class="pdfjs-fallback-container">
        <style>
          .pdfjs-fallback-container {
            width: 100%;
            height: 100%;
            min-height: 500px;
            background: #f8f9fa;
            padding: 2rem;
            text-align: center;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }

          .fallback-content {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }

          .fallback-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
            opacity: 0.6;
          }

          .fallback-title {
            font-size: 1.5rem;
            color: #495057;
            margin-bottom: 1rem;
          }

          .fallback-message {
            color: #6c757d;
            margin-bottom: 2rem;
            line-height: 1.6;
          }

          .fallback-viewer {
            width: 100%;
            height: 400px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            margin: 1rem 0;
          }

          .fallback-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
          }

          .fallback-btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s;
          }

          .btn-primary {
            background: #007bff;
            color: white;
          }

          .btn-primary:hover {
            background: #0056b3;
          }

          .btn-success {
            background: #28a745;
            color: white;
          }

          .btn-success:hover {
            background: #1e7e34;
          }
        </style>

        <div class="fallback-content">
          <div class="fallback-icon">📄</div>
          <h3 class="fallback-title">PDF.js Enhancement Unavailable</h3>
          <p class="fallback-message">
            Advanced PDF.js features couldn't be loaded, but the document is still viewable using your browser's built-in PDF viewer.
          </p>

          <iframe
            class="fallback-viewer"
            src="${objectUrl}"
            title="PDF Viewer: ${fileName}"
          ></iframe>

          <div class="fallback-actions">
            <button class="fallback-btn btn-primary" onclick="window.open('${objectUrl}', '_blank')">
              🔍 Open in New Tab
            </button>
            <a href="${objectUrl}" download="${fileName}" class="fallback-btn btn-success">
              💾 Download PDF
            </a>
          </div>

          <details style="margin-top: 1rem; text-align: left;">
            <summary style="cursor: pointer; color: #6c757d;">Technical Details</summary>
            <p style="margin-top: 0.5rem; font-family: monospace; font-size: 0.9rem; color: #6c757d;">
              <strong>File:</strong> ${fileName}<br>
              <strong>Size:</strong> ${this.formatFileSize(fileSize)}<br>
              <strong>Error:</strong> ${error.message}
            </p>
          </details>
        </div>
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