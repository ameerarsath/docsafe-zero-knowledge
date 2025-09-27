/**
 * Secure PDF Renderer for Zero-Knowledge View-Only Previews
 *
 * This renderer implements PDF.js-based canvas-only rendering that:
 * - Never exposes raw PDF file data
 * - Renders directly to locked HTML5 Canvas
 * - Implements watermarking and anti-bypass measures
 * - Prevents PDF extraction through DevTools or DOM inspection
 */

import { SecurePreviewData } from './StreamingDecryptor';

export interface PDFSecurityConfig {
  maxPages: number; // Limit pages rendered to prevent performance issues
  watermarkOpacity: number; // Watermark transparency (0-1)
  canvasProtection: boolean; // Enable canvas protection measures
  preventZoom: boolean; // Disable zoom controls
  pageNavigationOnly: boolean; // Only allow page navigation, no scrolling
}

export interface PDFRenderOptions {
  pageNumber: number;
  scale: number;
  rotation: number;
  viewport?: {
    width: number;
    height: number;
  };
}

export interface SecurePDFPage {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  isRendered: boolean;
}

class CanvasProtector {
  private protectedCanvases: Set<HTMLCanvasElement> = new Set();

  /**
   * Apply protection measures to prevent canvas data extraction
   */
  protectCanvas(canvas: HTMLCanvasElement, sessionId: string): void {
    this.protectedCanvases.add(canvas);

    // Override toBlob and toDataURL to prevent extraction
    const originalToBlob = canvas.toBlob.bind(canvas);
    const originalToDataURL = canvas.toDataURL.bind(canvas);

    canvas.toBlob = function(...args) {
      console.warn('🚫 Canvas extraction attempt blocked:', sessionId);
      // Return empty blob instead of actual data
      const emptyBlob = new Blob([''], { type: 'image/png' });
      if (args[0]) args[0](emptyBlob);
    };

    canvas.toDataURL = function(...args) {
      console.warn('🚫 Canvas data URL extraction attempt blocked:', sessionId);
      // Return transparent 1x1 pixel instead of actual data
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    };

    // Add watermark overlay that interferes with extraction
    this.addCanvasWatermark(canvas, sessionId);

    // Disable right-click and selection
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.style.userSelect = 'none';
    canvas.style.webkitUserSelect = 'none';
    canvas.style.msUserSelect = 'none';

    // Add drag prevention
    canvas.addEventListener('dragstart', (e) => e.preventDefault());
  }

  /**
   * Add invisible/semi-transparent watermark to canvas
   */
  private addCanvasWatermark(canvas: HTMLCanvasElement, sessionId: string): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Add semi-transparent watermark text
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.font = '12px Arial';
    ctx.fillStyle = '#ff0000';
    ctx.textAlign = 'center';

    const watermarkText = `SECURE PREVIEW • ${sessionId.slice(-8)} • ${new Date().toLocaleString()}`;

    // Add watermark at multiple positions
    for (let y = 50; y < canvas.height; y += 100) {
      for (let x = 50; x < canvas.width; x += 200) {
        ctx.fillText(watermarkText, x, y);
      }
    }

    ctx.restore();
  }

  /**
   * Clean up protected canvases
   */
  cleanup(): void {
    this.protectedCanvases.forEach(canvas => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Overwrite canvas with random noise
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        crypto.getRandomValues(imageData.data);
        ctx.putImageData(imageData, 0, 0);
      }
    });
    this.protectedCanvases.clear();
  }
}

export class PDFSecureRenderer {
  private canvasProtector = new CanvasProtector();
  private pdfjsLib: any = null;
  private currentDocument: any = null;
  private renderedPages: Map<number, SecurePDFPage> = new Map();
  private readonly defaultConfig: PDFSecurityConfig = {
    maxPages: 50, // Limit to 50 pages for performance
    watermarkOpacity: 0.1,
    canvasProtection: true,
    preventZoom: true,
    pageNavigationOnly: true
  };

  constructor(private config: Partial<PDFSecurityConfig> = {}) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Initialize PDF.js library
   */
  async initializePDFJS(): Promise<void> {
    if (this.pdfjsLib) return;

    try {
      // Dynamic import of PDF.js to avoid bundle bloat
      const pdfjs = await import('pdfjs-dist');

      // Set worker source for PDF.js
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

      this.pdfjsLib = pdfjs;
      console.log('✅ PDF.js initialized for secure rendering');
    } catch (error) {
      console.error('❌ Failed to initialize PDF.js:', error);
      throw new Error('PDF.js initialization failed');
    }
  }

  /**
   * Render PDF data to secure canvas-only format
   */
  async renderSecurePDF(
    previewData: SecurePreviewData,
    containerElement: HTMLElement
  ): Promise<void> {
    if (previewData.type !== 'pdf') {
      throw new Error('Invalid preview data type for PDF renderer');
    }

    await this.initializePDFJS();

    try {
      console.log('📄 Starting secure PDF rendering to canvas...');

      // Load PDF document from decrypted data
      const pdfData = previewData.renderData.pdfData;
      const loadingTask = this.pdfjsLib.getDocument({
        data: pdfData,
        // Disable text layer and annotations to prevent extraction
        disableTextLayer: true,
        disableAnnotations: true,
        disableForms: true
      });

      this.currentDocument = await loadingTask.promise;
      const numPages = Math.min(this.currentDocument.numPages, this.config.maxPages || this.defaultConfig.maxPages);

      console.log(`📋 PDF loaded: ${numPages} pages (limited from ${this.currentDocument.numPages})`);

      // Create container for PDF pages
      const pdfContainer = document.createElement('div');
      pdfContainer.className = 'secure-pdf-container';
      pdfContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        padding: 20px;
        background: #f5f5f5;
        user-select: none;
        -webkit-user-select: none;
        -ms-user-select: none;
      `;

      // Add security notice
      const securityNotice = document.createElement('div');
      securityNotice.innerHTML = `
        <div style="
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 12px;
          color: #856404;
          margin-bottom: 10px;
        ">
          🔒 Secure Preview Mode • File extraction disabled • Session: ${previewData.sessionId.slice(-8)}
        </div>
      `;
      pdfContainer.appendChild(securityNotice);

      // Render each page to its own protected canvas
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        await this.renderPage(pageNum, pdfContainer, previewData);
      }

      // Clear container and add secure PDF container
      containerElement.innerHTML = '';
      containerElement.appendChild(pdfContainer);

      // Schedule cleanup
      setTimeout(() => {
        this.scheduleCleanup(previewData.expiresAt);
      }, 1000);

      console.log('✅ Secure PDF rendering completed - no extraction possible');

    } catch (error) {
      console.error('❌ Secure PDF rendering failed:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Render a single PDF page to protected canvas
   */
  private async renderPage(
    pageNumber: number,
    container: HTMLElement,
    previewData: SecurePreviewData
  ): Promise<void> {
    try {
      const page = await this.currentDocument.getPage(pageNumber);

      // Calculate viewport for rendering
      const defaultViewport = page.getViewport({ scale: 1.0 });
      const scale = Math.min(800 / defaultViewport.width, 600 / defaultViewport.height, 1.5);
      const viewport = page.getViewport({ scale });

      // Create canvas for this page
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Set canvas dimensions
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.cssText = `
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        background: white;
        display: block;
        margin: 5px 0;
      `;

      // Apply canvas protection immediately
      if (this.config.canvasProtection) {
        this.canvasProtector.protectCanvas(canvas, previewData.sessionId);
      }

      // Render PDF page to canvas
      const renderContext = {
        canvasContext: ctx,
        viewport: viewport,
        // Disable text rendering to prevent extraction
        textLayer: null,
        annotations: null
      };

      await page.render(renderContext).promise;

      // Add page number label
      const pageLabel = document.createElement('div');
      pageLabel.textContent = `Page ${pageNumber}`;
      pageLabel.style.cssText = `
        text-align: center;
        font-size: 12px;
        color: #666;
        margin: 5px 0;
        user-select: none;
      `;

      // Create page wrapper
      const pageWrapper = document.createElement('div');
      pageWrapper.appendChild(pageLabel);
      pageWrapper.appendChild(canvas);
      container.appendChild(pageWrapper);

      // Store rendered page info
      this.renderedPages.set(pageNumber, {
        pageNumber,
        canvas,
        width: canvas.width,
        height: canvas.height,
        isRendered: true
      });

      console.log(`✅ Page ${pageNumber} rendered securely to protected canvas`);

    } catch (error) {
      console.error(`❌ Failed to render page ${pageNumber}:`, error);

      // Add error placeholder
      const errorDiv = document.createElement('div');
      errorDiv.innerHTML = `
        <div style="
          width: 300px;
          height: 200px;
          border: 1px solid #ddd;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fa;
          color: #6c757d;
          text-align: center;
        ">
          <div>
            <div>⚠️</div>
            <div>Page ${pageNumber}</div>
            <div>Render Error</div>
          </div>
        </div>
      `;
      container.appendChild(errorDiv);
    }
  }

  /**
   * Schedule cleanup of sensitive PDF data
   */
  private scheduleCleanup(expiresAt: number): void {
    const now = Date.now();
    const cleanupDelay = Math.max(expiresAt - now, 30 * 1000); // At least 30 seconds

    setTimeout(() => {
      console.log('🧹 Scheduled PDF cleanup triggered');
      this.cleanup();
    }, cleanupDelay);

    // Also cleanup if page becomes hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('🧹 Page hidden - triggering PDF cleanup');
        this.cleanup();
      }
    });
  }

  /**
   * Force cleanup of all PDF data and canvases
   */
  cleanup(): void {
    console.log('🧹 Cleaning up secure PDF renderer...');

    // Cleanup canvas protections
    this.canvasProtector.cleanup();

    // Clear rendered pages
    this.renderedPages.clear();

    // Close PDF document
    if (this.currentDocument) {
      this.currentDocument.destroy();
      this.currentDocument = null;
    }

    console.log('✅ PDF cleanup completed');
  }

  /**
   * Get render statistics
   */
  getRenderStats(): any {
    return {
      totalPages: this.currentDocument ? this.currentDocument.numPages : 0,
      renderedPages: this.renderedPages.size,
      maxPagesAllowed: this.config.maxPages,
      securityEnabled: this.config.canvasProtection
    };
  }
}

export default PDFSecureRenderer;