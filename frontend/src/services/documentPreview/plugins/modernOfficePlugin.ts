/**
 * Modern Office Plugin - Uses client-side parsing libraries
 *
 * Handles office documents with proper inline preview:
 * - Excel (xlsx, xls) -> HTML table via SheetJS
 * - Word (docx, doc) -> HTML via Mammoth.js
 *
 * Note: PowerPoint (pptx, ppt) handled by AdvancedPowerPointPreviewPlugin
 */

import { DocumentPreviewPlugin, PluginMetadata, PreviewData } from '../pluginSystem';
import * as XLSX from 'xlsx';

export class ModernOfficePlugin implements DocumentPreviewPlugin {
  name = 'ModernOfficePlugin';
  priority = 400; // Higher than ClientSideDocumentProcessor (350)

  // Required by PreviewPlugin interface - directly on plugin
  supportedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.ms-excel', // xls
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/msword' // doc
  ];
  supportedExtensions = ['.xlsx', '.xls', '.docx', '.doc'];

  metadata: PluginMetadata = {
    name: this.name,
    version: '1.0.0',
    supportedMimeTypes: this.supportedMimeTypes,
    supportedExtensions: this.supportedExtensions,
    description: 'Modern office document preview - Excel & Word only (PowerPoint uses AdvancedPowerPointPreviewPlugin)',
    author: 'DocSafe',
    priority: this.priority
  };

  canPreview(mimeType: string, fileName: string): boolean {
    const extension = fileName.toLowerCase().split('.').pop() || '';

    // Handle Excel files only
    if (mimeType?.includes('spreadsheet') || mimeType?.includes('ms-excel') ||
        ['xlsx', 'xls'].includes(extension)) {
      return true;
    }

    // Handle Word files only
    if (mimeType?.includes('wordprocessing') || mimeType?.includes('msword') ||
        ['docx', 'doc'].includes(extension)) {
      return true;
    }

    // PowerPoint handled by AdvancedPowerPointPreviewPlugin
    return false;
  }

  async preview(blob: Blob, fileName: string, mimeType: string, options?: any): Promise<PreviewData> {
    const extension = fileName.toLowerCase().split('.').pop() || '';

    console.log('📊 ModernOfficePlugin handling:', fileName);

    // EXCEL FILES - Parse with SheetJS
    if (mimeType?.includes('spreadsheet') || mimeType?.includes('ms-excel') ||
        ['xlsx', 'xls'].includes(extension)) {
      return await this.previewExcel(blob, fileName);
    }

    // WORD DOCUMENTS - Convert with Mammoth.js
    if (mimeType?.includes('wordprocessing') || mimeType?.includes('msword') ||
        ['docx', 'doc'].includes(extension)) {
      return await this.previewWord(blob, fileName);
    }

    throw new Error('Unsupported office document type (PowerPoint handled by AdvancedPowerPointPreviewPlugin)');
  }

  private async previewExcel(blob: Blob, fileName: string): Promise<PreviewData> {
    try {
      console.log('📊 Parsing Excel file:', fileName);

      const arrayBuffer = await blob.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to HTML table
      const htmlTable = XLSX.utils.sheet_to_html(worksheet, { id: 'excel-table' });

      console.log('✅ Excel file parsed successfully:', fileName);

      return {
        type: 'html',
        content: `
          <style>
            #excel-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 0.875rem;
            }
            #excel-table td, #excel-table th {
              border: 1px solid #e5e7eb;
              padding: 8px;
              text-align: left;
            }
            #excel-table th {
              background-color: #f3f4f6;
              font-weight: 600;
              position: sticky;
              top: 0;
            }
            #excel-table tr:hover {
              background-color: #f9fafb;
            }
          </style>
          <div class="excel-preview-container" style="padding: 1.5rem;">
            <div style="background-color: #f9fafb; border-radius: 0.5rem; padding: 1rem;">
              <div style="font-size: 0.875rem; color: #4b5563; margin-bottom: 1rem; font-weight: 500;">
                ${fileName} (Sheet: ${sheetName})
              </div>
              <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 0.5rem; overflow: auto; max-height: 600px;">
                ${htmlTable}
              </div>
            </div>
          </div>
        `,
        metadata: {
          plugin: this.name,
          method: 'sheetjs_parse',
          sheets: workbook.SheetNames.length,
          activeSheet: sheetName
        }
      };
    } catch (error) {
      console.error('❌ Excel parsing failed:', error);
      throw new Error(`Excel parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async previewWord(blob: Blob, fileName: string): Promise<PreviewData> {
    try {
      console.log('📝 Converting Word document:', fileName);

      const arrayBuffer = await blob.arrayBuffer();

      // Dynamic import of mammoth (required for proper loading)
      const mammoth = await import('mammoth');

      // Convert to HTML using mammoth
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh"
          ]
        }
      );

      if (result.messages.length > 0) {
        console.warn('⚠️ Word conversion messages:', result.messages);
      }

      console.log('✅ Word document converted successfully:', fileName);

      return {
        type: 'html',
        content: `
          <div class="word-preview-container" style="padding: 1.5rem;">
            <div style="background-color: #f9fafb; border-radius: 0.5rem; padding: 1rem;">
              <div style="font-size: 0.875rem; color: #4b5563; margin-bottom: 1rem; font-weight: 500;">
                ${fileName}
              </div>
              <div class="prose prose-sm max-w-none" style="background-color: white; border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1.5rem; overflow: auto; max-height: 600px;">
                ${result.value}
              </div>
            </div>
          </div>
        `,
        metadata: {
          plugin: this.name,
          method: 'mammoth_convert',
          warnings: result.messages.length
        }
      };
    } catch (error) {
      console.error('❌ Word conversion failed:', error);
      throw new Error(`Word conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

}
