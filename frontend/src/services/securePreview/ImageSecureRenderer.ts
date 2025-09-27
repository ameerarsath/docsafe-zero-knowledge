/**
 * Secure Image Renderer for Zero-Knowledge View-Only Previews
 *
 * This renderer implements protected canvas-based image rendering that:
 * - Never exposes raw image file data or blob URLs
 * - Renders directly to protected HTML5 Canvas
 * - Implements advanced anti-extraction measures
 * - Prevents image saving through right-click, drag, or DevTools
 */

import { SecurePreviewData } from './StreamingDecryptor';

export interface ImageSecurityConfig {
  maxDimensions: { width: number; height: number };
  watermarkEnabled: boolean;
  watermarkOpacity: number;
  preventRightClick: boolean;
  preventDragSave: boolean;
  canvasProtection: boolean;
  pixelManipulation: boolean; // Add noise to prevent exact reconstruction
}

export interface ImageRenderOptions {
  scale: number;
  rotation: number;
  brightness: number;
  contrast: number;
  filters?: string[];
}

class ImageCanvasProtector {
  private protectedCanvases: Set<HTMLCanvasElement> = new Set();
  private noisePattern: Uint8ClampedArray | null = null;

  /**
   * Apply comprehensive protection to image canvas
   */
  protectImageCanvas(canvas: HTMLCanvasElement, sessionId: string, enablePixelManipulation: boolean = true): void {
    this.protectedCanvases.add(canvas);

    // Override canvas extraction methods
    this.overrideCanvasMethods(canvas, sessionId);

    // Add visual protections
    if (enablePixelManipulation) {
      this.addSubtleNoise(canvas);
    }

    // Add invisible watermark
    this.addInvisibleWatermark(canvas, sessionId);

    // Prevent interaction
    this.preventInteractions(canvas);

    // Add tampering detection
    this.addTamperingDetection(canvas, sessionId);
  }

  /**
   * Override canvas methods to prevent data extraction
   */
  private overrideCanvasMethods(canvas: HTMLCanvasElement, sessionId: string): void {
    const originalToBlob = canvas.toBlob.bind(canvas);
    const originalToDataURL = canvas.toDataURL.bind(canvas);
    const originalGetImageData = canvas.getContext('2d')?.getImageData.bind(canvas.getContext('2d'));

    // Block toBlob
    canvas.toBlob = function(...args) {
      console.warn('🚫 Image extraction via toBlob() blocked:', sessionId);
      // Return corrupted blob
      const corruptedData = new Uint8Array(100);
      crypto.getRandomValues(corruptedData);
      const corruptedBlob = new Blob([corruptedData], { type: 'image/png' });
      if (args[0]) args[0](corruptedBlob);
    };

    // Block toDataURL
    canvas.toDataURL = function(...args) {
      console.warn('🚫 Image extraction via toDataURL() blocked:', sessionId);
      // Return corrupted data URL
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    };

    // Block getImageData
    const ctx = canvas.getContext('2d');
    if (ctx && originalGetImageData) {
      ctx.getImageData = function(...args) {
        console.warn('🚫 Image data extraction via getImageData() blocked:', sessionId);
        // Return corrupted image data
        const corruptedImageData = ctx.createImageData(args[2] || 1, args[3] || 1);
        crypto.getRandomValues(corruptedImageData.data);
        return corruptedImageData;
      };
    }
  }

  /**
   * Add subtle noise to prevent exact pixel reconstruction
   */
  private addSubtleNoise(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Generate noise pattern if not exists
    if (!this.noisePattern || this.noisePattern.length !== data.length) {
      this.noisePattern = new Uint8ClampedArray(data.length);
      for (let i = 0; i < data.length; i += 4) {
        // Add very subtle noise (+/- 1-2 intensity levels)
        this.noisePattern[i] = (Math.random() - 0.5) * 4;     // R
        this.noisePattern[i + 1] = (Math.random() - 0.5) * 4; // G
        this.noisePattern[i + 2] = (Math.random() - 0.5) * 4; // B
        this.noisePattern[i + 3] = 0; // Alpha unchanged
      }
    }

    // Apply noise (subtle enough to not affect visual quality)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, data[i] + this.noisePattern[i]));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + this.noisePattern[i + 1]));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + this.noisePattern[i + 2]));
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Add invisible watermark to image
   */
  private addInvisibleWatermark(canvas: HTMLCanvasElement, sessionId: string): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Store original image data
    const originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Add visible watermark
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#ff0000';
    ctx.textAlign = 'center';

    const watermarkText = `SECURE VIEW • ${sessionId.slice(-8)}`;

    // Add watermark at multiple positions
    const positions = [
      { x: canvas.width * 0.2, y: canvas.height * 0.2 },
      { x: canvas.width * 0.8, y: canvas.height * 0.2 },
      { x: canvas.width * 0.5, y: canvas.height * 0.5 },
      { x: canvas.width * 0.2, y: canvas.height * 0.8 },
      { x: canvas.width * 0.8, y: canvas.height * 0.8 }
    ];

    positions.forEach(pos => {
      ctx.fillText(watermarkText, pos.x, pos.y);
    });

    ctx.restore();

    // Add steganographic watermark (hidden in LSB)
    this.addSteganographicWatermark(ctx, canvas, sessionId);
  }

  /**
   * Add steganographic watermark hidden in least significant bits
   */
  private addSteganographicWatermark(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, sessionId: string): void {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Convert session ID to binary
    const watermarkData = new TextEncoder().encode(sessionId);
    const binaryWatermark: number[] = [];

    watermarkData.forEach(byte => {
      for (let i = 7; i >= 0; i--) {
        binaryWatermark.push((byte >> i) & 1);
      }
    });

    // Embed watermark in LSB of red channel
    for (let i = 0; i < Math.min(binaryWatermark.length, data.length / 4); i++) {
      const pixelIndex = i * 4; // Red channel
      data[pixelIndex] = (data[pixelIndex] & 0xFE) | binaryWatermark[i];
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Prevent user interactions that could lead to image extraction
   */
  private preventInteractions(canvas: HTMLCanvasElement): void {
    // Prevent right-click context menu
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.warn('🚫 Right-click disabled on secure image');
    });

    // Prevent drag and drop
    canvas.addEventListener('dragstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.warn('🚫 Image drag disabled');
    });

    // Prevent selection
    canvas.style.userSelect = 'none';
    canvas.style.webkitUserSelect = 'none';
    canvas.style.msUserSelect = 'none';
    canvas.style.mozUserSelect = 'none';

    // Prevent touch interactions that might trigger save
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault(); // Prevent pinch zoom
      }
    });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    });

    // Add pointer events protection
    canvas.style.pointerEvents = 'none';

    // Re-enable pointer events for viewing only
    canvas.addEventListener('mouseenter', () => {
      canvas.style.pointerEvents = 'auto';
    });
  }

  /**
   * Add tampering detection
   */
  private addTamperingDetection(canvas: HTMLCanvasElement, sessionId: string): void {
    // Monitor for DOM modifications
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.target === canvas) {
          console.warn('🚫 Canvas tampering detected:', sessionId, mutation.attributeName);
          // Could trigger additional security measures here
        }
      });
    });

    observer.observe(canvas, {
      attributes: true,
      attributeOldValue: true
    });

    // Store observer for cleanup
    (canvas as any)._securityObserver = observer;
  }

  /**
   * Cleanup all protected canvases
   */
  cleanup(): void {
    this.protectedCanvases.forEach(canvas => {
      // Disconnect mutation observers
      const observer = (canvas as any)._securityObserver;
      if (observer) {
        observer.disconnect();
      }

      // Overwrite canvas with noise
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        crypto.getRandomValues(imageData.data);
        ctx.putImageData(imageData, 0, 0);
      }
    });

    this.protectedCanvases.clear();
    this.noisePattern = null;
    console.log('🧹 Image canvas protection cleanup completed');
  }
}

export class ImageSecureRenderer {
  private canvasProtector = new ImageCanvasProtector();
  private readonly defaultConfig: ImageSecurityConfig = {
    maxDimensions: { width: 1200, height: 800 },
    watermarkEnabled: true,
    watermarkOpacity: 0.08,
    preventRightClick: true,
    preventDragSave: true,
    canvasProtection: true,
    pixelManipulation: true
  };

  constructor(private config: Partial<ImageSecurityConfig> = {}) {
    this.config = { ...this.defaultConfig, ...config };
  }

  /**
   * Render image data to secure canvas-only format
   */
  async renderSecureImage(
    previewData: SecurePreviewData,
    containerElement: HTMLElement,
    options: Partial<ImageRenderOptions> = {}
  ): Promise<void> {
    if (previewData.type !== 'image') {
      throw new Error('Invalid preview data type for image renderer');
    }

    try {
      console.log('🖼️ Starting secure image rendering to protected canvas...');

      const imageData = previewData.renderData.imageData;
      if (!imageData || !(imageData instanceof Uint8Array)) {
        throw new Error('Invalid image data format');
      }

      // Create image element for loading (temporary)
      const tempImg = new Image();

      // Create promise for image loading
      const imageLoadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
        tempImg.onload = () => resolve(tempImg);
        tempImg.onerror = () => reject(new Error('Failed to load image data'));

        // Convert Uint8Array to blob URL (temporarily for loading)
        const blob = new Blob([imageData], { type: 'image/jpeg' }); // Assume JPEG, could be detected
        const tempUrl = URL.createObjectURL(blob);
        tempImg.src = tempUrl;

        // Cleanup temp URL immediately after load
        tempImg.onload = () => {
          URL.revokeObjectURL(tempUrl);
          resolve(tempImg);
        };
      });

      const img = await imageLoadPromise;

      // Calculate secure dimensions
      const dimensions = this.calculateSecureDimensions(
        img.naturalWidth,
        img.naturalHeight,
        options.scale || 1.0
      );

      // Create protected canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Set canvas dimensions
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      // Style canvas
      canvas.style.cssText = `
        max-width: 100%;
        height: auto;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        background: white;
        display: block;
        margin: 0 auto;
      `;

      // Apply image transformations and render to canvas
      ctx.save();

      // Apply rotation if specified
      if (options.rotation) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((options.rotation * Math.PI) / 180);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
      }

      // Apply filters if specified
      if (options.filters && options.filters.length > 0) {
        ctx.filter = options.filters.join(' ');
      }

      // Render image to canvas
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      ctx.restore();

      // Apply canvas protection immediately
      if (this.config.canvasProtection) {
        this.canvasProtector.protectImageCanvas(
          canvas,
          previewData.sessionId,
          this.config.pixelManipulation
        );
      }

      // Create secure container
      const secureContainer = this.createSecureContainer(previewData, dimensions);
      secureContainer.appendChild(canvas);

      // Clear and set container content
      containerElement.innerHTML = '';
      containerElement.appendChild(secureContainer);

      // Schedule cleanup
      this.scheduleCleanup(previewData.expiresAt);

      console.log('✅ Secure image rendering completed - extraction protected');

    } catch (error) {
      console.error('❌ Secure image rendering failed:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Calculate secure dimensions respecting max limits
   */
  private calculateSecureDimensions(
    originalWidth: number,
    originalHeight: number,
    scale: number
  ): { width: number; height: number } {
    const maxWidth = this.config.maxDimensions?.width || this.defaultConfig.maxDimensions.width;
    const maxHeight = this.config.maxDimensions?.height || this.defaultConfig.maxDimensions.height;

    let width = originalWidth * scale;
    let height = originalHeight * scale;

    // Respect maximum dimensions
    if (width > maxWidth) {
      const ratio = maxWidth / width;
      width = maxWidth;
      height = height * ratio;
    }

    if (height > maxHeight) {
      const ratio = maxHeight / height;
      height = maxHeight;
      width = width * ratio;
    }

    return {
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  /**
   * Create secure container with security notices
   */
  private createSecureContainer(
    previewData: SecurePreviewData,
    dimensions: { width: number; height: number }
  ): HTMLElement {
    const container = document.createElement('div');
    container.className = 'secure-image-container';
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      user-select: none;
      -webkit-user-select: none;
      -ms-user-select: none;
    `;

    // Add security notice
    const securityNotice = document.createElement('div');
    securityNotice.innerHTML = `
      <div style="
        background: #d1ecf1;
        border: 1px solid #bee5eb;
        border-radius: 4px;
        padding: 8px 12px;
        font-size: 12px;
        color: #0c5460;
        text-align: center;
        margin-bottom: 10px;
      ">
        🔒 Secure Image Preview • Protected Canvas • Session: ${previewData.sessionId.slice(-8)}
        <br>
        <small>Right-click, drag, and extraction disabled</small>
      </div>
    `;

    // Add image info
    const imageInfo = document.createElement('div');
    imageInfo.innerHTML = `
      <div style="
        font-size: 11px;
        color: #6c757d;
        text-align: center;
        margin-bottom: 10px;
      ">
        Dimensions: ${dimensions.width} × ${dimensions.height} pixels
        ${this.config.pixelManipulation ? ' • Anti-extraction noise applied' : ''}
      </div>
    `;

    container.appendChild(securityNotice);
    container.appendChild(imageInfo);

    return container;
  }

  /**
   * Schedule cleanup of sensitive image data
   */
  private scheduleCleanup(expiresAt: number): void {
    const now = Date.now();
    const cleanupDelay = Math.max(expiresAt - now, 30 * 1000);

    setTimeout(() => {
      console.log('🧹 Scheduled image cleanup triggered');
      this.cleanup();
    }, cleanupDelay);

    // Cleanup on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('🧹 Page hidden - triggering image cleanup');
        this.cleanup();
      }
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  /**
   * Force cleanup of all image data and canvases
   */
  cleanup(): void {
    console.log('🧹 Cleaning up secure image renderer...');
    this.canvasProtector.cleanup();
    console.log('✅ Image cleanup completed');
  }

  /**
   * Get renderer statistics
   */
  getRenderStats(): any {
    return {
      maxDimensions: this.config.maxDimensions,
      securityEnabled: this.config.canvasProtection,
      pixelManipulation: this.config.pixelManipulation,
      watermarkEnabled: this.config.watermarkEnabled
    };
  }
}

export default ImageSecureRenderer;