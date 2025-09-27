/**
 * Plugin Loader for Document Preview System
 * Registers and initializes all available preview plugins
 */

import { previewPluginRegistry } from './pluginSystem';
import { DefaultPDFPlugin } from './plugins/defaultPdfPlugin';
import { AdvancedPDFJSPlugin } from './plugins/advancedPdfJsPlugin';
import { ProfessionalDocumentPlugin } from './plugins/professionalDocumentPlugin';
import { PowerPointPreviewPlugin } from './plugins/powerpointPlugin';
import { ExcelPreviewPlugin } from './plugins/excelPlugin';
import { WordPreviewPlugin } from './plugins/wordPlugin';
import { CSVPreviewPlugin } from './plugins/csvPlugin';
import { ImagePreviewPlugin } from './plugins/imagePlugin';
import { RobustOfficePlugin } from './plugins/robustOfficePlugin';
import { ComprehensiveOfficeProcessor } from './plugins/comprehensiveOfficeProcessor';
import { CleanDocxPreviewPlugin } from './plugins/cleanDocxPreviewPlugin';

export class DocumentPreviewPluginLoader {
  private static instance: DocumentPreviewPluginLoader;
  private loaded = false;

  static getInstance(): DocumentPreviewPluginLoader {
    if (!DocumentPreviewPluginLoader.instance) {
      DocumentPreviewPluginLoader.instance = new DocumentPreviewPluginLoader();
    }
    return DocumentPreviewPluginLoader.instance;
  }

  async loadPlugins(): Promise<void> {
    if (this.loaded) {
      return;
    }

    try {
      console.log('🔌 Loading document preview plugins...');

      // Register Default PDF Plugin FIRST (highest priority for ALL PDFs)
      try {
        previewPluginRegistry.register(new DefaultPDFPlugin());
        console.log('✅ Default PDF plugin loaded (HIGHEST PRIORITY - handles ALL PDFs)');
      } catch (error) {
        console.warn('⚠️ Default PDF plugin failed to load:', error);
      }

      // Register Clean DOCX Preview Plugin (HIGHEST priority for DOCX documents - clean interface)
      try {
        previewPluginRegistry.register(new CleanDocxPreviewPlugin());
        console.log('✅ Clean DOCX Preview plugin loaded (HIGHEST PRIORITY - clean DOCX preview without debug metadata)');
      } catch (error) {
        console.warn('⚠️ Clean DOCX Preview plugin failed to load:', error);
      }

      // Register Comprehensive Office Processor (HIGH priority for other Office documents)
      try {
        previewPluginRegistry.register(new ComprehensiveOfficeProcessor());
        console.log('✅ Comprehensive Office Processor loaded (HIGH PRIORITY - advanced Office document handling with multi-stage fallback)');
      } catch (error) {
        console.warn('⚠️ Comprehensive Office Processor failed to load:', error);
      }

      // Register Advanced PDF.js Plugin as secondary PDF option
      try {
        previewPluginRegistry.register(new AdvancedPDFJSPlugin());
        console.log('✅ Advanced PDF.js plugin loaded (secondary PDF handler with enhanced features)');
      } catch (error) {
        console.warn('⚠️ Advanced PDF.js plugin failed to load:', error);
      }

      // Register Robust Office Plugin (secondary for Office documents)
      try {
        previewPluginRegistry.register(new RobustOfficePlugin());
        console.log('✅ Robust Office plugin loaded (secondary Office handler with server-side processing)');
      } catch (error) {
        console.warn('⚠️ Robust Office plugin failed to load:', error);
      }

      // Register Professional Document Plugin third
      try {
        previewPluginRegistry.register(new ProfessionalDocumentPlugin());
        console.log('✅ Professional Document preview plugin loaded');
      } catch (error) {
        console.warn('⚠️ Professional Document plugin failed to load:', error);
      }

      // Register specialized plugins as fallbacks
      try {
        previewPluginRegistry.register(new PowerPointPreviewPlugin());
        console.log('✅ Production PowerPoint preview plugin loaded');
      } catch (error) {
        console.warn('⚠️ PowerPoint plugin failed to load:', error);
      }

      try {
        previewPluginRegistry.register(new ExcelPreviewPlugin());
        console.log('✅ Production Excel preview plugin loaded');
      } catch (error) {
        console.warn('⚠️ Excel plugin failed to load:', error);
      }

      try {
        previewPluginRegistry.register(new WordPreviewPlugin());
        console.log('✅ Production Word preview plugin loaded');
      } catch (error) {
        console.warn('⚠️ Word plugin failed to load:', error);
      }

      try {
        previewPluginRegistry.register(new CSVPreviewPlugin());
        console.log('✅ CSV preview plugin loaded');
      } catch (error) {
        console.warn('⚠️ CSV plugin failed to load:', error);
      }

      try {
        previewPluginRegistry.register(new ImagePreviewPlugin());
        console.log('✅ Image preview plugin loaded');
      } catch (error) {
        console.warn('⚠️ Image plugin failed to load:', error);
      }

      // Log registered plugins with detailed status
      const plugins = previewPluginRegistry.getRegisteredPlugins();
      console.log(`📋 Successfully loaded ${plugins.length} preview plugins:`,
        plugins.map(p => `${p.name} (priority: ${p.priority})`).join(', '));

      // Log supported MIME types with validation
      const supportedTypes = previewPluginRegistry.getSupportedMimeTypes();
      console.log(`🎯 Supporting ${supportedTypes.length} MIME types:`, supportedTypes.slice(0, 10), supportedTypes.length > 10 ? '...' : '');

      // Validate plugin health
      const healthCheck = this.validatePluginHealth(plugins);
      if (healthCheck.criticalIssues.length > 0) {
        console.warn('⚠️ Critical plugin issues detected:', healthCheck.criticalIssues);
      }
      if (healthCheck.warnings.length > 0) {
        console.info('ℹ️ Plugin warnings:', healthCheck.warnings);
      }

      this.loaded = true;
      console.log(`🚀 Document preview plugin system ready with ${plugins.length} active plugins`);

    } catch (error) {
      console.error('❌ Failed to load preview plugins:', error);
      throw error;
    }
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  getLoadedPlugins(): string[] {
    return previewPluginRegistry.getRegisteredPlugins().map(p => p.name);
  }

  getSupportedMimeTypes(): string[] {
    return previewPluginRegistry.getSupportedMimeTypes();
  }

  private validatePluginHealth(plugins: any[]): { criticalIssues: string[], warnings: string[] } {
    const criticalIssues: string[] = [];
    const warnings: string[] = [];

    // Check for essential plugins
    const essentialPlugins = ['DefaultPDFPlugin', 'ComprehensiveOfficeProcessor', 'PowerPointPreview', 'ProductionExcelPreview', 'ProductionWordPreview'];
    for (const essential of essentialPlugins) {
      if (!plugins.find(p => p.name === essential)) {
        criticalIssues.push(`Missing essential plugin: ${essential}`);
      }
    }

    // Check for plugin conflicts (same priority)
    const priorityMap = new Map<number, string[]>();
    for (const plugin of plugins) {
      if (!priorityMap.has(plugin.priority)) {
        priorityMap.set(plugin.priority, []);
      }
      priorityMap.get(plugin.priority)!.push(plugin.name);
    }

    for (const [priority, pluginNames] of priorityMap) {
      if (pluginNames.length > 1) {
        warnings.push(`Priority conflict at level ${priority}: ${pluginNames.join(', ')}`);
      }
    }

    // Check for MIME type coverage
    const supportedTypes = previewPluginRegistry.getSupportedMimeTypes();
    const essentialMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv'
    ];

    for (const essential of essentialMimeTypes) {
      if (!supportedTypes.includes(essential)) {
        warnings.push(`Missing support for essential MIME type: ${essential}`);
      }
    }

    return { criticalIssues, warnings };
  }

  // Add fallback mechanism for plugin failures
  public async getPreviewWithFallback(blob: Blob, fileName: string, mimeType: string): Promise<any> {
    try {
      // Try primary plugin
      const result = await previewPluginRegistry.preview(blob, fileName, mimeType);
      if (result.type === 'success') {
        return result;
      }
      throw new Error('Primary plugin failed');
    } catch (error) {
      console.warn(`⚠️ Primary plugin failed for ${fileName}, attempting fallback:`, error);

      // Fallback strategy
      return this.createFallbackPreview(blob, fileName, mimeType, error as Error);
    }
  }

  private createFallbackPreview(blob: Blob, fileName: string, mimeType: string, originalError: Error): any {
    const extension = fileName.toLowerCase().split('.').pop() || '';
    const fileSize = this.formatFileSize(blob.size);

    return {
      type: 'success',
      format: 'html',
      content: `
        <div class="fallback-preview">
          <style>
            .fallback-preview {
              padding: 2rem;
              text-align: center;
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              border-radius: 12px;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            .fallback-icon {
              font-size: 4rem;
              margin-bottom: 1rem;
              opacity: 0.7;
            }
            .fallback-title {
              font-size: 1.5rem;
              font-weight: 600;
              color: #495057;
              margin-bottom: 1rem;
            }
            .fallback-details {
              background: white;
              padding: 1.5rem;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              margin: 1rem 0;
            }
            .fallback-actions {
              margin-top: 1.5rem;
            }
            .download-btn {
              background: #007bff;
              color: white;
              padding: 0.75rem 1.5rem;
              border: none;
              border-radius: 6px;
              font-weight: 600;
              cursor: pointer;
              text-decoration: none;
              display: inline-block;
            }
            .error-details {
              background: #f8d7da;
              color: #721c24;
              padding: 1rem;
              border-radius: 6px;
              margin-top: 1rem;
              font-size: 0.9rem;
              text-align: left;
            }
          </style>

          <div class="fallback-icon">📄</div>
          <h2 class="fallback-title">Document Preview Unavailable</h2>

          <div class="fallback-details">
            <p><strong>File:</strong> ${fileName}</p>
            <p><strong>Type:</strong> ${mimeType || 'Unknown'}</p>
            <p><strong>Size:</strong> ${fileSize}</p>
            <p><strong>Extension:</strong> .${extension}</p>
          </div>

          <p>The document preview system encountered an error while processing this file. The file appears to be intact and can still be downloaded.</p>

          <div class="fallback-actions">
            <button class="download-btn" onclick="window.open(URL.createObjectURL(new Blob([new Uint8Array()])))">Download File</button>
          </div>

          <div class="error-details">
            <strong>Technical Details:</strong><br>
            ${originalError.message}
          </div>
        </div>
      `,
      metadata: {
        title: fileName,
        fallback: true,
        originalError: originalError.message
      }
    };
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Create global instance
export const pluginLoader = DocumentPreviewPluginLoader.getInstance();