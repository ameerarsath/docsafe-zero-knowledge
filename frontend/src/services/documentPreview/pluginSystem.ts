/**
 * Document Preview Plugin System
 * Provides extensible architecture for supporting various document preview types
 */

export interface PreviewPlugin {
  name: string;
  supportedMimeTypes: string[];
  supportedExtensions: string[];
  priority: number; // Higher priority plugins are checked first
  description?: string;
  version?: string;

  canPreview(mimeType: string, fileName: string): boolean;

  preview(
    blob: Blob,
    fileName: string,
    mimeType: string,
    options?: PreviewOptions
  ): Promise<PreviewResult>;
}

export interface PreviewOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  pageNumber?: number;
  slideNumber?: number;
  sheetName?: string;
  extractText?: boolean;
  forceClientSide?: boolean;
  bypassServer?: boolean;
  metadata?: {
    modifiedDate?: string;
    [key: string]: any;
  };
}

export interface PreviewResult {
  type: 'success' | 'error' | 'partial';
  format: 'image' | 'html' | 'iframe' | 'text';
  content?: string; // Base64 image, HTML content, or text
  dataUrl?: string; // Data URL for images
  width?: number;
  height?: number;
  pages?: number;
  slides?: number;
  sheets?: string[];
  text?: string;
  error?: string;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    created?: string;
    modified?: string;
    processingTime?: string;
    extractionMethod?: string;
    fallback?: boolean;
    originalError?: string;
    pluginName?: string;
    fileSize?: number;
    [key: string]: any;
  };
  warnings?: string[];
  performance?: {
    startTime: number;
    endTime: number;
    duration: number;
    memoryUsage?: number;
  };
}

export class DocumentPreviewPluginRegistry {
  private plugins: PreviewPlugin[] = [];
  private failedPlugins: Set<string> = new Set();
  private pluginMetrics: Map<string, PluginMetrics> = new Map();

  register(plugin: PreviewPlugin): void {
    try {
      // Validate plugin before registration
      this.validatePlugin(plugin);

      // Check for duplicate names
      if (this.plugins.find(p => p.name === plugin.name)) {
        console.warn(`⚠️ Plugin '${plugin.name}' already registered, skipping...`);
        return;
      }

      this.plugins.push(plugin);
      // Sort by priority (highest first)
      this.plugins.sort((a, b) => b.priority - a.priority);

      // Initialize metrics
      this.pluginMetrics.set(plugin.name, {
        successCount: 0,
        failureCount: 0,
        averageProcessingTime: 0,
        lastUsed: new Date(),
        totalProcessingTime: 0
      });

      console.log(`✅ Plugin '${plugin.name}' registered successfully with priority ${plugin.priority}`);
    } catch (error) {
      console.error(`❌ Failed to register plugin '${plugin.name}':`, error);
      this.failedPlugins.add(plugin.name);
      throw error;
    }
  }

  private validatePlugin(plugin: PreviewPlugin): void {
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new Error('Plugin must have a valid name');
    }

    if (!plugin.supportedMimeTypes || !Array.isArray(plugin.supportedMimeTypes)) {
      throw new Error('Plugin must have valid supportedMimeTypes array');
    }

    if (!plugin.supportedExtensions || !Array.isArray(plugin.supportedExtensions)) {
      throw new Error('Plugin must have valid supportedExtensions array');
    }

    if (typeof plugin.priority !== 'number' || plugin.priority < 0) {
      throw new Error('Plugin must have a valid priority (number >= 0)');
    }

    if (typeof plugin.canPreview !== 'function') {
      throw new Error('Plugin must implement canPreview method');
    }

    if (typeof plugin.preview !== 'function') {
      throw new Error('Plugin must implement preview method');
    }
  }

  unregister(pluginName: string): void {
    this.plugins = this.plugins.filter(p => p.name !== pluginName);
  }

  getPlugin(mimeType: string, fileName: string): PreviewPlugin | null {
    try {
      // Filter out failed plugins
      const availablePlugins = this.plugins.filter(plugin => !this.failedPlugins.has(plugin.name));

      // Find the best matching plugin
      const matchingPlugin = availablePlugins.find(plugin => {
        try {
          return plugin.canPreview(mimeType, fileName);
        } catch (error) {
          console.warn(`⚠️ Plugin '${plugin.name}' canPreview method failed:`, error);
          this.failedPlugins.add(plugin.name);
          return false;
        }
      });

      if (matchingPlugin) {
        console.log(`🎯 Selected plugin '${matchingPlugin.name}' for ${fileName} (${mimeType})`);
      } else {
        console.warn(`⚠️ No suitable plugin found for ${fileName} (${mimeType})`);
      }

      return matchingPlugin || null;
    } catch (error) {
      console.error('❌ Error in getPlugin:', error);
      return null;
    }
  }

  getSupportedMimeTypes(): string[] {
    const mimeTypes = new Set<string>();
    this.plugins.forEach(plugin => {
      plugin.supportedMimeTypes.forEach(type => mimeTypes.add(type));
    });
    return Array.from(mimeTypes);
  }

  getRegisteredPlugins(): PreviewPlugin[] {
    return [...this.plugins];
  }

  async preview(
    blob: Blob,
    fileName: string,
    mimeType: string,
    options?: PreviewOptions
  ): Promise<PreviewResult> {
    const startTime = performance.now();
    const warnings: string[] = [];

    try {
      // Input validation
      if (!blob || blob.size === 0) {
        throw new Error('Invalid or empty blob provided');
      }

      if (!fileName || fileName.trim() === '') {
        throw new Error('Invalid filename provided');
      }

      // Check file size limits (50MB max)
      const maxFileSize = 50 * 1024 * 1024; // 50MB
      if (blob.size > maxFileSize) {
        warnings.push(`File size (${this.formatFileSize(blob.size)}) exceeds recommended limit (50MB)`);
      }

      console.log(`🔍 Starting preview for ${fileName} (${this.formatFileSize(blob.size)}, ${mimeType})`);

      const plugin = this.getPlugin(mimeType, fileName);

      if (!plugin) {
        return this.createNoPluginFallback(blob, fileName, mimeType, startTime);
      }

      try {
        // Add timeout protection (30 seconds)
        const timeoutPromise = new Promise<PreviewResult>((_, reject) => {
          setTimeout(() => reject(new Error('Preview generation timeout (30s)')), 30000);
        });

        const previewPromise = plugin.preview(blob, fileName, mimeType, options);

        const result = await Promise.race([previewPromise, timeoutPromise]);

        // Update metrics on success
        this.updatePluginMetrics(plugin.name, true, performance.now() - startTime);

        // Enhance result with performance data
        const enhancedResult = {
          ...result,
          warnings: warnings.length > 0 ? warnings : undefined,
          performance: {
            startTime,
            endTime: performance.now(),
            duration: performance.now() - startTime
          },
          metadata: {
            ...result.metadata,
            pluginName: plugin.name,
            processingTime: `${(performance.now() - startTime).toFixed(1)}ms`,
            fileSize: blob.size
          }
        };

        console.log(`✅ Preview completed in ${(performance.now() - startTime).toFixed(1)}ms using ${plugin.name}`);
        return enhancedResult;

      } catch (pluginError) {
        console.error(`❌ Plugin '${plugin.name}' failed:`, pluginError);

        // Update metrics on failure
        this.updatePluginMetrics(plugin.name, false, performance.now() - startTime);

        // Mark plugin as potentially failed
        const metrics = this.pluginMetrics.get(plugin.name);
        if (metrics && metrics.failureCount > 3) {
          console.warn(`⚠️ Plugin '${plugin.name}' has high failure rate, temporarily disabling`);
          this.failedPlugins.add(plugin.name);
        }

        // Try fallback strategies
        return this.createPluginFailureFallback(blob, fileName, mimeType, pluginError as Error, startTime, warnings);
      }

    } catch (error) {
      console.error('❌ Critical error in preview system:', error);
      return this.createCriticalErrorFallback(blob, fileName, mimeType, error as Error, startTime);
    }
  }

  private updatePluginMetrics(pluginName: string, success: boolean, processingTime: number): void {
    const metrics = this.pluginMetrics.get(pluginName);
    if (!metrics) return;

    if (success) {
      metrics.successCount++;
    } else {
      metrics.failureCount++;
    }

    metrics.totalProcessingTime += processingTime;
    metrics.averageProcessingTime = metrics.totalProcessingTime / (metrics.successCount + metrics.failureCount);
    metrics.lastUsed = new Date();
  }

  private createNoPluginFallback(blob: Blob, fileName: string, mimeType: string, startTime: number): PreviewResult {
    const extension = fileName.toLowerCase().split('.').pop() || '';
    return {
      type: 'error',
      format: 'html',
      content: this.generateFallbackHtml({
        title: 'No Preview Available',
        message: `No preview plugin is available for this file type.`,
        fileName,
        fileSize: blob.size,
        mimeType,
        extension,
        icon: '📄',
        suggestions: [
          'Download the file to view it in its native application',
          'Convert the file to a supported format',
          'Contact support if this file type should be supported'
        ]
      }),
      metadata: {
        title: fileName,
        fallback: true,
        processingTime: `${(performance.now() - startTime).toFixed(1)}ms`,
        fileSize: blob.size
      },
      performance: {
        startTime,
        endTime: performance.now(),
        duration: performance.now() - startTime
      }
    };
  }

  private createPluginFailureFallback(blob: Blob, fileName: string, mimeType: string, error: Error, startTime: number, warnings: string[]): PreviewResult {
    const extension = fileName.toLowerCase().split('.').pop() || '';
    return {
      type: 'error',
      format: 'html',
      content: this.generateFallbackHtml({
        title: 'Preview Generation Failed',
        message: 'The preview system encountered an error while processing this file.',
        fileName,
        fileSize: blob.size,
        mimeType,
        extension,
        icon: '⚠️',
        error: error.message,
        suggestions: [
          'Try refreshing the page and uploading again',
          'Ensure the file is not corrupted',
          'Download the file to view it locally',
          'Contact support if the problem persists'
        ]
      }),
      warnings,
      metadata: {
        title: fileName,
        fallback: true,
        originalError: error.message,
        processingTime: `${(performance.now() - startTime).toFixed(1)}ms`,
        fileSize: blob.size
      },
      performance: {
        startTime,
        endTime: performance.now(),
        duration: performance.now() - startTime
      }
    };
  }

  private createCriticalErrorFallback(blob: Blob, fileName: string, mimeType: string, error: Error, startTime: number): PreviewResult {
    return {
      type: 'error',
      format: 'html',
      content: this.generateFallbackHtml({
        title: 'System Error',
        message: 'A critical error occurred in the preview system.',
        fileName,
        fileSize: blob.size,
        mimeType,
        extension: fileName.toLowerCase().split('.').pop() || '',
        icon: '❌',
        error: error.message,
        suggestions: [
          'Refresh the page and try again',
          'Clear your browser cache',
          'Contact technical support'
        ]
      }),
      metadata: {
        title: fileName,
        fallback: true,
        criticalError: true,
        originalError: error.message,
        processingTime: `${(performance.now() - startTime).toFixed(1)}ms`,
        fileSize: blob.size
      },
      performance: {
        startTime,
        endTime: performance.now(),
        duration: performance.now() - startTime
      }
    };
  }

  private generateFallbackHtml(config: {
    title: string;
    message: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    extension: string;
    icon: string;
    error?: string;
    suggestions: string[];
  }): string {
    return `
      <div class="fallback-preview">
        <style>
          .fallback-preview {
            padding: 2rem;
            text-align: center;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 12px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 600px;
            margin: 0 auto;
          }
          .fallback-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
            opacity: 0.8;
          }
          .fallback-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #495057;
            margin-bottom: 1rem;
          }
          .fallback-message {
            color: #6c757d;
            margin-bottom: 1.5rem;
            line-height: 1.6;
          }
          .file-details {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin: 1rem 0;
            text-align: left;
          }
          .file-details h4 {
            margin: 0 0 1rem 0;
            color: #495057;
          }
          .file-detail {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid #f8f9fa;
          }
          .file-detail:last-child {
            border-bottom: none;
          }
          .suggestions {
            background: #e9ecef;
            padding: 1.5rem;
            border-radius: 8px;
            margin-top: 1.5rem;
            text-align: left;
          }
          .suggestions h4 {
            margin: 0 0 1rem 0;
            color: #495057;
          }
          .suggestions ul {
            margin: 0;
            padding-left: 1.5rem;
          }
          .suggestions li {
            margin-bottom: 0.5rem;
            color: #6c757d;
          }
          .error-details {
            background: #f8d7da;
            color: #721c24;
            padding: 1rem;
            border-radius: 6px;
            margin: 1rem 0;
            font-size: 0.9rem;
            text-align: left;
            word-break: break-word;
          }
          .error-details h5 {
            margin: 0 0 0.5rem 0;
          }
        </style>

        <div class="fallback-icon">${config.icon}</div>
        <h2 class="fallback-title">${config.title}</h2>
        <p class="fallback-message">${config.message}</p>

        <div class="file-details">
          <h4>📄 File Information</h4>
          <div class="file-detail"><span>Name:</span><span>${config.fileName}</span></div>
          <div class="file-detail"><span>Type:</span><span>${config.mimeType || 'Unknown'}</span></div>
          <div class="file-detail"><span>Extension:</span><span>.${config.extension}</span></div>
          <div class="file-detail"><span>Size:</span><span>${this.formatFileSize(config.fileSize)}</span></div>
        </div>

        ${config.error ? `
          <div class="error-details">
            <h5>🔍 Technical Details:</h5>
            <p>${config.error}</p>
          </div>
        ` : ''}

        <div class="suggestions">
          <h4>💡 Suggestions</h4>
          <ul>
            ${config.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
          </ul>
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

  // Additional utility methods
  getPluginMetrics(): Map<string, PluginMetrics> {
    return new Map(this.pluginMetrics);
  }

  getFailedPlugins(): string[] {
    return Array.from(this.failedPlugins);
  }

  resetFailedPlugins(): void {
    this.failedPlugins.clear();
    console.log('🔄 Reset failed plugins list');
  }

  getSystemHealth(): { healthy: boolean; issues: string[]; metrics: any } {
    const issues: string[] = [];
    const totalPlugins = this.plugins.length;
    const failedPlugins = this.failedPlugins.size;

    if (totalPlugins === 0) {
      issues.push('No plugins registered');
    }

    if (failedPlugins > totalPlugins / 2) {
      issues.push(`Too many failed plugins: ${failedPlugins}/${totalPlugins}`);
    }

    const metrics = Array.from(this.pluginMetrics.entries()).map(([name, data]) => ({
      name,
      ...data,
      successRate: data.successCount / (data.successCount + data.failureCount) || 0
    }));

    return {
      healthy: issues.length === 0,
      issues,
      metrics
    };
  }
}

// Fix the interface declaration
interface PluginMetrics {
  successCount: number;
  failureCount: number;
  averageProcessingTime: number;
  lastUsed: Date;
  totalProcessingTime: number;
}

// Global registry instance
export const previewPluginRegistry = new DocumentPreviewPluginRegistry();