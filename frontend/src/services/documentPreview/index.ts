/**
 * Document Preview System - Central Plugin Registration
 * Registers all available preview plugins and provides easy access to the plugin system
 */

import { previewPluginRegistry } from './pluginSystem';

// Import all available plugins
import { ImagePreviewPlugin } from './plugins/imagePlugin';
import { ExcelPreviewPlugin } from './plugins/excelPlugin';
import { CSVPreviewPlugin } from './plugins/csvPlugin';
import { WordPreviewPlugin } from './plugins/wordPlugin';
import { PowerPointPreviewPlugin } from './plugins/powerpointPlugin';
import { AdvancedPowerPointPreviewPlugin } from './plugins/advancedPowerpointPlugin';
import { PDFPreviewPlugin } from './plugins/pdfPlugin';
import { SimplePDFPlugin } from './plugins/simplePdfPlugin';
import { ProfessionalDocumentPlugin } from './plugins/professionalDocumentPlugin';
import { TextFilePreviewPlugin } from './plugins/textPlugin';

// Import our new PDF plugins
import { DefaultPDFPlugin } from './plugins/defaultPdfPlugin';
import { AdvancedPDFJSPlugin } from './plugins/advancedPdfJsPlugin';

// Import our enhanced plugins
import { EnhancedOfficeDocumentPlugin } from './plugins/enhancedOfficePlugin';
import { EnhancedTextFilePlugin } from './plugins/enhancedTextPlugin';
import { EnhancedImagePreviewPlugin } from './plugins/enhancedImagePlugin';

// Import robust office plugin
import { RobustOfficePlugin } from './plugins/robustOfficePlugin';

// Import universal document processor
import { UniversalDocumentProcessor } from './plugins/universalDocumentProcessor';

// Import our new client-side processor
import { ClientSideDocumentProcessor } from './plugins/clientSideDocumentProcessor';

// Import fallback plugin
import { UniversalFallbackPlugin } from './plugins/fallbackPlugin';

// Import clean DOCX preview plugin
import { CleanDocxPreviewPlugin } from './plugins/cleanDocxPreviewPlugin';

// Import robust DOCX preview plugin
import { RobustDocxPlugin } from './plugins/robustDocxPlugin';

// Import universal formatted preview plugin
import { UniversalFormattedPreviewPlugin } from './plugins/universalFormattedPreviewPlugin';

// Register all plugins with the registry
export function initializePreviewPlugins(): void {
  try {
    console.log('🚀 Initializing document preview plugins with enhanced error handling...');

    // Register plugins in priority order (highest to lowest priority)
    const plugins = [
      new RobustDocxPlugin(),              // Priority: 600 - Robust DOCX preview with multiple fallbacks (HIGHEST PRIORITY for DOCX)
      new UniversalFormattedPreviewPlugin(), // Priority: 590 - Universal formatted preview with cross-file support
      new CleanDocxPreviewPlugin(),        // Priority: 500 - Clean DOCX preview without debug metadata (FALLBACK for DOCX)
      new ClientSideDocumentProcessor(),   // Priority: 350 - Pure client-side document processor (MEDIUM PRIORITY - bypasses all server issues)
      new UniversalDocumentProcessor(),    // Priority: 300 - Universal document processor with robust text extraction (backup for client-side)
      new RobustOfficePlugin(),            // Priority: 150 - Robust Office documents with server-side processing (backup for Office docs)
      new DefaultPDFPlugin(),               // Priority: 100 - Default PDF viewer (HIGHEST PRIORITY for PDFs)
      new AdvancedPDFJSPlugin(),           // Priority: 99 - Advanced PDF.js integration (secondary PDF handler)
      new SimplePDFPlugin(),               // Priority: 98 - Simple PDF viewer (fallback PDF handler)
      new EnhancedOfficeDocumentPlugin(),  // Priority: 97 - Enhanced Office documents with server fallback
      new ProfessionalDocumentPlugin(),     // Priority: 95 - Comprehensive professional documents
      new ExcelPreviewPlugin(),            // Priority: 93 - Excel/Spreadsheet files
      new AdvancedPowerPointPreviewPlugin(),      // Priority: 92 - Advanced PowerPoint
      new PowerPointPreviewPlugin(),       // Priority: 90 - Basic PowerPoint
      new WordPreviewPlugin(),             // Priority: 88 - Word documents
      new PDFPreviewPlugin(),              // Priority: 85 - Complex PDF documents (fallback)
      new EnhancedImagePreviewPlugin(),    // Priority: 81 - Enhanced image processing with error handling
      new ImagePreviewPlugin(),            // Priority: 80 - Image files
      new EnhancedTextFilePlugin(),        // Priority: 79 - Enhanced text files with encoding detection
      new TextFilePreviewPlugin(),         // Priority: 78 - Text files (txt, html, md, etc.)
      new CSVPreviewPlugin(),              // Priority: 75 - CSV files
      new UniversalFallbackPlugin(),       // Priority: 1 - Universal fallback (LOWEST PRIORITY - handles any unsupported type)
    ];

    // Register each plugin with individual error handling
    let successCount = 0;
    let failedPlugins: string[] = [];

    plugins.forEach(plugin => {
      try {
        previewPluginRegistry.register(plugin);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to register plugin '${plugin.name}':`, error);
        failedPlugins.push(plugin.name);
      }
    });

    console.log(`✅ Successfully registered ${successCount}/${plugins.length} preview plugins`);

    if (failedPlugins.length > 0) {
      console.warn(`⚠️ Failed to register ${failedPlugins.length} plugins:`, failedPlugins);
    }

    // Validate critical plugins are loaded
    const registeredPlugins = previewPluginRegistry.getRegisteredPlugins();
    const criticalPlugins = ['ClientSideDocumentProcessor', 'UniversalDocumentProcessor', 'DefaultPDFPlugin', 'RobustOffice', 'EnhancedImagePreview'];
    const missingCritical = criticalPlugins.filter(name =>
      !registeredPlugins.some(plugin => plugin.name === name)
    );

    if (missingCritical.length > 0) {
      console.warn(`⚠️ Missing critical plugins: ${missingCritical.join(', ')}`);
    }

    // Log system health
    const health = previewPluginRegistry.getSystemHealth();
    if (health.healthy) {
      console.log('✅ Preview plugin system is healthy');
    } else {
      console.warn('⚠️ Preview plugin system issues detected:', health.issues);
    }

    // Log supported file types
    const supportedTypes = previewPluginRegistry.getSupportedMimeTypes();
    console.log(`📋 Supporting ${supportedTypes.length} file types:`, supportedTypes.slice(0, 10), supportedTypes.length > 10 ? '...' : '');

  } catch (error) {
    console.error('❌ Critical failure in preview plugin initialization:', error);

    // Try to register at least the fallback plugin to prevent complete failure
    try {
      console.log('🔄 Attempting emergency fallback plugin registration...');
      previewPluginRegistry.register(new UniversalFallbackPlugin());
      console.log('✅ Emergency fallback plugin registered');
    } catch (fallbackError) {
      console.error('❌ Even fallback plugin failed:', fallbackError);
    }

    // Don't throw - let the app continue with whatever plugins we have
    console.warn('⚠️ Preview plugin system running in degraded mode');
  }
}

// Export the registry for direct access
export { previewPluginRegistry };

// Export plugin system types for external use
export type {
  PreviewPlugin,
  PreviewOptions,
  PreviewResult
} from './pluginSystem';

// Convenience function for getting a preview
export async function getDocumentPreview(
  blob: Blob,
  fileName: string,
  mimeType: string,
  options?: any
) {
  return previewPluginRegistry.preview(blob, fileName, mimeType, options);
}

// Initialize plugins immediately when this module is imported
initializePreviewPlugins();