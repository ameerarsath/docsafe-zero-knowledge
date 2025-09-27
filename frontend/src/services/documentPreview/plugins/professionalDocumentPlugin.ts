/**
 * Professional Document Preview Plugin
 * Unified plugin for handling PPTX, PDF, and DOCX files with modern UI/UX
 */

import { PreviewPlugin, PreviewResult, PreviewOptions } from '../pluginSystem';
import JSZip from 'jszip';

// Core interfaces
interface DocumentPage {
  pageNumber: number;
  content: string;
  title?: string;
  images: DocumentImage[];
  tables: DocumentTable[];
  notes?: string;
  thumbnail?: string;
  type: 'slide' | 'page' | 'section';
}

interface DocumentImage {
  id: string;
  name: string;
  base64Data: string;
  width?: number;
  height?: number;
  caption?: string;
}

interface DocumentTable {
  id: string;
  rows: number;
  columns: number;
  data: string[][];
  hasHeader: boolean;
  caption?: string;
}

interface DocumentMetadata {
  title: string;
  author: string;
  subject: string;
  created: string;
  modified: string;
  pages: number;
  fileSize: number;
  type: 'pptx' | 'docx';
  wordCount: number;
  hasImages: boolean;
  hasTables: boolean;
}

interface ProcessedDocument {
  metadata: DocumentMetadata;
  pages: DocumentPage[];
  searchableText: string;
  extractionSuccess: boolean;
  processingTime: number;
}

export class ProfessionalDocumentPlugin implements PreviewPlugin {
  name = 'ProfessionalDocumentPreview';
  priority = 95; // High priority for PPTX/DOCX only

  supportedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  supportedExtensions = ['.pptx', '.docx'];

  canPreview(mimeType: string, fileName: string): boolean {
    const extension = fileName.toLowerCase().split('.').pop();
    return this.supportedMimeTypes.includes(mimeType) ||
           (extension && this.supportedExtensions.includes(`.${extension}`));
  }

  async preview(
    blob: Blob,
    fileName: string,
    mimeType: string,
    options?: PreviewOptions
  ): Promise<PreviewResult> {
    const startTime = performance.now();

    try {
      console.log('🚀 Professional Document Plugin: Starting preview for', fileName);

      const extension = fileName.toLowerCase().split('.').pop();
      let document: ProcessedDocument;

      switch (extension) {
        case 'pptx':
          document = await this.processPowerPoint(blob, fileName);
          break;
        case 'docx':
          document = await this.processWord(blob, fileName);
          break;
        default:
          throw new Error(`Unsupported file type: ${extension}`);
      }

      document.processingTime = performance.now() - startTime;

      const previewHtml = this.generateDocumentViewer(document, fileName);

      return {
        type: 'success',
        format: 'html',
        content: previewHtml,
        metadata: {
          title: fileName,
          pages: document.metadata.pages,
          extractionMethod: document.extractionSuccess ? 'full' : 'partial',
          processingTime: `${document.processingTime.toFixed(1)}ms`,
          fileSize: blob.size,
          pluginName: this.name
        }
      };
    } catch (error) {
      console.error('❌ Professional Document Plugin failed:', error);
      return {
        type: 'error',
        format: 'text',
        error: error instanceof Error ? error.message : 'Document processing failed'
      };
    }
  }

  private async processPowerPoint(blob: Blob, fileName: string): Promise<ProcessedDocument> {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(blob);

    // Extract slides
    const slideFiles = Object.keys(zipContent.files)
      .filter(path => path.startsWith('ppt/slides/slide') && path.endsWith('.xml'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
        const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
        return numA - numB;
      });

    const images = await this.extractPowerPointImages(zipContent);
    const pages: DocumentPage[] = [];
    let searchableText = '';

    for (let i = 0; i < slideFiles.length; i++) {
      const slideFile = zipContent.files[slideFiles[i]];
      if (slideFile) {
        const slideXml = await slideFile.async('text');
        const page = await this.parsePowerPointSlide(slideXml, i + 1, images);
        pages.push(page);
        searchableText += `${page.title} ${page.content} `;
      }
    }

    const metadata = await this.extractPowerPointMetadata(zipContent, blob.size, pages);

    return {
      metadata,
      pages,
      searchableText: searchableText.trim(),
      extractionSuccess: true,
      processingTime: 0
    };
  }

  private async processWord(blob: Blob, fileName: string): Promise<ProcessedDocument> {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(blob);

    // Extract document content
    const documentFile = zipContent.files['word/document.xml'];
    if (!documentFile) {
      throw new Error('Invalid DOCX file: document.xml not found');
    }

    const documentXml = await documentFile.async('text');
    const images = await this.extractWordImages(zipContent);
    const pages = await this.parseWordDocument(documentXml, images);

    const searchableText = pages.map(p => `${p.title || ''} ${p.content}`).join(' ');
    const metadata = await this.extractWordMetadata(zipContent, blob.size, pages);

    return {
      metadata,
      pages,
      searchableText: searchableText.trim(),
      extractionSuccess: true,
      processingTime: 0
    };
  }


  private async parsePowerPointSlide(
    xmlContent: string,
    slideNumber: number,
    allImages: DocumentImage[]
  ): Promise<DocumentPage> {
    // Extract text content
    const textMatches = xmlContent.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
    const allText = textMatches
      .map(match => match.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '').trim())
      .filter(text => text.length > 0);

    // Extract title
    let title = '';
    const titleMatch = xmlContent.match(/<p:sp[^>]*>.*?<p:nvSpPr>.*?<p:cNvPr[^>]*name="Title[^"]*".*?<\/p:sp>/s);
    if (titleMatch) {
      const titleTextMatches = titleMatch[0].match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
      title = titleTextMatches
        .map(match => match.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '').trim())
        .join(' ');
    }
    if (!title && allText.length > 0) {
      title = allText[0];
    }

    // Extract content (excluding title)
    const content = allText.slice(title ? 1 : 0).join('\n');

    // Extract tables
    const tables = this.extractTablesFromXml(xmlContent);

    return {
      pageNumber: slideNumber,
      title: title || `Slide ${slideNumber}`,
      content,
      images: allImages.filter(img => img.id.includes(`slide${slideNumber}`)),
      tables,
      type: 'slide'
    };
  }

  private async parseWordDocument(
    xmlContent: string,
    images: DocumentImage[]
  ): Promise<DocumentPage[]> {
    // Parse Word document into logical pages/sections
    const paragraphs = xmlContent.match(/<w:p[^>]*>[\s\S]*?<\/w:p>/g) || [];
    const pages: DocumentPage[] = [];
    let currentPage: DocumentPage = {
      pageNumber: 1,
      content: '',
      images: [],
      tables: [],
      type: 'page'
    };

    let pageBreakCount = 1;

    for (const paragraph of paragraphs) {
      // Check for page breaks
      if (paragraph.includes('<w:br') && paragraph.includes('type="page"')) {
        if (currentPage.content.trim()) {
          pages.push(currentPage);
        }
        pageBreakCount++;
        currentPage = {
          pageNumber: pageBreakCount,
          content: '',
          images: [],
          tables: [],
          type: 'page'
        };
        continue;
      }

      // Extract text from paragraph
      const textMatches = paragraph.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
      const text = textMatches
        .map(match => match.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '').trim())
        .join(' ')
        .trim();

      if (text) {
        currentPage.content += text + '\n';
      }
    }

    // Add the last page
    if (currentPage.content.trim()) {
      pages.push(currentPage);
    }

    // If no pages were created, create a single page with all content
    if (pages.length === 0) {
      const allText = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
      const content = allText
        .map(match => match.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, '').trim())
        .filter(text => text.length > 0)
        .join(' ');

      pages.push({
        pageNumber: 1,
        content,
        images,
        tables: this.extractTablesFromXml(xmlContent),
        type: 'page'
      });
    }

    return pages;
  }

  private async extractPowerPointImages(zipContent: JSZip): Promise<DocumentImage[]> {
    const images: DocumentImage[] = [];
    const mediaFiles = Object.keys(zipContent.files).filter(path =>
      path.startsWith('ppt/media/') &&
      /\.(png|jpg|jpeg|gif|bmp|tiff|svg)$/i.test(path)
    );

    for (const mediaPath of mediaFiles) {
      const mediaFile = zipContent.files[mediaPath];
      if (mediaFile) {
        try {
          const arrayBuffer = await mediaFile.async('arraybuffer');
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          const fileName = mediaPath.split('/').pop() || '';
          const extension = fileName.split('.').pop()?.toLowerCase() || '';

          images.push({
            id: `img-${images.length + 1}`,
            name: fileName,
            base64Data: base64,
            caption: fileName
          });
        } catch (error) {
          console.warn(`Failed to extract image ${mediaPath}:`, error);
        }
      }
    }

    return images;
  }

  private async extractWordImages(zipContent: JSZip): Promise<DocumentImage[]> {
    const images: DocumentImage[] = [];
    const mediaFiles = Object.keys(zipContent.files).filter(path =>
      path.startsWith('word/media/') &&
      /\.(png|jpg|jpeg|gif|bmp|tiff|svg)$/i.test(path)
    );

    for (const mediaPath of mediaFiles) {
      const mediaFile = zipContent.files[mediaPath];
      if (mediaFile) {
        try {
          const arrayBuffer = await mediaFile.async('arraybuffer');
          const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          const fileName = mediaPath.split('/').pop() || '';

          images.push({
            id: `img-${images.length + 1}`,
            name: fileName,
            base64Data: base64,
            caption: fileName
          });
        } catch (error) {
          console.warn(`Failed to extract image ${mediaPath}:`, error);
        }
      }
    }

    return images;
  }

  private extractTablesFromXml(xmlContent: string): DocumentTable[] {
    const tables: DocumentTable[] = [];

    // PowerPoint tables
    const pptTableMatches = xmlContent.match(/<a:tbl[^>]*>[\s\S]*?<\/a:tbl>/g) || [];
    for (const tableXml of pptTableMatches) {
      const table = this.parseTable(tableXml, 'ppt');
      if (table) tables.push(table);
    }

    // Word tables
    const wordTableMatches = xmlContent.match(/<w:tbl[^>]*>[\s\S]*?<\/w:tbl>/g) || [];
    for (const tableXml of wordTableMatches) {
      const table = this.parseTable(tableXml, 'word');
      if (table) tables.push(table);
    }

    return tables;
  }

  private parseTable(tableXml: string, type: 'ppt' | 'word'): DocumentTable | null {
    try {
      const rowTag = type === 'ppt' ? 'a:tr' : 'w:tr';
      const cellTag = type === 'ppt' ? 'a:tc' : 'w:tc';
      const textTag = type === 'ppt' ? 'a:t' : 'w:t';

      const rowMatches = tableXml.match(new RegExp(`<${rowTag}[^>]*>[\\s\\S]*?<\\/${rowTag}>`, 'g')) || [];
      const tableData: string[][] = [];

      for (const rowXml of rowMatches) {
        const cellMatches = rowXml.match(new RegExp(`<${cellTag}[^>]*>[\\s\\S]*?<\\/${cellTag}>`, 'g')) || [];
        const rowData: string[] = [];

        for (const cellXml of cellMatches) {
          const textMatches = cellXml.match(new RegExp(`<${textTag}[^>]*>([^<]*)<\\/${textTag}>`, 'g')) || [];
          const cellText = textMatches
            .map(match => match.replace(new RegExp(`<${textTag}[^>]*>`, 'g'), '').replace(new RegExp(`<\\/${textTag}>`, 'g'), '').trim())
            .join(' ');
          rowData.push(cellText);
        }

        if (rowData.length > 0) {
          tableData.push(rowData);
        }
      }

      if (tableData.length > 0) {
        return {
          id: `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          rows: tableData.length,
          columns: Math.max(...tableData.map(row => row.length)),
          data: tableData,
          hasHeader: true
        };
      }
    } catch (error) {
      console.warn('Failed to parse table:', error);
    }

    return null;
  }

  private async extractPowerPointMetadata(
    zipContent: JSZip,
    fileSize: number,
    pages: DocumentPage[]
  ): Promise<DocumentMetadata> {
    const metadata: DocumentMetadata = {
      title: '',
      author: 'Unknown',
      subject: '',
      created: '',
      modified: '',
      pages: pages.length,
      fileSize,
      type: 'pptx',
      wordCount: pages.reduce((total, page) => total + page.content.split(' ').length, 0),
      hasImages: pages.some(page => page.images.length > 0),
      hasTables: pages.some(page => page.tables.length > 0)
    };

    try {
      const coreXmlFile = zipContent.files['docProps/core.xml'];
      if (coreXmlFile) {
        const coreXml = await coreXmlFile.async('text');

        const titleMatch = coreXml.match(/<dc:title>([^<]*)<\/dc:title>/);
        if (titleMatch) metadata.title = titleMatch[1];

        const authorMatch = coreXml.match(/<dc:creator>([^<]*)<\/dc:creator>/);
        if (authorMatch) metadata.author = authorMatch[1];

        const subjectMatch = coreXml.match(/<dc:subject>([^<]*)<\/dc:subject>/);
        if (subjectMatch) metadata.subject = subjectMatch[1];
      }
    } catch (error) {
      console.warn('Failed to extract metadata:', error);
    }

    return metadata;
  }

  private async extractWordMetadata(
    zipContent: JSZip,
    fileSize: number,
    pages: DocumentPage[]
  ): Promise<DocumentMetadata> {
    const metadata: DocumentMetadata = {
      title: '',
      author: 'Unknown',
      subject: '',
      created: '',
      modified: '',
      pages: pages.length,
      fileSize,
      type: 'docx',
      wordCount: pages.reduce((total, page) => total + page.content.split(' ').length, 0),
      hasImages: pages.some(page => page.images.length > 0),
      hasTables: pages.some(page => page.tables.length > 0)
    };

    try {
      const coreXmlFile = zipContent.files['docProps/core.xml'];
      if (coreXmlFile) {
        const coreXml = await coreXmlFile.async('text');

        const titleMatch = coreXml.match(/<dc:title>([^<]*)<\/dc:title>/);
        if (titleMatch) metadata.title = titleMatch[1];

        const authorMatch = coreXml.match(/<dc:creator>([^<]*)<\/dc:creator>/);
        if (authorMatch) metadata.author = authorMatch[1];
      }
    } catch (error) {
      console.warn('Failed to extract Word metadata:', error);
    }

    return metadata;
  }

  private generateDocumentViewer(document: ProcessedDocument, fileName: string): string {
    const { metadata, pages } = document;

    return `
      <div class="professional-document-viewer" data-theme="light">
        ${this.generateStyles()}
        ${this.generateHeader(metadata, fileName)}
        ${this.generateToolbar(metadata)}
        <div class="document-container">
          ${this.generateSidebar(pages)}
          ${this.generateMainContent(pages)}
        </div>
        ${this.generateControls()}
        ${this.generateSearchModal()}
        ${this.generateJumpToPageModal(pages.length)}
        ${this.generateExportModal()}
        ${this.generateScript(document)}
      </div>
    `;
  }

  private generateStyles(): string {
    return `
      <style>
        .professional-document-viewer {
          width: 100%;
          height: 100vh;
          max-height: 900px;
          display: flex;
          flex-direction: column;
          background: #ffffff;
          color: #333333;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          position: relative;
        }

        /* Dark theme */
        .professional-document-viewer[data-theme="dark"] {
          background: #1a1a1a;
          color: #e0e0e0;
        }

        .professional-document-viewer[data-theme="dark"] .document-header {
          background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
          border-bottom: 1px solid #404040;
        }

        .professional-document-viewer[data-theme="dark"] .document-toolbar {
          background: #2d2d2d;
          border-bottom: 1px solid #404040;
        }

        .professional-document-viewer[data-theme="dark"] .sidebar {
          background: #2a2a2a;
          border-right: 1px solid #404040;
        }

        .professional-document-viewer[data-theme="dark"] .main-content {
          background: #1e1e1e;
        }

        .professional-document-viewer[data-theme="dark"] .page-content {
          background: #2a2a2a;
          border: 1px solid #404040;
        }

        .professional-document-viewer[data-theme="dark"] .btn {
          background: #404040;
          color: #e0e0e0;
          border: 1px solid #555555;
        }

        .professional-document-viewer[data-theme="dark"] .btn:hover {
          background: #555555;
        }

        .professional-document-viewer[data-theme="dark"] .btn.btn-primary {
          background: #0066cc;
          border: 1px solid #0052a3;
        }

        /* Header */
        .document-header {
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          padding: 1rem 1.5rem;
          border-bottom: 1px solid #dee2e6;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .document-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
          color: #2c3e50;
        }

        .document-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.875rem;
          color: #6c757d;
        }

        .document-type {
          background: #007bff;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        /* Toolbar */
        .document-toolbar {
          background: #f8f9fa;
          padding: 0.75rem 1.5rem;
          border-bottom: 1px solid #dee2e6;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .toolbar-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn {
          background: #ffffff;
          border: 1px solid #dee2e6;
          color: #495057;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn:hover {
          background: #e9ecef;
          border-color: #adb5bd;
        }

        .btn.btn-primary {
          background: #007bff;
          border-color: #007bff;
          color: white;
        }

        .btn.btn-primary:hover {
          background: #0056b3;
          border-color: #0056b3;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .view-toggle {
          background: #e9ecef;
          border-radius: 6px;
          padding: 0.25rem;
          display: flex;
        }

        .view-toggle .btn {
          border: none;
          border-radius: 4px;
          margin: 0;
          padding: 0.375rem 0.75rem;
        }

        .view-toggle .btn.active {
          background: #007bff;
          color: white;
        }

        /* Main container */
        .document-container {
          flex: 1;
          display: flex;
          overflow: hidden;
        }

        /* Sidebar */
        .sidebar {
          width: 280px;
          background: #f8f9fa;
          border-right: 1px solid #dee2e6;
          display: flex;
          flex-direction: column;
          transition: width 0.3s ease;
        }

        .sidebar.collapsed {
          width: 60px;
        }

        .sidebar-header {
          padding: 1rem;
          border-bottom: 1px solid #dee2e6;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sidebar-title {
          font-weight: 600;
          font-size: 0.875rem;
          color: #495057;
        }

        .sidebar-content {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
        }

        .page-thumbnail {
          display: flex;
          align-items: center;
          padding: 0.75rem;
          margin-bottom: 0.5rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;
        }

        .page-thumbnail:hover {
          background: #e9ecef;
        }

        .page-thumbnail.active {
          background: #007bff;
          color: white;
          border-color: #0056b3;
        }

        .page-number {
          width: 32px;
          height: 32px;
          background: #dee2e6;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
          margin-right: 0.75rem;
        }

        .page-thumbnail.active .page-number {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .page-info {
          flex: 1;
        }

        .page-title {
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          line-height: 1.2;
        }

        .page-preview {
          font-size: 0.7rem;
          color: #6c757d;
          line-height: 1.2;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .page-thumbnail.active .page-preview {
          color: rgba(255, 255, 255, 0.8);
        }

        /* Main content */
        .main-content {
          flex: 1;
          background: #ffffff;
          overflow-y: auto;
          padding: 2rem;
          position: relative;
        }

        .page-content {
          background: white;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          max-width: 100%;
        }

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #dee2e6;
        }

        .page-title-main {
          font-size: 1.5rem;
          font-weight: 600;
          color: #2c3e50;
          margin: 0;
        }

        .page-number-badge {
          background: #007bff;
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .page-text {
          line-height: 1.7;
          font-size: 1rem;
          color: #495057;
          margin-bottom: 2rem;
          white-space: pre-wrap;
        }

        .page-images {
          margin: 2rem 0;
        }

        .page-image {
          margin: 1rem 0;
          text-align: center;
        }

        .page-image img {
          max-width: 100%;
          max-height: 400px;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .image-caption {
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: #6c757d;
          font-style: italic;
        }

        .page-tables {
          margin: 2rem 0;
        }

        .document-table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
          font-size: 0.875rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          border-radius: 6px;
          overflow: hidden;
        }

        .document-table th,
        .document-table td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #dee2e6;
        }

        .document-table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #495057;
        }

        .document-table tr:hover {
          background: #f8f9fa;
        }

        /* Controls */
        .document-controls {
          position: absolute;
          bottom: 2rem;
          right: 2rem;
          display: flex;
          gap: 0.5rem;
          z-index: 10;
        }

        .control-btn {
          width: 48px;
          height: 48px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
          transition: all 0.2s ease;
        }

        .control-btn:hover {
          background: #0056b3;
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0, 123, 255, 0.4);
        }

        /* Modals */
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.5);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal.active {
          display: flex;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          padding: 2rem;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }

        .modal-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6c757d;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: #495057;
        }

        .form-control {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          font-size: 1rem;
        }

        .form-control:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .search-results {
          max-height: 300px;
          overflow-y: auto;
          margin-top: 1rem;
        }

        .search-result {
          padding: 0.75rem;
          border-bottom: 1px solid #dee2e6;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .search-result:hover {
          background: #f8f9fa;
        }

        .search-result-page {
          font-size: 0.75rem;
          color: #007bff;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }

        .search-result-text {
          font-size: 0.875rem;
          color: #495057;
        }

        .search-highlight {
          background: #fff3cd;
          padding: 0.125rem 0.25rem;
          border-radius: 3px;
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .sidebar {
            position: absolute;
            left: -280px;
            height: 100%;
            z-index: 100;
            transition: left 0.3s ease;
          }

          .sidebar.mobile-open {
            left: 0;
          }

          .main-content {
            padding: 1rem;
          }

          .document-toolbar {
            padding: 0.5rem 1rem;
            flex-direction: column;
            align-items: stretch;
          }

          .toolbar-group {
            justify-content: center;
          }

          .document-controls {
            bottom: 1rem;
            right: 1rem;
          }

          .control-btn {
            width: 40px;
            height: 40px;
          }
        }

        /* Loading state */
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(255, 255, 255, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #dee2e6;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Scrollbar styling */
        .main-content::-webkit-scrollbar,
        .sidebar-content::-webkit-scrollbar {
          width: 8px;
        }

        .main-content::-webkit-scrollbar-track,
        .sidebar-content::-webkit-scrollbar-track {
          background: #f1f1f1;
        }

        .main-content::-webkit-scrollbar-thumb,
        .sidebar-content::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 4px;
        }

        .main-content::-webkit-scrollbar-thumb:hover,
        .sidebar-content::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      </style>
    `;
  }

  private generateHeader(metadata: DocumentMetadata, fileName: string): string {
    return `
      <div class="document-header">
        <div>
          <h1 class="document-title">${this.escapeHtml(fileName)}</h1>
          <div class="document-meta">
            <span class="document-type">${metadata.type.toUpperCase()}</span>
            <span>${metadata.pages} ${metadata.type === 'pptx' ? 'slides' : 'pages'}</span>
            <span>${metadata.wordCount} words</span>
            <span>${this.formatFileSize(metadata.fileSize)}</span>
          </div>
        </div>
        <div class="toolbar-group">
          <button class="btn" onclick="toggleSidebar()">
            <span>☰</span> Navigation
          </button>
          <button class="btn" onclick="toggleTheme()">
            <span>🌙</span> Dark Mode
          </button>
        </div>
      </div>
    `;
  }

  private generateToolbar(metadata: DocumentMetadata): string {
    return `
      <div class="document-toolbar">
        <div class="toolbar-group">
          <div class="view-toggle">
            <button class="btn active" onclick="setViewMode('page')" data-view="page">
              <span>📄</span> Page View
            </button>
            <button class="btn" onclick="setViewMode('text')" data-view="text">
              <span>📝</span> Text View
            </button>
          </div>
        </div>

        <div class="toolbar-group">
          <button class="btn" onclick="openSearchModal()">
            <span>🔍</span> Search
          </button>
          <button class="btn" onclick="openJumpToPageModal()">
            <span>🎯</span> Go to Page
          </button>
          <button class="btn" onclick="openExportModal()">
            <span>💾</span> Export
          </button>
        </div>

        <div class="toolbar-group">
          <button class="btn" onclick="previousPage()" id="prevBtn">
            <span>←</span> Previous
          </button>
          <span id="pageIndicator">Page 1 of ${metadata.pages}</span>
          <button class="btn" onclick="nextPage()" id="nextBtn">
            <span>→</span> Next
          </button>
        </div>
      </div>
    `;
  }

  private generateSidebar(pages: DocumentPage[]): string {
    const thumbnails = pages.map((page, index) => `
      <div class="page-thumbnail ${index === 0 ? 'active' : ''}" onclick="goToPage(${index + 1})" data-page="${index + 1}">
        <div class="page-number">${page.pageNumber}</div>
        <div class="page-info">
          <div class="page-title">${this.escapeHtml(page.title || `${page.type === 'slide' ? 'Slide' : 'Page'} ${page.pageNumber}`)}</div>
          <div class="page-preview">${this.escapeHtml(page.content.substring(0, 80) + (page.content.length > 80 ? '...' : ''))}</div>
        </div>
      </div>
    `).join('');

    return `
      <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-title">Navigation</div>
          <button class="btn" onclick="toggleSidebar()" style="padding: 0.25rem 0.5rem;">×</button>
        </div>
        <div class="sidebar-content">
          ${thumbnails}
        </div>
      </div>
    `;
  }

  private generateMainContent(pages: DocumentPage[]): string {
    const pageContents = pages.map((page, index) => {
      const images = page.images.map(img => `
        <div class="page-image">
          <img src="data:image/jpeg;base64,${img.base64Data}" alt="${this.escapeHtml(img.caption || img.name)}" />
          ${img.caption ? `<div class="image-caption">${this.escapeHtml(img.caption)}</div>` : ''}
        </div>
      `).join('');

      const tables = page.tables.map(table => {
        const tableRows = table.data.map((row, rowIndex) => {
          const cells = row.map(cell =>
            rowIndex === 0 && table.hasHeader
              ? `<th>${this.escapeHtml(cell)}</th>`
              : `<td>${this.escapeHtml(cell)}</td>`
          ).join('');
          return `<tr>${cells}</tr>`;
        }).join('');

        return `
          <table class="document-table">
            ${tableRows}
          </table>
        `;
      }).join('');

      return `
        <div class="page-content" data-page="${index + 1}" ${index === 0 ? '' : 'style="display: none;"'}>
          <div class="page-header">
            <h2 class="page-title-main">${this.escapeHtml(page.title || `${page.type === 'slide' ? 'Slide' : 'Page'} ${page.pageNumber}`)}</h2>
            <div class="page-number-badge">${page.type === 'slide' ? 'Slide' : 'Page'} ${page.pageNumber}</div>
          </div>

          ${page.content ? `<div class="page-text">${this.escapeHtml(page.content)}</div>` : ''}

          ${images ? `<div class="page-images">${images}</div>` : ''}

          ${tables ? `<div class="page-tables">${tables}</div>` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="main-content" id="mainContent">
        ${pageContents}
      </div>
    `;
  }

  private generateControls(): string {
    return `
      <div class="document-controls">
        <button class="control-btn" onclick="previousPage()" title="Previous Page">
          ←
        </button>
        <button class="control-btn" onclick="nextPage()" title="Next Page">
          →
        </button>
        <button class="control-btn" onclick="scrollToTop()" title="Scroll to Top">
          ↑
        </button>
      </div>
    `;
  }

  private generateSearchModal(): string {
    return `
      <div class="modal" id="searchModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Search Document</h3>
            <button class="modal-close" onclick="closeSearchModal()">×</button>
          </div>
          <div class="form-group">
            <label class="form-label">Search Term</label>
            <input type="text" class="form-control" id="searchInput" placeholder="Enter text to search..." onkeyup="performSearch()" />
          </div>
          <div class="search-results" id="searchResults"></div>
        </div>
      </div>
    `;
  }

  private generateJumpToPageModal(totalPages: number): string {
    return `
      <div class="modal" id="jumpToPageModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Jump to Page</h3>
            <button class="modal-close" onclick="closeJumpToPageModal()">×</button>
          </div>
          <div class="form-group">
            <label class="form-label">Page Number</label>
            <input type="number" class="form-control" id="pageInput" min="1" max="${totalPages}" placeholder="Enter page number..." />
          </div>
          <button class="btn btn-primary" onclick="jumpToPageFromModal()">Go to Page</button>
        </div>
      </div>
    `;
  }

  private generateExportModal(): string {
    return `
      <div class="modal" id="exportModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">Export Document</h3>
            <button class="modal-close" onclick="closeExportModal()">×</button>
          </div>
          <div class="form-group">
            <label class="form-label">Export Format</label>
            <select class="form-control" id="exportFormat">
              <option value="txt">Plain Text (.txt)</option>
              <option value="md">Markdown (.md)</option>
              <option value="html">HTML (.html)</option>
              <option value="json">JSON (.json)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Include</label>
            <div>
              <label><input type="checkbox" id="includeImages" checked> Images</label><br>
              <label><input type="checkbox" id="includeTables" checked> Tables</label><br>
              <label><input type="checkbox" id="includeMetadata" checked> Metadata</label>
            </div>
          </div>
          <button class="btn btn-primary" onclick="exportDocument()">Export</button>
        </div>
      </div>
    `;
  }

  private generateScript(document: ProcessedDocument): string {
    return `
      <script>
          // Global variables for the document viewer
          let pdvCurrentPage = 1;
          let pdvTotalPages = ${document.pages.length};
          let pdvViewMode = 'page';
          let pdvSearchResults = [];
          let pdvDocumentData = ${JSON.stringify(document)};

          function goToPage(pageNum) {
            if (pageNum < 1 || pageNum > pdvTotalPages) return;

            pdvCurrentPage = pageNum;

            // Update page content
            document.querySelectorAll('.page-content').forEach(el => {
              el.style.display = 'none';
            });
            const targetPage = document.querySelector('.page-content[data-page="' + pageNum + '"]');
            if (targetPage) targetPage.style.display = 'block';

            // Update sidebar
            document.querySelectorAll('.page-thumbnail').forEach(el => {
              el.classList.remove('active');
            });
            const targetThumbnail = document.querySelector('.page-thumbnail[data-page="' + pageNum + '"]');
            if (targetThumbnail) targetThumbnail.classList.add('active');

            // Update page indicator
            const pageIndicator = document.getElementById('pageIndicator');
            if (pageIndicator) pageIndicator.textContent = 'Page ' + pageNum + ' of ' + pdvTotalPages;

            // Update navigation buttons
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            if (prevBtn) prevBtn.disabled = pageNum === 1;
            if (nextBtn) nextBtn.disabled = pageNum === pdvTotalPages;

            // Scroll to top
            const mainContent = document.getElementById('mainContent');
            if (mainContent) mainContent.scrollTop = 0;
          };

          function nextPage() {
            if (pdvCurrentPage < pdvTotalPages) {
              goToPage(pdvCurrentPage + 1);
            }
          }

          function previousPage() {
            if (pdvCurrentPage > 1) {
              goToPage(pdvCurrentPage - 1);
            }
          }

          function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
              if (window.innerWidth <= 768) {
                sidebar.classList.toggle('mobile-open');
              } else {
                sidebar.classList.toggle('collapsed');
              }
            }
          }

          function toggleTheme() {
            const viewer = document.querySelector('.professional-document-viewer');
            if (viewer) {
              const currentTheme = viewer.getAttribute('data-theme');
              viewer.setAttribute('data-theme', currentTheme === 'dark' ? 'light' : 'dark');
            }
          }

          function setViewMode(mode) {
            pdvViewMode = mode;
            document.querySelectorAll('.view-toggle .btn').forEach(btn => {
              btn.classList.remove('active');
            });
            const targetBtn = document.querySelector('.view-toggle .btn[data-view="' + mode + '"]');
            if (targetBtn) targetBtn.classList.add('active');

            if (mode === 'text') {
              // Show all pages in continuous scroll
              document.querySelectorAll('.page-content').forEach(el => {
                el.style.display = 'block';
              });
            } else {
              // Show only current page
              goToPage(pdvCurrentPage);
            }
          }

          function openSearchModal() {
            const modal = document.getElementById('searchModal');
            const input = document.getElementById('searchInput');
            if (modal) modal.classList.add('active');
            if (input) input.focus();
          }

          function closeSearchModal() {
            const modal = document.getElementById('searchModal');
            const input = document.getElementById('searchInput');
            const results = document.getElementById('searchResults');
            if (modal) modal.classList.remove('active');
            if (input) input.value = '';
            if (results) results.innerHTML = '';
          }

          function performSearch() {
          const query = document.getElementById('searchInput').value.toLowerCase().trim();
          const resultsContainer = document.getElementById('searchResults');

          if (query.length < 2) {
            resultsContainer.innerHTML = '';
            return;
          }

          pdvSearchResults = [];
          pdvDocumentData.pages.forEach((page, index) => {
            const content = (page.title + ' ' + page.content).toLowerCase();
            if (content.includes(query)) {
              const startIndex = content.indexOf(query);
              const excerpt = page.content.substring(Math.max(0, startIndex - 50), startIndex + query.length + 50);
              const highlightedExcerpt = excerpt.replace(new RegExp(query, 'gi'), '<span class="search-highlight">$&</span>');

              pdvSearchResults.push({
                pageNumber: index + 1,
                title: page.title,
                excerpt: highlightedExcerpt
              });
            }
          });

          if (pdvSearchResults.length > 0) {
            const resultsHtml = pdvSearchResults.map(result =>
              '<div class="search-result" onclick="goToPageFromSearch(' + result.pageNumber + ')">' +
                '<div class="search-result-page">Page ' + result.pageNumber + (result.title ? ' - ' + result.title : '') + '</div>' +
                '<div class="search-result-text">' + result.excerpt + '</div>' +
              '</div>'
            ).join('');
            resultsContainer.innerHTML = resultsHtml;
          } else {
            resultsContainer.innerHTML = '<div class="search-result">No results found</div>';
          }
          }

          function goToPageFromSearch(pageNum) {
            closeSearchModal();
            goToPage(pageNum);
          }

          function openJumpToPageModal() {
            const modal = document.getElementById('jumpToPageModal');
            const input = document.getElementById('pageInput');
            if (modal) modal.classList.add('active');
            if (input) input.focus();
          }

          function closeJumpToPageModal() {
            const modal = document.getElementById('jumpToPageModal');
            const input = document.getElementById('pageInput');
            if (modal) modal.classList.remove('active');
            if (input) input.value = '';
          }

          function jumpToPageFromModal() {
            const input = document.getElementById('pageInput');
            if (input) {
              const pageNum = parseInt(input.value);
              if (pageNum >= 1 && pageNum <= pdvTotalPages) {
                closeJumpToPageModal();
                goToPage(pageNum);
              }
            }
          }

          function openExportModal() {
            const modal = document.getElementById('exportModal');
            if (modal) modal.classList.add('active');
          }

          function closeExportModal() {
            const modal = document.getElementById('exportModal');
            if (modal) modal.classList.remove('active');
          }

          function exportDocument(format) {
            let content = '';
            const title = pdvDocumentData.metadata?.title || 'document';

            switch(format) {
              case 'txt':
                content = pdvDocumentData.pages.map((page, index) => {
                  let pageContent = 'Page ' + (index + 1);
                  if (page.title) pageContent += ' - ' + page.title;
                  pageContent += '\\n' + '='.repeat(50) + '\\n';
                  pageContent += page.content + '\\n\\n';
                  return pageContent;
                }).join('');
                downloadFile(content, title + '.txt', 'text/plain');
                break;

              case 'md':
                content = '# ' + title + '\\n\\n';
                pdvDocumentData.pages.forEach((page, index) => {
                  if (page.title) {
                    content += '## Page ' + (index + 1) + ': ' + page.title + '\\n\\n';
                  } else {
                    content += '## Page ' + (index + 1) + '\\n\\n';
                  }
                  content += page.content + '\\n\\n';
                });
                downloadFile(content, title + '.md', 'text/markdown');
                break;
            }
            closeExportModal();
          }

          function downloadFile(content, filename, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }

          function scrollToTop() {
            const previewArea = document.getElementById('previewArea');
            if (previewArea) {
              previewArea.scrollTop = 0;
            }
          }

          // All functions now properly defined above

          // Keyboard shortcuts
          document.addEventListener('keydown', function(e) {
            if (e.ctrlKey || e.metaKey) {
              switch (e.key) {
                case 'f':
                  e.preventDefault();
                  openSearchModal();
                  break;
                case 'g':
                  e.preventDefault();
                  openJumpToPageModal();
                  break;
              }
            } else {
              switch (e.key) {
                case 'ArrowLeft':
                  if (!document.querySelector('.modal.active')) {
                    e.preventDefault();
                    previousPage();
                  }
                  break;
                case 'ArrowRight':
                  if (!document.querySelector('.modal.active')) {
                    e.preventDefault();
                    nextPage();
                  }
                  break;
                case 'Escape':
                  document.querySelectorAll('.modal.active').forEach(modal => {
                    modal.classList.remove('active');
                  });
                  break;
              }
            }
          });

          // Initialize
          goToPage(1);
      </script>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

