/**
 * Simple PDF Preview Plugin
 * A basic, reliable PDF viewer without complex dependencies
 * Uses native browser PDF rendering with enhanced UI
 */

import { PreviewPlugin, PreviewResult, PreviewOptions } from '../pluginSystem';

export class SimplePDFPlugin implements PreviewPlugin {
  name = 'SimplePDFPlugin';
  priority = 98; // Higher priority than professional document plugin (95)
  supportedMimeTypes = ['application/pdf'];
  supportedExtensions = ['pdf'];
  description = 'Simple, reliable PDF viewer using native browser capabilities';
  version = '1.0.0';

  canPreview(mimeType: string, fileName: string): boolean {
    console.log(`🔍 SimplePDFPlugin checking: ${fileName} (${mimeType})`);
    const extension = fileName.toLowerCase().split('.').pop();
    const canHandle = this.supportedMimeTypes.includes(mimeType) ||
           (extension && this.supportedExtensions.includes(extension));
    console.log(`📄 SimplePDFPlugin can handle: ${canHandle}`);
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
      console.log(`🚀 SimplePDFPlugin starting preview for ${fileName}`);

      // Create object URL for PDF
      const objectUrl = URL.createObjectURL(blob);

      // Generate simple but effective PDF viewer HTML
      const html = this.generateSimplePDFViewerHTML(objectUrl, fileName, blob.size);

      console.log(`✅ SimplePDFPlugin preview generated successfully`);

      return {
        type: 'success',
        format: 'html',
        content: html,
        metadata: {
          title: fileName,
          pluginName: this.name,
          fileSize: blob.size,
          processingTime: `${(performance.now() - startTime).toFixed(1)}ms`,
          extractionMethod: 'Native browser PDF rendering',
          objectUrl: objectUrl
        },
        performance: {
          startTime,
          endTime: performance.now(),
          duration: performance.now() - startTime
        }
      };

    } catch (error) {
      console.error('❌ Simple PDF preview failed:', error);

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

  private generateSimplePDFViewerHTML(objectUrl: string, fileName: string, fileSize: number): string {
    return `
      <div class="native-pdf-container">
        <style>
          .native-pdf-container {
            width: 100%;
            height: 100vh;
            max-height: calc(100vh - 120px);
            background: #525659;
            position: relative;
            overflow: hidden;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }

          .pdf-native-iframe {
            width: 100%;
            height: 100%;
            border: none;
            background: #525659;
            position: absolute;
            top: 0;
            left: 0;
          }

          .pdf-loading-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #525659;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            z-index: 10;
            transition: opacity 0.3s ease;
          }

          .pdf-loading-overlay.hidden {
            opacity: 0;
            pointer-events: none;
          }

          .loading-content {
            text-align: center;
          }

          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .pdf-error-fallback {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            display: none;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            padding: 2rem;
            text-align: center;
          }

          .pdf-error-fallback.show {
            display: flex;
          }

          .fallback-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }

          .fallback-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #333;
            margin-bottom: 1rem;
          }

          .fallback-message {
            color: #666;
            margin-bottom: 2rem;
            line-height: 1.6;
            max-width: 400px;
          }

          .fallback-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
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

          .btn-secondary {
            background: #6c757d;
            color: white;
          }

          .btn-secondary:hover {
            background: #545b62;
          }
        </style>

        <!-- Loading overlay -->
        <div class="pdf-loading-overlay" id="pdf-loading">
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <div>Loading PDF...</div>
          </div>
        </div>

        <!-- Native PDF iframe (exactly like browser behavior) -->
        <iframe
          class="pdf-native-iframe"
          src="${objectUrl}"
          title="${fileName}"
          id="pdf-iframe-${Date.now()}"
        ></iframe>

        <!-- Error fallback -->
        <div class="pdf-error-fallback" id="pdf-error">
          <div class="fallback-icon">📄</div>
          <div class="fallback-title">PDF Viewer</div>
          <div class="fallback-message">
            Your browser supports PDF viewing. Click below to view or download the document.
          </div>
          <div class="fallback-actions">
            <button class="fallback-btn btn-primary" onclick="window.open('${objectUrl}', '_blank')">
              📄 Open in New Tab
            </button>
            <a href="${objectUrl}" download="${fileName}" class="fallback-btn btn-secondary">
              💾 Download PDF
            </a>
          </div>
        </div>

        <script>
          let loadingTimeout;

          function handlePDFLoaded() {
            console.log('✅ Native PDF viewer loaded successfully');

            // Hide loading overlay
            const loading = document.getElementById('pdf-loading');
            if (loading) {
              loading.classList.add('hidden');
              setTimeout(() => {
                loading.style.display = 'none';
              }, 300);
            }

            // Clear timeout
            if (loadingTimeout) {
              clearTimeout(loadingTimeout);
            }

            // Dispatch success event to parent component
            const renderSuccessEvent = new CustomEvent('pdfRenderSuccess', {
              detail: {
                pluginName: 'SimplePDFPlugin',
                fileName: '${fileName}',
                timestamp: Date.now()
              }
            });
            document.dispatchEvent(renderSuccessEvent);
            console.log('📤 pdfRenderSuccess event dispatched');
          }

          function handlePDFError() {
            console.warn('⚠️ PDF iframe failed to load');
            showErrorFallback();

            // Dispatch error event to parent component
            const renderErrorEvent = new CustomEvent('pdfRenderError', {
              detail: {
                pluginName: 'SimplePDFPlugin',
                fileName: '${fileName}',
                error: 'PDF iframe failed to load',
                timestamp: Date.now()
              }
            });
            document.dispatchEvent(renderErrorEvent);
            console.log('📤 pdfRenderError event dispatched');
          }

          function showErrorFallback() {
            const loading = document.getElementById('pdf-loading');
            const error = document.getElementById('pdf-error');

            if (loading) loading.style.display = 'none';
            if (error) error.classList.add('show');
          }

          // Initialize PDF viewer
          (function() {
            console.log('🚀 Native PDF plugin initializing...');

            // Get the iframe element
            const iframe = document.querySelector('.pdf-native-iframe');

            if (iframe) {
              // Add event listeners directly to the iframe
              iframe.addEventListener('load', handlePDFLoaded);
              iframe.addEventListener('error', handlePDFError);

              console.log('📄 PDF iframe event listeners attached');
            }

            // Set a timeout to show fallback if PDF doesn't load within 10 seconds
            loadingTimeout = setTimeout(() => {
              console.log('⏰ PDF loading timeout, showing fallback');
              showErrorFallback();

              // Dispatch timeout error event
              const renderErrorEvent = new CustomEvent('pdfRenderError', {
                detail: {
                  pluginName: 'SimplePDFPlugin',
                  fileName: '${fileName}',
                  error: 'PDF loading timeout',
                  timestamp: Date.now()
                }
              });
              document.dispatchEvent(renderErrorEvent);
              console.log('📤 pdfRenderError event dispatched (timeout)');
            }, 10000);

            // Alternative detection method - try to detect if the iframe loaded successfully
            setTimeout(() => {
              const loading = document.getElementById('pdf-loading');

              if (iframe && loading && loading.style.display !== 'none') {
                try {
                  // Check if iframe has content (may fail due to CORS)
                  if (iframe.contentDocument || iframe.contentWindow) {
                    handlePDFLoaded();
                  }
                } catch (e) {
                  // CORS error is expected for PDF files, assume it loaded
                  console.log('📄 PDF loaded (CORS restriction is normal)');
                  handlePDFLoaded();
                }
              }
            }, 2000);
          })();
        </script>
      </div>
    `;
  }

  private generateErrorHTML(fileName: string, error: Error): string {
    // Provide specific messages for common PDF issues
    let userMessage = 'We encountered an error while trying to preview this PDF file.';
    let suggestions = 'You can download the file to view it in your system\'s PDF viewer.';
    let errorIcon = '⚠️';

    if (error.message.includes('poppler') || error.message.toLowerCase().includes('page count')) {
      userMessage = 'Server-side PDF processing is not available.';
      suggestions = 'The PDF viewer should still work in most browsers. Try downloading if needed.';
      errorIcon = '🔧';
    } else if (error.message.includes('fetch') || error.message.includes('network')) {
      userMessage = 'Could not download the PDF file.';
      suggestions = 'Check your internet connection and try refreshing the page.';
      errorIcon = '🌐';
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

          .retry-btn {
            background: #28a745;
            color: white;
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
            margin: 0.5rem;
            transition: background-color 0.2s;
          }

          .retry-btn:hover {
            background: #1e7e34;
          }
        </style>

        <div class="error-icon">${errorIcon}</div>
        <h2 class="error-title">PDF Preview Issue</h2>
        <p class="error-message">${userMessage}</p>

        <div class="error-suggestions">
          <strong>Suggestion:</strong> ${suggestions}
        </div>

        <p class="error-message" style="font-size: 0.9rem; color: #999;">
          Technical error: ${error.message}
        </p>

        <button onclick="window.location.reload()" class="retry-btn">
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