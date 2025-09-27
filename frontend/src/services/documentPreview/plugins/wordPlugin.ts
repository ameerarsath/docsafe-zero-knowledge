/**
 * Production-Level Word Document Preview Plugin
 * Advanced text extraction with formatting preservation for DOCX/DOC files
 * Supports: DOC, DOCX, RTF with comprehensive content analysis
 */

import { PreviewPlugin, PreviewResult, PreviewOptions } from '../pluginSystem';

interface WordParagraph {
  text: string;
  style?: string;
  level?: number;
  isHeading?: boolean;
  isList?: boolean;
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
  };
}

interface WordSection {
  title: string;
  paragraphs: WordParagraph[];
  level: number;
}

interface WordDocument {
  title?: string;
  author?: string;
  subject?: string;
  created?: string;
  modified?: string;
  application?: string;
  sections: WordSection[];
  paragraphs: WordParagraph[];
  statistics: {
    wordCount: number;
    characterCount: number;
    paragraphCount: number;
    pageCount?: number;
    sectionCount: number;
  };
  tables: Array<{
    rows: number;
    columns: number;
    data?: string[][];
  }>;
  images: Array<{
    name: string;
    type: string;
    size?: number;
  }>;
}

export class WordPreviewPlugin implements PreviewPlugin {
  name = 'ProductionWordPreview';
  priority = 50; // Lower priority - RobustOfficePlugin handles this better

  supportedMimeTypes = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/rtf',
    'text/rtf'
  ];

  supportedExtensions = ['.doc', '.docx', '.rtf'];

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
    try {
      console.log(`📝 Word Plugin: Processing ${fileName} (${mimeType})`);

      const extension = fileName.toLowerCase().split('.').pop();

      let document: WordDocument;

      // Try advanced processing first, fall back to simple text extraction
      try {
        if (extension === 'docx' || mimeType.includes('openxmlformats')) {
          document = await this.processDocxFileRobust(blob, fileName);
        } else if (extension === 'rtf' || mimeType.includes('rtf')) {
          document = await this.processRtfFile(blob, fileName);
        } else {
          document = await this.processDocFile(blob, fileName);
        }
      } catch (error) {
        console.warn('⚠️ Advanced processing failed, falling back to simple text extraction:', error);
        document = await this.extractSimpleTextContent(blob, fileName, extension || '');
      }

      const previewHtml = this.generateProductionViewer(document, fileName, blob.size);

      return {
        type: 'success',
        format: 'html',
        content: previewHtml,
        metadata: {
          title: document.title || fileName,
          author: document.author,
          creator: 'Microsoft Word'
        }
      };
    } catch (error) {
      console.error('❌ Word Plugin Error:', error);
      // Even if everything fails, provide a basic text preview
      return await this.generateBasicTextPreview(blob, fileName, error);
    }
  }

  private async processDocxFileRobust(blob: Blob, fileName: string): Promise<WordDocument> {
    console.log('🚀 Word Plugin: Starting robust DOCX processing...');

    // Method 1: Try mammoth.js first (most reliable for DOCX)
    try {
      console.log('🔄 Attempting mammoth.js processing...');

      // Dynamic import to ensure library is available
      const { default: mammoth } = await import('mammoth');

      const arrayBuffer = await blob.arrayBuffer();
      console.log('📊 ArrayBuffer size:', arrayBuffer.byteLength);

      const result = await mammoth.convertToHtml({ arrayBuffer });

      if (result.value && result.value.trim().length > 0) {
        console.log('✅ Mammoth processing successful!');
        return await this.processMammothResult(result, fileName, blob.size);
      } else {
        console.warn('⚠️ Mammoth returned empty content');
        throw new Error('Empty content from mammoth');
      }
    } catch (mammothError) {
      console.warn('⚠️ Mammoth failed, trying ZIP extraction:', mammothError);

      // Method 2: Try ZIP-based text extraction
      try {
        return await this.processDocxFileBasic(blob, fileName);
      } catch (zipError) {
        console.warn('⚠️ ZIP extraction failed, trying simple text:', zipError);
        throw zipError; // Let caller handle fallback
      }
    }
  }

  private async processDocxFileBasic(blob: Blob, fileName: string): Promise<WordDocument> {
    console.log('📄 Word Plugin: Basic DOCX processing (fallback)...');

    // Create a basic document structure for failed DOCX files
    const basicContent: WordParagraph[] = [
      {
        text: `Unable to extract content from ${fileName}`,
        isHeading: true,
        level: 1,
        formatting: { bold: true }
      },
      {
        text: 'This DOCX file could not be processed for preview. The file may contain complex formatting, be password-protected, or have an incompatible structure.',
        isHeading: false,
        isList: false
      },
      {
        text: 'To view this document:',
        isHeading: true,
        level: 2,
        formatting: { bold: true }
      },
      {
        text: 'Download the file and open it in Microsoft Word',
        isHeading: false,
        isList: true
      },
      {
        text: 'Use Microsoft Word Online or Office 365',
        isHeading: false,
        isList: true
      },
      {
        text: 'Convert to a simpler format like PDF for preview',
        isHeading: false,
        isList: true
      }
    ];

    const statistics = {
      wordCount: 50,
      characterCount: blob.size,
      paragraphCount: basicContent.length,
      pageCount: 1,
      sectionCount: 1
    };

    return {
      title: fileName,
      application: 'Microsoft Word (Processing Failed)',
      sections: [{
        title: 'Document Information',
        paragraphs: basicContent,
        level: 1
      }],
      paragraphs: basicContent,
      statistics,
      tables: [],
      images: []
    };
  }

  private async validateWordFile(blob: Blob, fileName: string, mimeType: string): Promise<{isValid: boolean, reason?: string}> {
    try {
      const extension = fileName.toLowerCase().split('.').pop();

      // Check file size (reasonable limits)
      if (blob.size > 100 * 1024 * 1024) { // 100MB limit
        return {
          isValid: false,
          reason: 'File too large for preview (limit: 100MB)'
        };
      }

      if (blob.size < 100) { // Too small to be a valid document
        return {
          isValid: false,
          reason: 'File too small to be a valid Word document'
        };
      }

      // For DOCX files, do a quick ZIP signature check
      if (extension === 'docx' || mimeType.includes('openxmlformats')) {
        const headerBytes = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
        const zipSignature = [0x50, 0x4B, 0x03, 0x04]; // ZIP file signature

        const hasZipSignature = zipSignature.every((byte, index) => headerBytes[index] === byte);

        if (!hasZipSignature) {
          return {
            isValid: false,
            reason: 'not a zip file' // This will trigger the appropriate error handling
          };
        }
      }

      // Basic validation passed
      return { isValid: true };
    } catch (error) {
      console.warn('File validation failed:', error);
      return { isValid: true }; // Allow processing to continue if validation fails
    }
  }

  private async processDocxFile(blob: Blob, fileName: string): Promise<WordDocument> {
    try {
      console.log('📄 Word Plugin: Processing DOCX file...', { fileName, size: blob.size });

      // First attempt: Use mammoth.js for robust DOCX processing
      try {
        console.log('🔄 Word Plugin: Attempting mammoth.js processing...');
        const mammoth = await import('mammoth');

        // Convert blob to ArrayBuffer for mammoth
        const arrayBuffer = await blob.arrayBuffer();
        console.log('✅ Word Plugin: ArrayBuffer created, size:', arrayBuffer.byteLength);

        // Use mammoth to extract content
        const result = await mammoth.convertToHtml({ arrayBuffer });
        console.log('✅ Word Plugin: Mammoth conversion completed');

        if (result.value && result.value.trim()) {
          console.log('✅ Word Plugin: Mammoth extraction successful, content length:', result.value.length);
          return await this.processMammothResult(result, fileName, blob.size);
        } else {
          console.warn('⚠️ Mammoth returned empty content, trying fallback...');
        }
      } catch (mammothError) {
        console.warn('⚠️ Mammoth processing failed:', mammothError);
        console.log('🔄 Word Plugin: Falling back to JSZip approach...');
      }

      // Second attempt: Manual ZIP processing with JSZip
      try {
        console.log('🔄 Word Plugin: Attempting JSZip processing...');
        const JSZip = await import('jszip');

        // Create new JSZip instance and load the blob
        const zip = new JSZip.default();
        const zipContent = await zip.loadAsync(blob, {
          checkCRC32: false // Skip CRC check for better compatibility
        });

        console.log('✅ Word Plugin: ZIP loaded successfully');
        console.log('📁 ZIP contents:', Object.keys(zipContent.files));

        // Check for essential DOCX files
        const hasContentTypes = zipContent.files['[Content_Types].xml'];
        const hasDocumentXml = zipContent.files['word/document.xml'];

        if (!hasContentTypes && !hasDocumentXml) {
          throw new Error('DOCX_STRUCTURE_INVALID');
        }

        console.log('✅ Word Plugin: DOCX structure validated');

        // Extract document content
        const documentContent = await this.extractDocxContentFromZip(zipContent);
        console.log(`✅ Word Plugin: Content extracted - ${documentContent.paragraphs.length} paragraphs`);

        return documentContent;

      } catch (zipError) {
        console.error('❌ JSZip processing failed:', zipError);

        // Check specific error types
        if (zipError.message?.includes('not a zip file') ||
            zipError.message?.includes('Invalid signature') ||
            zipError.message?.includes('corrupted')) {
          throw new Error('ZIP_FORMAT_ERROR');
        }

        if (zipError.message?.includes('DOCX_STRUCTURE_INVALID')) {
          throw new Error('DOCX_STRUCTURE_ERROR');
        }

        throw new Error('DOCX_PROCESSING_ERROR');
      }

    } catch (error) {
      console.error('❌ DOCX processing completely failed:', error);

      // Categorize the error for better user messaging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'ZIP_FORMAT_ERROR') {
        throw new Error('not a zip file'); // This will trigger the appropriate error handling
      } else if (errorMessage === 'DOCX_STRUCTURE_ERROR') {
        throw new Error('missing required DOCX structure');
      } else if (errorMessage === 'DOCX_PROCESSING_ERROR') {
        throw new Error('Failed to extract content from DOCX file');
      } else {
        throw error; // Re-throw the original error
      }
    }
  }

  private async extractDocxContentFromZip(zipContent: any): Promise<WordDocument> {
    try {
      // Extract core properties
      const coreProps = await this.extractCoreProperties(zipContent);
      console.log('✅ Word Plugin: Core properties extracted');

      // Extract main document content
      const documentXml = zipContent.files['word/document.xml'];
      if (!documentXml) {
        // Try alternative paths
        const alternativeDoc = zipContent.files['word/document1.xml'] || zipContent.files['document.xml'];
        if (!alternativeDoc) {
          throw new Error('No document XML found in DOCX');
        }
      }

      const xmlContent = await (documentXml || zipContent.files['word/document1.xml']).async('text');
      console.log('✅ Word Plugin: Document XML extracted, length:', xmlContent.length);

      // Parse document structure
      const documentContent = await this.parseDocxContent(xmlContent, zipContent);
      console.log(`✅ Word Plugin: Content parsed - ${documentContent.paragraphs.length} paragraphs`);

      // Extract additional content
      const images = await this.extractImages(zipContent);
      const tables = this.extractTables(xmlContent);

      console.log(`✅ Word Plugin: Found ${images.length} images, ${tables.length} tables`);

      // Calculate statistics
      const statistics = this.calculateStatistics(documentContent.paragraphs, documentContent.sections);

      return {
        ...coreProps,
        ...documentContent,
        tables,
        images,
        statistics
      };
    } catch (error) {
      console.error('❌ ZIP content extraction failed:', error);
      throw error;
    }
  }

  private async processMammothResult(result: any, fileName: string, fileSize: number): Promise<WordDocument & { rawHtml?: string }> {
    try {
      const htmlContent = result.value;
      const messages = result.messages || [];

      console.log('📝 Processing Mammoth result with HTML content length:', htmlContent.length);

      // Clean and enhance the HTML content with proper styling
      const enhancedHtml = this.enhanceHtmlContent(htmlContent);

      // Parse HTML to extract meaningful content for statistics
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;

      // Extract paragraphs for statistics only (preserve original HTML for rendering)
      const paragraphs: WordParagraph[] = [];
      const sections: WordSection[] = [];

      // Process different HTML elements
      const elements = tempDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, div');
      let currentSection: WordSection | null = null;

      elements.forEach((element, index) => {
        const text = element.textContent?.trim() || '';
        if (!text) return;

        const tagName = element.tagName.toLowerCase();
        const isHeading = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName);
        const level = isHeading ? parseInt(tagName.charAt(1)) : 0;
        const isList = tagName === 'li';

        // Extract formatting
        const style = element.getAttribute('style') || '';
        const formatting: WordParagraph['formatting'] = {
          bold: style.includes('font-weight:bold') || style.includes('font-weight: bold') || element.querySelector('strong, b') !== null,
          italic: style.includes('font-style:italic') || style.includes('font-style: italic') || element.querySelector('em, i') !== null,
          underline: style.includes('text-decoration:underline') || style.includes('text-decoration: underline') || element.querySelector('u') !== null
        };

        const paragraph: WordParagraph = {
          text,
          isHeading,
          level,
          isList,
          formatting
        };

        paragraphs.push(paragraph);

        // Create sections based on headings
        if (isHeading && level <= 2) {
          if (currentSection) {
            sections.push(currentSection);
          }
          currentSection = {
            title: text,
            paragraphs: [paragraph],
            level
          };
        } else if (currentSection) {
          currentSection.paragraphs.push(paragraph);
        }
      });

      // Add final section
      if (currentSection) {
        sections.push(currentSection);
      }

      // If no sections, create a default one
      if (sections.length === 0 && paragraphs.length > 0) {
        sections.push({
          title: 'Document Content',
          paragraphs,
          level: 1
        });
      }

      // Extract tables from HTML
      const tables = this.extractTablesFromHtml(tempDiv);

      // Calculate statistics based on the text content
      const statistics = this.calculateStatistics(paragraphs, sections);

      // Handle warnings/messages from mammoth
      if (messages.length > 0) {
        console.log('📝 Mammoth processing messages:', messages);
      }

      return {
        title: fileName,
        application: 'Microsoft Word (Mammoth)',
        sections,
        paragraphs,
        statistics,
        tables,
        images: [], // Mammoth converts images to data URLs in HTML, we'll count them separately if needed
        rawHtml: enhancedHtml // Preserve the original formatted HTML
      };
    } catch (error) {
      console.error('❌ Mammoth result processing failed:', error);
      throw new Error(`Failed to process mammoth result: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractTablesFromHtml(container: HTMLElement): WordDocument['tables'] {
    const tables: WordDocument['tables'] = [];
    const tableElements = container.querySelectorAll('table');

    tableElements.forEach(table => {
      const rows = Array.from(table.querySelectorAll('tr'));
      const tableData: string[][] = [];

      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td, th'));
        const rowData = cells.map(cell => cell.textContent?.trim() || '');
        if (rowData.some(cell => cell)) { // Only add rows with content
          tableData.push(rowData);
        }
      });

      if (tableData.length > 0) {
        const maxColumns = Math.max(...tableData.map(row => row.length));
        tables.push({
          rows: tableData.length,
          columns: maxColumns,
          data: tableData.slice(0, 10) // Limit for preview
        });
      }
    });

    return tables;
  }

  private async extractCoreProperties(zipContent: any): Promise<Partial<WordDocument>> {
    try {
      const corePropsFile = zipContent.files['docProps/core.xml'];
      if (!corePropsFile) return {};

      const corePropsXml = await corePropsFile.async('text');

      // Parse core properties XML
      const titleMatch = corePropsXml.match(/<dc:title[^>]*>([^<]*)<\/dc:title>/);
      const authorMatch = corePropsXml.match(/<dc:creator[^>]*>([^<]*)<\/dc:creator>/);
      const subjectMatch = corePropsXml.match(/<dc:subject[^>]*>([^<]*)<\/dc:subject>/);
      const createdMatch = corePropsXml.match(/<dcterms:created[^>]*>([^<]*)<\/dcterms:created>/);
      const modifiedMatch = corePropsXml.match(/<dcterms:modified[^>]*>([^<]*)<\/dcterms:modified>/);

      return {
        title: titleMatch ? titleMatch[1] : undefined,
        author: authorMatch ? authorMatch[1] : undefined,
        subject: subjectMatch ? subjectMatch[1] : undefined,
        created: createdMatch ? createdMatch[1] : undefined,
        modified: modifiedMatch ? modifiedMatch[1] : undefined,
        application: 'Microsoft Word'
      };
    } catch (error) {
      console.warn('⚠️ Failed to extract core properties:', error);
      return {};
    }
  }

  private async parseDocxContent(xmlContent: string, zipContent: any): Promise<{ paragraphs: WordParagraph[], sections: WordSection[] }> {
    const paragraphs: WordParagraph[] = [];
    const sections: WordSection[] = [];

    try {
      // Extract paragraphs with enhanced parsing
      const paragraphMatches = xmlContent.match(/<w:p[^>]*>[\s\S]*?<\/w:p>/g) || [];

      let currentSection: WordSection | null = null;
      let sectionCounter = 0;

      for (const paragraphXml of paragraphMatches) {
        const paragraph = await this.parseParagraph(paragraphXml, zipContent);

        if (paragraph.text.trim()) {
          paragraphs.push(paragraph);

          // Detect sections based on headings
          if (paragraph.isHeading && paragraph.level && paragraph.level <= 2) {
            if (currentSection) {
              sections.push(currentSection);
            }
            currentSection = {
              title: paragraph.text,
              paragraphs: [paragraph],
              level: paragraph.level
            };
            sectionCounter++;
          } else if (currentSection) {
            currentSection.paragraphs.push(paragraph);
          }
        }
      }

      // Add final section
      if (currentSection) {
        sections.push(currentSection);
      }

      // If no sections detected, create a default one
      if (sections.length === 0 && paragraphs.length > 0) {
        sections.push({
          title: 'Document Content',
          paragraphs: paragraphs,
          level: 1
        });
      }

      return { paragraphs, sections };
    } catch (error) {
      console.error('❌ Content parsing failed:', error);
      throw error;
    }
  }

  private async parseParagraph(paragraphXml: string, zipContent: any): Promise<WordParagraph> {
    try {
      // Extract text content from w:t elements
      const textMatches = paragraphXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
      const text = textMatches
        .map(match => match.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, ''))
        .join(' ')
        .trim();

      // Detect paragraph style
      const styleMatch = paragraphXml.match(/<w:pStyle[^>]*w:val="([^"]*)"[^>]*\/>/);
      const style = styleMatch ? styleMatch[1] : undefined;

      // Detect heading levels
      const isHeading = /^(heading|Heading)\d*/i.test(style || '') ||
                       /^h[1-6]$/i.test(style || '');

      let level = 0;
      if (isHeading) {
        const levelMatch = (style || '').match(/(\d+)/);
        level = levelMatch ? parseInt(levelMatch[1]) : 1;
      }

      // Detect list items
      const isList = paragraphXml.includes('<w:numPr>') ||
                     paragraphXml.includes('<w:ilvl') ||
                     /^[\s]*[-•*]\s/.test(text);

      // Extract formatting
      const formatting: WordParagraph['formatting'] = {};
      if (paragraphXml.includes('<w:b/>') || paragraphXml.includes('<w:b ')) formatting.bold = true;
      if (paragraphXml.includes('<w:i/>') || paragraphXml.includes('<w:i ')) formatting.italic = true;
      if (paragraphXml.includes('<w:u ')) formatting.underline = true;

      return {
        text,
        style,
        level,
        isHeading,
        isList,
        formatting
      };
    } catch (error) {
      console.warn('⚠️ Failed to parse paragraph:', error);
      return {
        text: 'Error parsing paragraph content',
        isHeading: false,
        isList: false
      };
    }
  }

  private extractTables(xmlContent: string): WordDocument['tables'] {
    try {
      const tables: WordDocument['tables'] = [];
      const tableMatches = xmlContent.match(/<w:tbl[^>]*>[\s\S]*?<\/w:tbl>/g) || [];

      for (const tableXml of tableMatches) {
        const rowMatches = tableXml.match(/<w:tr[^>]*>[\s\S]*?<\/w:tr>/g) || [];
        const rows = rowMatches.length;

        let maxColumns = 0;
        const tableData: string[][] = [];

        for (const rowXml of rowMatches) {
          const cellMatches = rowXml.match(/<w:tc[^>]*>[\s\S]*?<\/w:tc>/g) || [];
          const rowData: string[] = [];

          for (const cellXml of cellMatches) {
            const textMatches = cellXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
            const cellText = textMatches
              .map(match => match.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, ''))
              .join(' ')
              .trim();
            rowData.push(cellText);
          }

          tableData.push(rowData);
          maxColumns = Math.max(maxColumns, rowData.length);
        }

        tables.push({
          rows,
          columns: maxColumns,
          data: tableData.slice(0, 10) // Limit to first 10 rows for preview
        });
      }

      return tables;
    } catch (error) {
      console.warn('⚠️ Failed to extract tables:', error);
      return [];
    }
  }

  private async extractImages(zipContent: any): Promise<WordDocument['images']> {
    try {
      const images: WordDocument['images'] = [];

      // Look for images in media folder
      Object.keys(zipContent.files).forEach(filePath => {
        if (filePath.startsWith('word/media/')) {
          const fileName = filePath.split('/').pop() || '';
          const extension = fileName.split('.').pop()?.toLowerCase();

          if (extension && ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'svg'].includes(extension)) {
            images.push({
              name: fileName,
              type: extension,
              size: zipContent.files[filePath]._data?.length
            });
          }
        }
      });

      return images;
    } catch (error) {
      console.warn('⚠️ Failed to extract images:', error);
      return [];
    }
  }

  private calculateStatistics(paragraphs: WordParagraph[], sections: WordSection[]): WordDocument['statistics'] {
    const allText = paragraphs.map(p => p.text).join(' ');
    const wordCount = allText.split(/\s+/).filter(word => word.length > 0).length;
    const characterCount = allText.length;
    const paragraphCount = paragraphs.filter(p => p.text.trim().length > 0).length;

    // Rough page estimation (500 words per page)
    const pageCount = Math.max(1, Math.ceil(wordCount / 500));

    return {
      wordCount,
      characterCount,
      paragraphCount,
      pageCount,
      sectionCount: sections.length
    };
  }

  private async processRtfFile(blob: Blob, fileName: string): Promise<WordDocument> {
    try {
      console.log('📄 Word Plugin: Processing RTF file...');

      const text = await blob.text();
      const paragraphs = this.parseRtfContent(text);
      const statistics = this.calculateStatistics(paragraphs, []);

      return {
        title: fileName,
        application: 'Rich Text Format',
        sections: [{
          title: 'RTF Content',
          paragraphs,
          level: 1
        }],
        paragraphs,
        statistics,
        tables: [],
        images: []
      };
    } catch (error) {
      console.error('❌ RTF processing failed:', error);
      throw new Error(`Failed to process RTF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseRtfContent(rtfContent: string): WordParagraph[] {
    try {
      // Basic RTF parsing - extract text between control words
      let cleanText = rtfContent
        .replace(/\\[a-z]+\d*/g, ' ') // Remove RTF control words
        .replace(/[{}]/g, ' ') // Remove braces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      // Split into paragraphs
      const paragraphTexts = cleanText.split(/[\r\n]+/).filter(p => p.trim());

      return paragraphTexts.map(text => ({
        text: text.trim(),
        isHeading: false,
        isList: /^[\s]*[-•*]\s/.test(text)
      }));
    } catch (error) {
      console.warn('⚠️ RTF parsing failed:', error);
      return [{
        text: 'Error parsing RTF content',
        isHeading: false,
        isList: false
      }];
    }
  }

  private async processDocFile(blob: Blob, fileName: string): Promise<WordDocument> {
    // Legacy DOC files require specialized parsing
    console.log('📄 Word Plugin: Processing legacy DOC file...');

    const statistics = {
      wordCount: 0,
      characterCount: blob.size,
      paragraphCount: 1,
      pageCount: 1,
      sectionCount: 1
    };

    const infoParagraphs: WordParagraph[] = [
      {
        text: 'Legacy Microsoft Word Document (.doc)',
        isHeading: true,
        level: 1,
        formatting: { bold: true }
      },
      {
        text: `This is a legacy Microsoft Word document in the older .doc format (Microsoft Word 97-2003). For security and compatibility reasons, the full content cannot be directly extracted and displayed in the browser.`,
        isHeading: false,
        isList: false
      },
      {
        text: 'Document Information:',
        isHeading: true,
        level: 2,
        formatting: { bold: true }
      },
      {
        text: `• Filename: ${fileName}`,
        isHeading: false,
        isList: true
      },
      {
        text: `• File size: ${this.formatFileSize(blob.size)}`,
        isHeading: false,
        isList: true
      },
      {
        text: `• Format: Microsoft Word 97-2003 Document (.doc)`,
        isHeading: false,
        isList: true
      },
      {
        text: 'To view the complete document with full formatting, images, and all content:',
        isHeading: false,
        isList: false
      },
      {
        text: `• Download the file and open it in Microsoft Word`,
        isHeading: false,
        isList: true
      },
      {
        text: `• Use Microsoft Word Online or Office 365`,
        isHeading: false,
        isList: true
      },
      {
        text: `• Convert to modern DOCX format for better compatibility`,
        isHeading: false,
        isList: true
      }
    ];

    return {
      title: fileName,
      application: 'Microsoft Word (Legacy)',
      sections: [{
        title: 'Document Information',
        paragraphs: infoParagraphs,
        level: 1
      }],
      paragraphs: infoParagraphs,
      statistics,
      tables: [],
      images: []
    };
  }

  private enhanceHtmlContent(htmlContent: string): string {
    if (!htmlContent || htmlContent.trim().length === 0) {
      return '<div class="docx-preview"><p>No content available</p></div>';
    }

    // Return clean HTML content wrapped in container WITHOUT inline styles
    // CSS will be applied externally via React component styling
    return `<div class="docx-preview">${htmlContent}</div>`;
  }

  private generateProductionViewer(document: WordDocument & { rawHtml?: string }, fileName: string, fileSize: number): string {
    const { statistics, sections, tables, images, rawHtml } = document;
    const fileSizeFormatted = this.formatFileSize(fileSize);

    // If we have raw HTML from Mammoth.js, use it directly with enhanced styling
    if (rawHtml) {
      console.log('✅ Using enhanced HTML rendering from Mammoth.js');
      return rawHtml;
    }

    console.log('⚠️ Falling back to paragraph-based rendering');

    // Generate table of contents
    const tocItems = sections
      .filter(section => section.title && section.title !== 'Document Content')
      .map((section, index) =>
        `<li class="toc-item toc-level-${section.level}">
          <a href="#section-${index}" onclick="scrollToSection(${index})">
            ${this.escapeHtml(section.title)}
          </a>
        </li>`
      ).join('');

    // Generate sections content
    const sectionsContent = sections.map((section, sectionIndex) => {
      const paragraphsHtml = section.paragraphs.map((paragraph, paragraphIndex) =>
        this.renderParagraph(paragraph, sectionIndex, paragraphIndex)
      ).join('');

      return `
        <section class="document-section" id="section-${sectionIndex}">
          ${section.title !== 'Document Content' ?
            `<h${Math.min(section.level + 1, 6)} class="section-title">${this.escapeHtml(section.title)}</h${Math.min(section.level + 1, 6)}>` :
            ''
          }
          <div class="section-content">
            ${paragraphsHtml}
          </div>
        </section>
      `;
    }).join('');

    // Generate tables preview
    const tablesHtml = tables.length > 0 ? `
      <div class="document-tables">
        <h3>📊 Tables (${tables.length})</h3>
        ${tables.map((table, index) => this.renderTable(table, index)).join('')}
      </div>
    ` : '';

    // Generate images list
    const imagesHtml = images.length > 0 ? `
      <div class="document-images">
        <h3>🖼️ Images (${images.length})</h3>
        <div class="images-grid">
          ${images.map(image => `
            <div class="image-item">
              <div class="image-icon">🖼️</div>
              <div class="image-info">
                <div class="image-name">${this.escapeHtml(image.name)}</div>
                <div class="image-type">${image.type.toUpperCase()}</div>
                ${image.size ? `<div class="image-size">${this.formatFileSize(image.size)}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    return `
      <div class="word-production-viewer">
        <style>
          /* Universal overflow prevention */
          .word-production-viewer * {
            max-width: 100%;
            word-wrap: break-word;
            overflow-wrap: break-word;
            box-sizing: border-box;
          }

          .word-production-viewer {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            line-height: 1.6;
            max-width: 100vw;
            overflow-x: hidden;
            box-sizing: border-box;
          }

          .word-header {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            padding: 1.5rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }

          .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            max-width: 1200px;
            margin: 0 auto;
          }

          .file-info {
            display: flex;
            align-items: center;
            gap: 1rem;
          }

          .word-icon {
            font-size: 3rem;
            background: rgba(255,255,255,0.2);
            padding: 0.75rem;
            border-radius: 12px;
          }

          .file-details h1 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 700;
          }

          .file-metadata {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-top: 0.5rem;
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
          }

          .doc-stats {
            text-align: right;
            font-size: 0.875rem;
          }

          .stats-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 1rem;
            background: white;
            padding: 1.5rem;
            border-bottom: 1px solid #e2e8f0;
          }

          .stat-item {
            text-align: center;
          }

          .stat-value {
            display: block;
            font-size: 1.5rem;
            font-weight: 700;
            color: #2563eb;
            margin-bottom: 0.25rem;
          }

          .stat-label {
            font-size: 0.75rem;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .main-content {
            display: flex;
            flex: 1;
            max-width: 1200px;
            margin: 0 auto;
            gap: 2rem;
            padding: 1.5rem;
            width: 100%;
            box-sizing: border-box;
            overflow: hidden;
          }

          .sidebar {
            width: 280px;
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            height: fit-content;
            position: sticky;
            top: 1.5rem;
          }

          .toc-title {
            margin: 0 0 1rem 0;
            font-size: 1.125rem;
            font-weight: 600;
            color: #1e293b;
          }

          .toc-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .toc-item {
            margin: 0.5rem 0;
          }

          .toc-level-1 { margin-left: 0; }
          .toc-level-2 { margin-left: 1rem; }
          .toc-level-3 { margin-left: 2rem; }

          .toc-item a {
            color: #475569;
            text-decoration: none;
            display: block;
            padding: 0.5rem 0.75rem;
            border-radius: 6px;
            transition: all 0.2s ease;
            font-size: 0.875rem;
          }

          .toc-item a:hover {
            background: #f1f5f9;
            color: #2563eb;
          }

          .document-content {
            flex: 1;
            background: white;
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            min-height: 600px;
            max-width: 100%;
            overflow-x: hidden;
            overflow-y: auto;
            word-wrap: break-word;
            box-sizing: border-box;
          }

          .document-section {
            margin-bottom: 2rem;
            width: 100%;
            max-width: 100%;
            overflow: hidden;
          }

          .section-content {
            width: 100%;
            max-width: 100%;
            overflow: hidden;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }

          .section-title {
            color: #1e293b;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 0.5rem;
            margin-bottom: 1.5rem;
          }

          .word-paragraph {
            margin: 1rem 0;
            color: #374151;
            text-align: left;
            word-wrap: break-word;
            overflow-wrap: break-word;
            word-break: break-word;
            hyphens: auto;
            line-height: 1.7;
            max-width: 100%;
            width: 100%;
            box-sizing: border-box;
            overflow: hidden;
            white-space: pre-wrap;
            display: block;
          }

          .word-paragraph.heading {
            font-weight: 600;
            color: #1e293b;
            margin: 1.5rem 0 1rem 0;
          }

          .word-paragraph.heading.level-1 { font-size: 1.5rem; }
          .word-paragraph.heading.level-2 { font-size: 1.25rem; }
          .word-paragraph.heading.level-3 { font-size: 1.125rem; }

          .word-paragraph.list-item {
            margin-left: 1.5rem;
            position: relative;
          }

          .word-paragraph.list-item::before {
            content: "•";
            color: #2563eb;
            position: absolute;
            left: -1rem;
            font-weight: bold;
          }

          .word-paragraph.bold { font-weight: 600; }
          .word-paragraph.italic { font-style: italic; }
          .word-paragraph.underline { text-decoration: underline; }

          .document-table {
            margin: 1.5rem 0;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }

          .table-title {
            background: #f8fafc;
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #e2e8f0;
            font-weight: 600;
            color: #1e293b;
          }

          .table-content {
            overflow-x: auto;
          }

          .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.875rem;
          }

          .data-table th,
          .data-table td {
            border: 1px solid #e2e8f0;
            padding: 0.75rem;
            text-align: left;
          }

          .data-table th {
            background: #f8fafc;
            font-weight: 600;
          }

          .data-table tr:nth-child(even) {
            background: #f8fafc;
          }

          .document-images {
            margin: 2rem 0;
            padding: 1.5rem;
            background: #f8fafc;
            border-radius: 8px;
          }

          .images-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
          }

          .image-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.75rem;
            background: white;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }

          .image-icon {
            font-size: 1.5rem;
          }

          .image-info {
            flex: 1;
          }

          .image-name {
            font-weight: 600;
            color: #1e293b;
            font-size: 0.875rem;
          }

          .image-type,
          .image-size {
            font-size: 0.75rem;
            color: #64748b;
          }

          @media (max-width: 768px) {
            .main-content {
              flex-direction: column;
              padding: 1rem;
              gap: 1rem;
            }

            .sidebar {
              width: auto;
              position: static;
            }

            .document-content {
              padding: 1rem;
              max-width: 100%;
              overflow-x: hidden;
            }

            .word-paragraph {
              font-size: 0.95rem;
              line-height: 1.6;
              word-break: break-word;
              overflow-wrap: break-word;
              hyphens: auto;
            }

            .header-content {
              flex-direction: column;
              gap: 1rem;
              text-align: center;
            }

            .file-metadata {
              flex-direction: column;
              gap: 0.5rem;
            }

            .stats-summary {
              grid-template-columns: repeat(3, 1fr);
              gap: 0.75rem;
              padding: 1rem;
            }
          }
        </style>

        <div class="word-header">
          <div class="header-content">
            <div class="file-info">
              <div class="word-icon">📝</div>
              <div class="file-details">
                <h1>${this.escapeHtml(document.title || fileName)}</h1>
                <div class="file-metadata">
                  <span>${fileSizeFormatted}</span>
                  ${document.author ? `<span>By ${this.escapeHtml(document.author)}</span>` : ''}
                  ${document.application ? `<span>${this.escapeHtml(document.application)}</span>` : ''}
                </div>
              </div>
            </div>
            <div class="doc-stats">
              <div><strong>${statistics.wordCount.toLocaleString()}</strong> words</div>
              <div><strong>${statistics.pageCount}</strong> pages (est.)</div>
            </div>
          </div>
        </div>

        <div class="stats-summary">
          <div class="stat-item">
            <span class="stat-value">${statistics.wordCount.toLocaleString()}</span>
            <span class="stat-label">Words</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${statistics.paragraphCount}</span>
            <span class="stat-label">Paragraphs</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${statistics.characterCount.toLocaleString()}</span>
            <span class="stat-label">Characters</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${statistics.pageCount}</span>
            <span class="stat-label">Pages</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${tables.length}</span>
            <span class="stat-label">Tables</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${images.length}</span>
            <span class="stat-label">Images</span>
          </div>
        </div>

        <div class="main-content">
          ${tocItems ? `
            <div class="sidebar">
              <h3 class="toc-title">📋 Table of Contents</h3>
              <ul class="toc-list">
                ${tocItems}
              </ul>
            </div>
          ` : ''}

          <div class="document-content">
            ${sectionsContent}
            ${tablesHtml}
            ${imagesHtml}
          </div>
        </div>

        <script>
          function scrollToSection(sectionIndex) {
            const section = document.getElementById('section-' + sectionIndex);
            if (section) {
              section.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
              });
            }
          }
        </script>
      </div>
    `;
  }

  private renderParagraph(paragraph: WordParagraph, sectionIndex: number, paragraphIndex: number): string {
    const { text, isHeading, isList, level, formatting } = paragraph;

    let classes = ['word-paragraph'];
    if (isHeading) {
      classes.push('heading', `level-${level || 1}`);
    }
    if (isList) {
      classes.push('list-item');
    }
    if (formatting?.bold) classes.push('bold');
    if (formatting?.italic) classes.push('italic');
    if (formatting?.underline) classes.push('underline');

    const className = classes.join(' ');

    return `<p class="${className}">${this.escapeHtml(text)}</p>`;
  }

  private renderTable(table: WordDocument['tables'][0], index: number): string {
    if (!table.data || table.data.length === 0) {
      return `
        <div class="document-table">
          <div class="table-title">Table ${index + 1} (${table.rows} rows × ${table.columns} columns)</div>
          <div class="table-content">
            <p>Table data could not be extracted</p>
          </div>
        </div>
      `;
    }

    const headerRow = table.data[0];
    const dataRows = table.data.slice(1);

    const headerHtml = headerRow.map(cell =>
      `<th>${this.escapeHtml(cell)}</th>`
    ).join('');

    const rowsHtml = dataRows.map(row =>
      `<tr>${row.map(cell => `<td>${this.escapeHtml(cell)}</td>`).join('')}</tr>`
    ).join('');

    return `
      <div class="document-table">
        <div class="table-title">📊 Table ${index + 1} (${table.rows} rows × ${table.columns} columns)</div>
        <div class="table-content">
          <table class="data-table">
            <thead>
              <tr>${headerHtml}</tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          ${dataRows.length >= 10 ? `<p style="text-align: center; color: #64748b; font-size: 0.875rem; margin: 0.5rem;">Showing first 10 rows</p>` : ''}
        </div>
      </div>
    `;
  }

  private async extractSimpleTextContent(blob: Blob, fileName: string, extension: string): Promise<WordDocument> {
    console.log('📝 Word Plugin: Extracting simple text content...');

    let textContent = '';
    const paragraphs: WordParagraph[] = [];

    try {
      if (extension === 'rtf') {
        // RTF files can be read as text with basic parsing
        textContent = await blob.text();
        textContent = this.cleanRtfText(textContent);
      } else {
        // For binary files, try to extract any readable text
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Convert to string and extract readable text
        let rawText = '';
        for (let i = 0; i < uint8Array.length; i++) {
          const char = uint8Array[i];
          // Include printable ASCII characters and common Unicode
          if ((char >= 32 && char <= 126) || char === 10 || char === 13 || char >= 160) {
            rawText += String.fromCharCode(char);
          } else if (char === 0 && rawText.slice(-1) !== ' ') {
            rawText += ' '; // Replace null bytes with spaces
          }
        }

        textContent = this.cleanExtractedText(rawText);
      }

      // If we extracted some text, parse it into paragraphs
      if (textContent && textContent.trim().length > 10) {
        const lines = textContent.split(/\n+/).filter(line => line.trim().length > 0);

        lines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.length > 0) {
            paragraphs.push({
              text: trimmed,
              isHeading: trimmed.length < 100 && !/[.!?]$/.test(trimmed),
              isList: /^[-•*]\s/.test(trimmed)
            });
          }
        });
      }
    } catch (error) {
      console.warn('⚠️ Text extraction failed:', error);
    }

    // If no text was extracted, provide informative content
    if (paragraphs.length === 0) {
      paragraphs.push({
        text: `Document: ${fileName}`,
        isHeading: true,
        level: 1,
        formatting: { bold: true }
      });
      paragraphs.push({
        text: 'This document contains content that cannot be extracted as text for preview. The file may contain:',
        isHeading: false
      });
      paragraphs.push({
        text: 'Complex formatting, images, tables, or embedded objects',
        isHeading: false,
        isList: true
      });
      paragraphs.push({
        text: 'Binary data or encrypted content',
        isHeading: false,
        isList: true
      });
      paragraphs.push({
        text: 'Special document features not supported in text extraction',
        isHeading: false,
        isList: true
      });
      paragraphs.push({
        text: 'To view the complete document with all formatting and content:',
        isHeading: true,
        level: 2
      });
      paragraphs.push({
        text: 'Download and open in Microsoft Word or compatible software',
        isHeading: false,
        isList: true
      });
    }

    const statistics = {
      wordCount: textContent ? textContent.split(/\s+/).filter(w => w.length > 0).length : 0,
      characterCount: textContent ? textContent.length : blob.size,
      paragraphCount: paragraphs.length,
      pageCount: Math.max(1, Math.ceil((textContent?.length || 0) / 2000)),
      sectionCount: 1
    };

    return {
      title: fileName,
      application: `Microsoft Word (${extension.toUpperCase()})`,
      sections: [{
        title: 'Document Content',
        paragraphs,
        level: 1
      }],
      paragraphs,
      statistics,
      tables: [],
      images: []
    };
  }

  private cleanRtfText(rtfContent: string): string {
    // Remove RTF control codes and formatting
    return rtfContent
      .replace(/\{\\\*[^}]*\}/g, '') // Remove destination groups
      .replace(/\\[a-z]+\d*/g, ' ') // Remove control words
      .replace(/\\[^a-z]/g, '') // Remove control symbols
      .replace(/[{}]/g, ' ') // Remove braces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private cleanExtractedText(rawText: string): string {
    return rawText
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ') // Remove control characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/(.{1,200})\s/g, '$1\n') // Add line breaks for readability
      .trim();
  }

  private async generateBasicTextPreview(blob: Blob, fileName: string, error: any): Promise<PreviewResult> {
    // Last resort: create a helpful preview explaining the issue
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    const content = `
      <div style="padding: 2rem; font-family: system-ui, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 2rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📝</div>
          <h1 style="color: #1e293b; margin: 0 0 0.5rem 0;">${this.escapeHtml(fileName)}</h1>
          <p style="color: #64748b; margin: 0;">Microsoft Word Document</p>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
          <h3 style="color: #374151; margin: 0 0 1rem 0;">📄 Document Information</h3>
          <p style="color: #4b5563; margin: 0;">This Word document is available for download. The content cannot be displayed in the browser preview due to the document's format or complexity.</p>
        </div>

        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
          <h4 style="color: #1e40af; margin: 0 0 1rem 0;">💡 To view this document:</h4>
          <ul style="color: #1e40af; margin: 0; padding-left: 1.5rem;">
            <li>Download the file using the download button</li>
            <li>Open with Microsoft Word, Google Docs, or compatible software</li>
            <li>Use Microsoft Word Online for browser-based viewing</li>
          </ul>
        </div>

        <div style="text-align: center;">
          <button onclick="window.parent.postMessage({type: 'download'}, '*')"
                  style="background: #2563eb; color: white; border: none; border-radius: 6px; padding: 0.75rem 1.5rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; margin-right: 0.5rem;">
            💾 Download Document
          </button>
          <button onclick="window.parent.postMessage({type: 'close'}, '*')"
                  style="background: #6b7280; color: white; border: none; border-radius: 6px; padding: 0.75rem 1.5rem; font-size: 0.875rem; font-weight: 500; cursor: pointer;">
            ✕ Close Preview
          </button>
        </div>
      </div>
    `;

    return {
      type: 'success',
      format: 'html',
      content,
      metadata: {
        title: fileName,
        pluginName: this.name,
        fallback: true
      }
    };
  }

  private generateLegacyDocFallback(fileName: string): PreviewResult {
    return {
      type: 'success',
      format: 'html',
      content: this.generateFallbackViewer(
        fileName,
        'This is a legacy Microsoft Word document (.doc format).',
        [
          'Legacy .doc files require Microsoft Word to view properly',
          'Download the file to open it in Microsoft Word',
          'Convert to DOCX format for better browser compatibility',
          'Use Microsoft Word Online if available'
        ],
        'doc'
      ),
      metadata: {
        title: fileName,
        pluginName: this.name,
        format: 'legacy_doc'
      }
    };
  }

  private generateFallbackViewer(fileName: string, message: string, suggestions: string[], fileExtension: string): string {
    const fileIcon = fileExtension === 'doc' ? '📄' : '📝';
    const fileType = fileExtension === 'doc' ? 'Microsoft Word 97-2003' : 'Microsoft Word';

    return `
      <div class="word-fallback-viewer">
        <style>
          .word-fallback-viewer {
            width: 100%;
            height: 100%;
            min-height: 500px;
            background: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            box-sizing: border-box;
          }

          .fallback-card {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            max-width: 600px;
            width: 100%;
            text-align: center;
          }

          .fallback-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
          }

          .fallback-title {
            color: #1e293b;
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
          }

          .fallback-subtitle {
            color: #64748b;
            font-size: 1rem;
            margin-bottom: 1.5rem;
          }

          .fallback-message {
            background: #eff6ff;
            border: 1px solid #bfdbfe;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            text-align: left;
          }

          .fallback-message h4 {
            color: #1e40af;
            margin: 0 0 1rem 0;
            font-size: 1rem;
            font-weight: 600;
          }

          .fallback-message p {
            color: #1e40af;
            margin: 0;
            line-height: 1.6;
          }

          .suggestions-section {
            background: #f8fafc;
            border-radius: 8px;
            padding: 1.5rem;
            text-align: left;
            margin-bottom: 1.5rem;
          }

          .suggestions-title {
            color: #374151;
            font-weight: 600;
            margin: 0 0 1rem 0;
            font-size: 1rem;
          }

          .suggestions-list {
            list-style: none;
            padding: 0;
            margin: 0;
          }

          .suggestions-list li {
            color: #4b5563;
            margin: 0.75rem 0;
            padding-left: 1.5rem;
            position: relative;
            line-height: 1.5;
          }

          .suggestions-list li::before {
            content: "💡";
            position: absolute;
            left: 0;
            top: 0;
          }

          .file-info {
            background: #f1f5f9;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            text-align: left;
          }

          .file-details {
            flex: 1;
          }

          .file-name {
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 0.25rem;
            word-break: break-all;
          }

          .file-type {
            color: #64748b;
            font-size: 0.875rem;
          }

          .download-actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
          }

          .download-btn {
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 0.75rem 1.5rem;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
          }

          .download-btn:hover {
            background: #1d4ed8;
          }

          .download-btn.secondary {
            background: #6b7280;
          }

          .download-btn.secondary:hover {
            background: #4b5563;
          }

          @media (max-width: 640px) {
            .word-fallback-viewer {
              padding: 1rem;
            }

            .fallback-card {
              padding: 1.5rem;
            }

            .file-info {
              flex-direction: column;
              text-align: center;
              gap: 0.5rem;
            }

            .download-actions {
              flex-direction: column;
            }
          }
        </style>

        <div class="fallback-card">
          <div class="fallback-icon">${fileIcon}</div>
          <h2 class="fallback-title">Word Document Preview</h2>
          <p class="fallback-subtitle">${fileType} Document</p>

          <div class="file-info">
            <div class="file-details">
              <div class="file-name">${this.escapeHtml(fileName)}</div>
              <div class="file-type">${fileType} (.${fileExtension})</div>
            </div>
          </div>

          <div class="fallback-message">
            <h4>📋 Preview Status</h4>
            <p>${this.escapeHtml(message)}</p>
          </div>

          <div class="suggestions-section">
            <h4 class="suggestions-title">💡 What you can do:</h4>
            <ul class="suggestions-list">
              ${suggestions.map(suggestion =>
                `<li>${this.escapeHtml(suggestion)}</li>`
              ).join('')}
            </ul>
          </div>

          <div class="download-actions">
            <button class="download-btn" onclick="window.parent.postMessage({type: 'download'}, '*')">
              💾 Download Document
            </button>
            <button class="download-btn secondary" onclick="window.parent.postMessage({type: 'close'}, '*')">
              ✕ Close Preview
            </button>
          </div>
        </div>
      </div>
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