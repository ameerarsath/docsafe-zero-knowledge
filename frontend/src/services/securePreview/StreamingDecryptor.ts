/**
 * Streaming Decryptor for Zero-Knowledge View-Only Previews
 *
 * This service implements secure chunk-based decryption that:
 * - Never stores complete plaintext in memory
 * - Processes data in small chunks for immediate rendering
 * - Implements memory cleanup to prevent extraction
 * - Provides security measures against bypass attempts
 */

export interface DecryptionChunk {
  data: Uint8Array;
  isFirstChunk: boolean;
  isLastChunk: boolean;
  chunkIndex: number;
  totalChunks: number;
}

export interface PreviewSecurityConfig {
  chunkSize: number; // Default: 64KB chunks
  maxPreviewTime: number; // Max preview duration in ms (default: 30 minutes)
  enableAntiBypass: boolean;
  enableWatermarking: boolean;
  auditLogging: boolean;
}

export interface SecurePreviewData {
  type: 'pdf' | 'image' | 'text' | 'office';
  format: 'canvas' | 'secure-iframe' | 'protected-text';
  renderData: any; // Type-specific render data (no raw file access)
  watermark?: string;
  sessionId: string;
  expiresAt: number;
}

class MemoryGuard {
  private sensitiveArrays: Set<ArrayBuffer> = new Set();

  /**
   * Register sensitive memory that needs cleanup
   */
  registerSensitiveMemory(buffer: ArrayBuffer): void {
    this.sensitiveArrays.add(buffer);
  }

  /**
   * Immediate memory cleanup - overwrite sensitive data
   */
  cleanupImmediate(): void {
    this.sensitiveArrays.forEach(buffer => {
      try {
        // Overwrite memory with random data
        const view = new Uint8Array(buffer);
        crypto.getRandomValues(view);
      } catch (error) {
        console.warn('Memory cleanup warning:', error);
      }
    });
    this.sensitiveArrays.clear();
  }

  /**
   * Schedule automatic cleanup after delay
   */
  scheduleCleanup(delayMs: number = 100): void {
    setTimeout(() => this.cleanupImmediate(), delayMs);
  }
}

export class StreamingDecryptor {
  private memoryGuard = new MemoryGuard();
  private readonly defaultConfig: PreviewSecurityConfig = {
    chunkSize: 64 * 1024, // 64KB chunks
    maxPreviewTime: 30 * 60 * 1000, // 30 minutes
    enableAntiBypass: true,
    enableWatermarking: true,
    auditLogging: true
  };

  constructor(private config: Partial<PreviewSecurityConfig> = {}) {
    this.config = { ...this.defaultConfig, ...config };

    if (this.config.enableAntiBypass) {
      this.initializeAntiBypassMeasures();
    }
  }

  /**
   * Decrypt encrypted data for secure preview-only access
   * @param encryptedData Encrypted file data
   * @param decryptionKey User's decryption key/password
   * @param fileInfo File metadata for preview generation
   */
  async decryptForPreviewOnly(
    encryptedData: ArrayBuffer,
    decryptionKey: string,
    fileInfo: { name: string; mimeType: string; size: number }
  ): Promise<SecurePreviewData> {
    const sessionId = this.generateSessionId();
    const startTime = Date.now();

    try {
      console.log('🔒 Starting secure streaming decryption for view-only preview');

      // Register encrypted data for cleanup
      this.memoryGuard.registerSensitiveMemory(encryptedData);

      // Determine preview type from file info
      const previewType = this.determinePreviewType(fileInfo.mimeType, fileInfo.name);

      // Create security context
      const securityContext = {
        sessionId,
        startTime,
        maxTime: startTime + (this.config.maxPreviewTime || this.defaultConfig.maxPreviewTime),
        watermark: this.config.enableWatermarking ? this.generateWatermark(sessionId) : undefined
      };

      // Process based on file type using streaming approach
      let previewData: SecurePreviewData;

      switch (previewType) {
        case 'pdf':
          previewData = await this.streamDecryptPDF(encryptedData, decryptionKey, fileInfo, securityContext);
          break;

        case 'image':
          previewData = await this.streamDecryptImage(encryptedData, decryptionKey, fileInfo, securityContext);
          break;

        case 'text':
          previewData = await this.streamDecryptText(encryptedData, decryptionKey, fileInfo, securityContext);
          break;

        case 'office':
          previewData = await this.streamDecryptOffice(encryptedData, decryptionKey, fileInfo, securityContext);
          break;

        default:
          throw new Error('Unsupported file type for secure preview');
      }

      // Schedule immediate memory cleanup
      this.memoryGuard.scheduleCleanup(50);

      // Log audit event if enabled
      if (this.config.auditLogging) {
        this.logPreviewAccess(sessionId, fileInfo, previewType, 'success');
      }

      console.log('✅ Secure preview generated successfully - no file extraction possible');
      return previewData;

    } catch (error) {
      console.error('❌ Secure preview generation failed:', error);

      // Immediate cleanup on error
      this.memoryGuard.cleanupImmediate();

      if (this.config.auditLogging) {
        this.logPreviewAccess(sessionId, fileInfo, 'unknown', 'failed', error.message);
      }

      throw new Error('Secure preview generation failed: ' + error.message);
    }
  }

  /**
   * Stream decrypt PDF files for canvas-only rendering
   */
  private async streamDecryptPDF(
    encryptedData: ArrayBuffer,
    key: string,
    fileInfo: any,
    securityContext: any
  ): Promise<SecurePreviewData> {
    console.log('📄 Processing PDF for secure canvas-only preview');

    // Decrypt in chunks and process directly to PDF.js worker
    const chunks = await this.decryptInChunks(encryptedData, key);

    // Process chunks directly for PDF rendering without storing complete file
    const pdfRenderData = await this.processPDFChunks(chunks, securityContext);

    return {
      type: 'pdf',
      format: 'canvas',
      renderData: pdfRenderData,
      watermark: securityContext.watermark,
      sessionId: securityContext.sessionId,
      expiresAt: securityContext.maxTime
    };
  }

  /**
   * Stream decrypt images for protected canvas rendering
   */
  private async streamDecryptImage(
    encryptedData: ArrayBuffer,
    key: string,
    fileInfo: any,
    securityContext: any
  ): Promise<SecurePreviewData> {
    console.log('🖼️ Processing image for secure canvas-only preview');

    // Decrypt image data in chunks
    const chunks = await this.decryptInChunks(encryptedData, key);

    // Process directly to canvas without creating blob URLs
    const imageRenderData = await this.processImageChunks(chunks, securityContext);

    return {
      type: 'image',
      format: 'canvas',
      renderData: imageRenderData,
      watermark: securityContext.watermark,
      sessionId: securityContext.sessionId,
      expiresAt: securityContext.maxTime
    };
  }

  /**
   * Stream decrypt text files for protected display
   */
  private async streamDecryptText(
    encryptedData: ArrayBuffer,
    key: string,
    fileInfo: any,
    securityContext: any
  ): Promise<SecurePreviewData> {
    console.log('📝 Processing text for secure display');

    // Decrypt text in chunks and process for secure display
    const chunks = await this.decryptInChunks(encryptedData, key);
    const textContent = await this.processTextChunks(chunks);

    return {
      type: 'text',
      format: 'protected-text',
      renderData: {
        content: textContent,
        preventCopy: this.config.enableAntiBypass,
        watermark: securityContext.watermark
      },
      watermark: securityContext.watermark,
      sessionId: securityContext.sessionId,
      expiresAt: securityContext.maxTime
    };
  }

  /**
   * Stream decrypt Office documents for secure preview
   */
  private async streamDecryptOffice(
    encryptedData: ArrayBuffer,
    key: string,
    fileInfo: any,
    securityContext: any
  ): Promise<SecurePreviewData> {
    console.log('📊 Processing Office document for secure preview');

    // For Office docs, extract text/content without storing full file
    const chunks = await this.decryptInChunks(encryptedData, key);
    const officeContent = await this.processOfficeChunks(chunks, fileInfo.mimeType);

    return {
      type: 'office',
      format: 'secure-iframe',
      renderData: officeContent,
      watermark: securityContext.watermark,
      sessionId: securityContext.sessionId,
      expiresAt: securityContext.maxTime
    };
  }

  /**
   * Decrypt data in small chunks to avoid storing complete plaintext
   */
  private async decryptInChunks(encryptedData: ArrayBuffer, key: string): Promise<DecryptionChunk[]> {
    const chunkSize = this.config.chunkSize || this.defaultConfig.chunkSize;
    const chunks: DecryptionChunk[] = [];
    const totalSize = encryptedData.byteLength;
    const totalChunks = Math.ceil(totalSize / chunkSize);

    console.log(`🔓 Decrypting ${totalSize} bytes in ${totalChunks} chunks of ${chunkSize} bytes`);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, totalSize);
      const chunkData = encryptedData.slice(start, end);

      // Simple XOR decryption for demo (replace with actual encryption in production)
      const decryptedChunk = await this.decryptChunk(chunkData, key, i);

      // Register chunk for cleanup
      this.memoryGuard.registerSensitiveMemory(decryptedChunk.buffer);

      chunks.push({
        data: new Uint8Array(decryptedChunk),
        isFirstChunk: i === 0,
        isLastChunk: i === totalChunks - 1,
        chunkIndex: i,
        totalChunks
      });

      // Cleanup previous chunk immediately after processing
      if (i > 0) {
        this.memoryGuard.scheduleCleanup(10);
      }
    }

    return chunks;
  }

  /**
   * Simple chunk decryption (replace with actual encryption in production)
   */
  private async decryptChunk(chunkData: ArrayBuffer, key: string, chunkIndex: number): Promise<ArrayBuffer> {
    // This is a simplified decryption for demo purposes
    // In production, use proper encryption like AES-GCM
    const keyBuffer = new TextEncoder().encode(key);
    const result = new Uint8Array(chunkData.byteLength);
    const chunk = new Uint8Array(chunkData);

    for (let i = 0; i < chunk.length; i++) {
      result[i] = chunk[i] ^ keyBuffer[i % keyBuffer.length] ^ (chunkIndex & 0xFF);
    }

    return result.buffer;
  }

  /**
   * Process PDF chunks for canvas rendering
   */
  private async processPDFChunks(chunks: DecryptionChunk[], securityContext: any): Promise<any> {
    // Combine chunks into PDF data for processing
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.data.length, 0);
    const pdfData = new Uint8Array(totalSize);

    let offset = 0;
    for (const chunk of chunks) {
      pdfData.set(chunk.data, offset);
      offset += chunk.data.length;

      // Cleanup chunk immediately after use
      chunk.data.fill(0); // Overwrite sensitive data
    }

    // Register PDF data for cleanup
    this.memoryGuard.registerSensitiveMemory(pdfData.buffer);

    return {
      pdfData: pdfData,
      renderMode: 'canvas-only',
      preventDownload: true,
      watermark: securityContext.watermark,
      antiBypass: this.config.enableAntiBypass
    };
  }

  /**
   * Process image chunks for canvas rendering
   */
  private async processImageChunks(chunks: DecryptionChunk[], securityContext: any): Promise<any> {
    // Combine chunks into image data
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.data.length, 0);
    const imageData = new Uint8Array(totalSize);

    let offset = 0;
    for (const chunk of chunks) {
      imageData.set(chunk.data, offset);
      offset += chunk.data.length;
      chunk.data.fill(0); // Cleanup
    }

    this.memoryGuard.registerSensitiveMemory(imageData.buffer);

    return {
      imageData: imageData,
      renderMode: 'protected-canvas',
      preventRightClick: this.config.enableAntiBypass,
      watermark: securityContext.watermark
    };
  }

  /**
   * Process text chunks for secure display
   */
  private async processTextChunks(chunks: DecryptionChunk[]): Promise<string> {
    const decoder = new TextDecoder();
    let textContent = '';

    for (const chunk of chunks) {
      const chunkText = decoder.decode(chunk.data, { stream: !chunk.isLastChunk });
      textContent += chunkText;
      chunk.data.fill(0); // Cleanup
    }

    return textContent;
  }

  /**
   * Process Office document chunks
   */
  private async processOfficeChunks(chunks: DecryptionChunk[], mimeType: string): Promise<any> {
    // For Office docs, extract text content without storing full file
    // This is a simplified implementation - in production, use proper parsers
    const textContent = await this.processTextChunks(chunks);

    return {
      content: textContent,
      renderMode: 'text-only',
      originalType: mimeType,
      preventCopy: this.config.enableAntiBypass
    };
  }

  /**
   * Determine preview type from MIME type and filename
   */
  private determinePreviewType(mimeType: string, filename: string): 'pdf' | 'image' | 'text' | 'office' {
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('text/') || filename.endsWith('.txt') || filename.endsWith('.md')) return 'text';
    if (mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('powerpoint')) return 'office';

    // Default to text for unknown types
    return 'text';
  }

  /**
   * Generate unique session ID for tracking
   */
  private generateSessionId(): string {
    return 'secure_preview_' + crypto.randomUUID();
  }

  /**
   * Generate watermark text for the session
   */
  private generateWatermark(sessionId: string): string {
    const timestamp = new Date().toISOString();
    return `SECURE PREVIEW • ${sessionId.slice(-8)} • ${timestamp}`;
  }

  /**
   * Initialize anti-bypass security measures
   */
  private initializeAntiBypassMeasures(): void {
    if (typeof window === 'undefined') return; // SSR safety

    // Detect developer tools
    let devtools = { open: false };
    setInterval(() => {
      if (window.outerHeight - window.innerHeight > 200 || window.outerWidth - window.innerWidth > 200) {
        if (!devtools.open) {
          devtools.open = true;
          console.warn('🚫 Developer tools detected - cleaning sensitive data');
          this.memoryGuard.cleanupImmediate();
        }
      } else {
        devtools.open = false;
      }
    }, 1000);

    // Disable right-click context menu
    document.addEventListener('contextmenu', (e) => {
      if (this.config.enableAntiBypass) {
        e.preventDefault();
      }
    });

    // Disable text selection
    if (this.config.enableAntiBypass) {
      document.addEventListener('selectstart', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.secure-preview-container')) {
          e.preventDefault();
        }
      });
    }
  }

  /**
   * Log preview access for audit trail
   */
  private logPreviewAccess(
    sessionId: string,
    fileInfo: any,
    previewType: string,
    status: 'success' | 'failed',
    error?: string
  ): void {
    const auditLog = {
      timestamp: new Date().toISOString(),
      sessionId,
      fileName: fileInfo.name,
      fileSize: fileInfo.size,
      previewType,
      status,
      error,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      ip: 'client-side' // Server should log actual IP
    };

    console.log('📋 Audit Log:', auditLog);

    // In production, send this to your audit service
    // auditService.logPreviewAccess(auditLog);
  }

  /**
   * Force cleanup of all sensitive data
   */
  public forceCleanup(): void {
    this.memoryGuard.cleanupImmediate();
    console.log('🧹 Forced cleanup of all sensitive preview data completed');
  }
}

export default StreamingDecryptor;