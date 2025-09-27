/**
 * Comprehensive Office Document Processor
 * Redesigned pipeline for ALL Office file types with proper formatting preservation
 * Features: Multi-stage fallback system, layout-based page counting, sandboxed rendering
 */

import { PreviewPlugin, PreviewResult, PreviewOptions } from '../pluginSystem';

interface ExtractorResult {
  content: string;
  html?: string;
  metadata?: any;
  method: string;
  success: boolean;
  plainText?: string;
}

interface LayoutMetrics {
  wordCount: number;
  pageCount: number;
  estimatedReadingTime: number;
  structureInfo: {
    headings: number;
    paragraphs: number;
    lists: number;
    tables: number;
    images: number;
  };
}

export class ComprehensiveOfficeProcessor implements PreviewPlugin {
  name = 'ComprehensiveOfficeProcessor';
  priority = 400; // Higher priority than universal processor
  description = 'Advanced Office document processor with multi-stage fallback and rich formatting';
  version = '2.0.0';

  supportedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint'
  ];

  supportedExtensions = ['.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt'];

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
    console.log(`🔧 Comprehensive Office Processor: Processing ${fileName} (${mimeType})`);

    try {
      const extension = fileName.toLowerCase().split('.').pop() || '';
      let result: PreviewResult;

      // Route to appropriate specialized processor
      if (this.isWordDocument(extension, mimeType)) {
        result = await this.processWordDocumentAdvanced(blob, fileName, mimeType);
      } else if (this.isExcelDocument(extension, mimeType)) {
        result = await this.processExcelDocumentAdvanced(blob, fileName, mimeType);
      } else if (this.isPowerPointDocument(extension, mimeType)) {
        result = await this.processPowerPointDocumentAdvanced(blob, fileName, mimeType);
      } else {
        throw new Error(`Unsupported file type: ${extension}`);
      }

      const processingTime = performance.now() - startTime;
      console.log(`✅ Comprehensive Office Processor: Completed ${fileName} in ${processingTime.toFixed(1)}ms`);

      // Add processing metadata
      if (result.metadata) {
        result.metadata.processingTime = `${processingTime.toFixed(1)}ms`;
        result.metadata.pluginName = this.name;
        result.metadata.pluginVersion = this.version;
      }

      return result;

    } catch (error) {
      console.error(`❌ Comprehensive Office Processor failed for ${fileName}:`, error);
      return this.createErrorFallback(blob, fileName, mimeType, error as Error);
    }
  }

  private isWordDocument(extension: string, mimeType: string): boolean {
    return ['docx', 'doc'].includes(extension) ||
           mimeType.includes('wordprocessingml') ||
           mimeType.includes('msword');
  }

  private isExcelDocument(extension: string, mimeType: string): boolean {
    return ['xlsx', 'xls'].includes(extension) ||
           mimeType.includes('spreadsheetml') ||
           mimeType.includes('ms-excel');
  }

  private isPowerPointDocument(extension: string, mimeType: string): boolean {
    return ['pptx', 'ppt'].includes(extension) ||
           mimeType.includes('presentationml') ||
           mimeType.includes('ms-powerpoint');
  }

  // WORD DOCUMENT PROCESSING with Multi-Stage Pipeline
  private async processWordDocumentAdvanced(blob: Blob, fileName: string, mimeType: string): Promise<PreviewResult> {
    console.log('📝 Processing Word document with advanced pipeline...');

    // Multi-stage extraction pipeline
    const extractors = [
      () => this.extractWithDocxPreview(blob),     // Primary: Rich HTML rendering
      () => this.extractWithMammothEnhanced(blob), // Secondary: Enhanced Mammoth.js
      () => this.extractWithJSZipAdvanced(blob),   // Tertiary: Advanced XML parsing
      () => this.extractWithBinaryFallback(blob)   // Quaternary: Binary text extraction
    ];

    let bestResult: ExtractorResult | null = null;
    const extractionResults: ExtractorResult[] = [];

    // Try each extractor in order
    for (const extractor of extractors) {
      try {
        const result = await extractor();
        extractionResults.push(result);

        if (result.success && result.content && result.content.trim().length > 50) {
          bestResult = result;
          break; // Use first successful extraction
        }
      } catch (error) {
        console.warn('Word extraction method failed:', error);
        extractionResults.push({
          content: '',
          method: 'failed',
          success: false
        });
      }
    }

    // If no extraction succeeded, create informative fallback
    if (!bestResult) {
      bestResult = {
        content: this.generateWordFallbackContent(fileName, blob.size),
        method: 'info_display',
        success: false
      };
    }

    // Calculate layout-based metrics
    const layoutMetrics = this.calculateLayoutMetrics(
      bestResult.plainText || bestResult.content,
      bestResult.html,
      bestResult.method
    );

    // Generate sandboxed preview
    const previewContent = this.generateWordSandboxedPreview(
      fileName,
      bestResult,
      layoutMetrics,
      blob.size,
      extractionResults
    );

    return {
      type: 'success',
      format: 'html',
      content: previewContent,
      metadata: {
        title: fileName,
        extractionMethod: bestResult.method,
        extractionAttempts: extractionResults.length,
        fileSize: blob.size,
        isRichFormat: !!bestResult.html,
        ...layoutMetrics,
        ...bestResult.metadata
      }
    };
  }

  // PRIMARY EXTRACTOR: DocX-Preview for Rich HTML
  private async extractWithDocxPreview(blob: Blob): Promise<ExtractorResult> {
    try {
      // Import docx-preview dynamically
      const { renderAsync } = await import('docx-preview');

      const arrayBuffer = await blob.arrayBuffer();

      // Create temporary container for rendering
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = '210mm'; // A4 width
      tempContainer.style.height = 'auto';
      document.body.appendChild(tempContainer);

      try {
        // Render document with docx-preview
        await renderAsync(arrayBuffer, tempContainer, undefined, {
          className: 'docx-preview-content',
          inWrapper: false,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          experimental: true,
          trimXmlDeclaration: true
        });

        // Extract rendered HTML content
        const renderedHtml = tempContainer.innerHTML;

        // Extract plain text for statistics
        const plainText = tempContainer.textContent || tempContainer.innerText || '';

        // Clean up
        document.body.removeChild(tempContainer);

        if (!renderedHtml || renderedHtml.trim().length === 0) {
          throw new Error('DocX-Preview returned empty content');
        }

        return {
          content: renderedHtml,
          html: renderedHtml,
          plainText: plainText,
          method: 'docx_preview_rich',
          success: true,
          metadata: {
            hasRichFormatting: true,
            preservesLayout: true,
            supportsPageBreaks: true
          }
        };

      } catch (renderError) {
        document.body.removeChild(tempContainer);
        throw renderError;
      }

    } catch (error) {
      throw new Error(`DocX-Preview extraction failed: ${error.message}`);
    }
  }

  // SECONDARY EXTRACTOR: Enhanced Mammoth.js
  private async extractWithMammothEnhanced(blob: Blob): Promise<ExtractorResult> {
    try {
      const mammoth = await import('mammoth');
      const arrayBuffer = await blob.arrayBuffer();

      // Enhanced options for better formatting preservation
      const options = {
        arrayBuffer,
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "p[style-name='Heading 4'] => h4:fresh",
          "p[style-name='Title'] => h1.title:fresh",
          "p[style-name='Subtitle'] => h2.subtitle:fresh",
          "r[style-name='Strong'] => strong",
          "r[style-name='Emphasis'] => em"
        ],
        convertImage: mammoth.images.imgElement((image: any) => {
          return image.read("base64").then((imageBuffer: any) => {
            return {
              src: `data:${image.contentType};base64,${imageBuffer}`
            };
          });
        }),
        includeDefaultStyleMap: true,
        includeEmbeddedStyleMap: true
      };

      const result = await mammoth.convertToHtml(options);

      if (!result.value || result.value.trim().length === 0) {
        throw new Error('Mammoth returned empty content');
      }

      // Extract plain text for metrics
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = result.value;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';

      // Enhance HTML structure
      const enhancedHtml = this.enhanceMammothHTML(result.value);

      return {
        content: enhancedHtml,
        html: enhancedHtml,
        plainText: plainText,
        method: 'mammoth_enhanced',
        success: true,
        metadata: {
          warnings: result.messages?.map(m => m.message) || [],
          hasImages: result.value.includes('<img'),
          hasTables: result.value.includes('<table'),
          hasLists: result.value.includes('<ul') || result.value.includes('<ol')
        }
      };

    } catch (error) {
      throw new Error(`Enhanced Mammoth extraction failed: ${error.message}`);
    }
  }

  // TERTIARY EXTRACTOR: Advanced JSZip XML parsing
  private async extractWithJSZipAdvanced(blob: Blob): Promise<ExtractorResult> {
    try {
      const JSZip = await import('jszip');
      const zip = new (JSZip as any).default();
      const zipContent = await zip.loadAsync(blob);

      // Extract from multiple XML sources
      const sources = [
        'word/document.xml',
        'word/header1.xml',
        'word/footer1.xml',
        'word/endnotes.xml',
        'word/footnotes.xml'
      ];

      let extractedText = '';
      let structureInfo = {
        paragraphs: 0,
        headings: 0,
        tables: 0,
        lists: 0
      };

      for (const source of sources) {
        const file = zipContent.files[source];
        if (file) {
          try {
            const xmlContent = await file.async('text');

            // Enhanced text extraction with structure detection
            const textMatches = xmlContent.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
            const extractedLines = textMatches
              .map(match => match.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, ''))
              .filter(text => text.trim().length > 0);

            // Detect document structure
            const paragraphCount = (xmlContent.match(/<w:p[^>]*>/g) || []).length;
            const tableCount = (xmlContent.match(/<w:tbl[^>]*>/g) || []).length;
            const listCount = (xmlContent.match(/<w:numPr>/g) || []).length;

            structureInfo.paragraphs += paragraphCount;
            structureInfo.tables += tableCount;
            structureInfo.lists += listCount;

            if (extractedLines.length > 0) {
              extractedText += extractedLines.join(' ') + '\n\n';
            }

          } catch (xmlError) {
            console.warn(`Failed to parse ${source}:`, xmlError);
          }
        }
      }

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text content found in document XML');
      }

      // Clean and format extracted text
      extractedText = extractedText
        .replace(/\s+/g, ' ')
        .replace(/(.{80})/g, '$1\n') // Add line breaks for readability
        .trim();

      return {
        content: extractedText,
        plainText: extractedText,
        method: 'jszip_advanced_xml',
        success: true,
        metadata: {
          sourcesProcessed: sources.length,
          structureInfo,
          xmlParsing: true
        }
      };

    } catch (error) {
      throw new Error(`Advanced JSZip extraction failed: ${error.message}`);
    }
  }

  // QUATERNARY EXTRACTOR: Binary fallback with smart text filtering
  private async extractWithBinaryFallback(blob: Blob): Promise<ExtractorResult> {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      let text = '';
      let lastWasSpace = false;

      // Smart binary text extraction
      for (let i = 0; i < uint8Array.length; i++) {
        const char = uint8Array[i];

        if ((char >= 32 && char <= 126) || char === 10 || char === 13) {
          // Printable ASCII or line breaks
          text += String.fromCharCode(char);
          lastWasSpace = false;
        } else if (char === 0 || char === 9) {
          // Null bytes or tabs - replace with space if not already space
          if (!lastWasSpace) {
            text += ' ';
            lastWasSpace = true;
          }
        }
      }

      // Clean up extracted text
      text = text
        .replace(/\s{3,}/g, '  ') // Reduce excessive whitespace
        .replace(/([.!?])\s*([A-Z])/g, '$1\n\n$2') // Add paragraphs after sentences
        .replace(/(.{100})/g, '$1\n') // Add line breaks for readability
        .trim();

      // Filter out likely binary noise
      const lines = text.split('\n');
      const cleanLines = lines.filter(line => {
        const printableRatio = line.replace(/[^\x20-\x7E]/g, '').length / Math.max(line.length, 1);
        return printableRatio > 0.7 && line.length > 3;
      });

      const cleanedText = cleanLines.join('\n').trim();

      if (cleanedText.length < 50) {
        throw new Error('Insufficient readable text found in binary data');
      }

      return {
        content: cleanedText,
        plainText: cleanedText,
        method: 'binary_smart_extraction',
        success: true,
        metadata: {
          originalLength: text.length,
          cleanedLength: cleanedText.length,
          linesFiltered: lines.length - cleanLines.length
        }
      };

    } catch (error) {
      throw new Error(`Binary fallback extraction failed: ${error.message}`);
    }
  }

  // EXCEL DOCUMENT PROCESSING with Enhanced Support
  private async processExcelDocumentAdvanced(blob: Blob, fileName: string, mimeType: string): Promise<PreviewResult> {
    console.log('📊 Processing Excel document with advanced pipeline...');

    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await blob.arrayBuffer();

      // Configure XLSX options for better data extraction
      const workbook = XLSX.read(arrayBuffer, {
        type: 'array',
        cellHTML: true,
        cellFormula: true,
        cellText: true,
        cellDates: true,
        dateNF: 'yyyy-mm-dd'
      });

      const sheets = workbook.SheetNames.map(sheetName => {
        const worksheet = workbook.Sheets[sheetName];

        // Get sheet range and metadata
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        const totalRows = range.e.r + 1;
        const totalCols = range.e.c + 1;

        // Extract data with formatting
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          raw: false,
          dateNF: 'yyyy-mm-dd'
        });

        // Get HTML representation for rich formatting
        const htmlTable = XLSX.utils.sheet_to_html(worksheet, {
          id: `sheet-${sheetName}`,
          editable: false
        });

        return {
          name: sheetName,
          data: jsonData.slice(0, 100), // Limit preview rows
          totalRows,
          totalCols,
          htmlTable,
          metadata: {
            hasFormulas: Object.keys(worksheet).some(key => worksheet[key].f),
            hasComments: Object.keys(worksheet).some(key => worksheet[key].c),
            mergedCells: worksheet['!merges']?.length || 0
          }
        };
      });

      const totalCells = sheets.reduce((sum, sheet) => sum + (sheet.totalRows * sheet.totalCols), 0);

      const previewContent = this.generateExcelSandboxedPreview(
        fileName,
        { sheets, totalSheets: sheets.length, totalCells },
        blob.size
      );

      return {
        type: 'success',
        format: 'html',
        content: previewContent,
        metadata: {
          title: fileName,
          extractionMethod: 'xlsx_advanced',
          fileSize: blob.size,
          sheetCount: sheets.length,
          totalCells,
          hasFormulas: sheets.some(s => s.metadata.hasFormulas),
          hasComments: sheets.some(s => s.metadata.hasComments)
        }
      };

    } catch (error) {
      console.error('Excel processing failed:', error);

      // Fallback to basic extraction
      return this.createErrorFallback(blob, fileName, mimeType, error as Error);
    }
  }

  // POWERPOINT PROCESSING with Enhanced Slide Extraction
  private async processPowerPointDocumentAdvanced(blob: Blob, fileName: string, mimeType: string): Promise<PreviewResult> {
    console.log('📋 Processing PowerPoint document with advanced pipeline...');

    try {
      const JSZip = await import('jszip');
      const zip = new (JSZip as any).default();
      const zipContent = await zip.loadAsync(blob);

      const slides: any[] = [];
      let slideCount = 0;
      let totalTextContent = '';

      // Extract slide content and relationships
      for (const fileName of Object.keys(zipContent.files)) {
        if (fileName.startsWith('ppt/slides/slide') && fileName.endsWith('.xml')) {
          slideCount++;

          try {
            const slideXml = await zipContent.files[fileName].async('text');

            // Enhanced text extraction with structure detection
            const titleMatches = slideXml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
            const slideTexts = titleMatches
              .map(match => match.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, ''))
              .filter(text => text.trim().length > 0);

            // Detect slide structure
            const hasTitle = slideXml.includes('p:cSld') && slideXml.includes('p:sp');
            const hasImages = slideXml.includes('pic:blipFill') || slideXml.includes('a:blip');
            const hasShapes = (slideXml.match(/<p:sp[^>]*>/g) || []).length;
            const hasCharts = slideXml.includes('c:chart');

            const slideContent = slideTexts.join(' ').trim();
            if (slideContent) {
              slides.push({
                number: slideCount,
                title: slideTexts[0] || `Slide ${slideCount}`,
                content: slideContent,
                metadata: {
                  hasTitle,
                  hasImages,
                  hasShapes,
                  hasCharts,
                  textBlocks: slideTexts.length
                }
              });

              totalTextContent += `\nSlide ${slideCount}: ${slideContent}`;
            }

          } catch (slideError) {
            console.warn(`Failed to parse slide ${slideCount}:`, slideError);
          }
        }
      }

      if (slides.length === 0) {
        throw new Error('No slide content could be extracted');
      }

      const layoutMetrics = this.calculateLayoutMetrics(totalTextContent, undefined, 'powerpoint_extraction');

      const previewContent = this.generatePowerPointSandboxedPreview(
        fileName,
        { slides, slideCount: slides.length, totalTextContent },
        layoutMetrics,
        blob.size
      );

      return {
        type: 'success',
        format: 'html',
        content: previewContent,
        metadata: {
          title: fileName,
          extractionMethod: 'powerpoint_advanced_xml',
          fileSize: blob.size,
          slideCount: slides.length,
          ...layoutMetrics,
          hasImages: slides.some(s => s.metadata.hasImages),
          hasCharts: slides.some(s => s.metadata.hasCharts)
        }
      };

    } catch (error) {
      console.error('PowerPoint processing failed:', error);
      return this.createErrorFallback(blob, fileName, mimeType, error as Error);
    }
  }

  // LAYOUT-BASED METRICS CALCULATION
  private calculateLayoutMetrics(content: string, html?: string, method?: string): LayoutMetrics {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    const lines = content.split('\n').length;

    // Improved page calculation based on layout and content type
    let pageCount = 1;
    if (words.length > 0) {
      if (method === 'docx_preview_rich' && html) {
        // For rich HTML content, estimate based on actual layout
        pageCount = this.estimatePageCountFromHTML(html);
      } else if (words.length < 150) {
        // Short documents
        pageCount = 1;
      } else if (words.length < 600) {
        // Medium documents - more conservative estimate
        pageCount = Math.ceil(words.length / 450);
      } else {
        // Long documents - account for formatting overhead
        pageCount = Math.ceil(words.length / 500);
      }
    }

    // Reading time estimation (average 225 words per minute)
    const estimatedReadingTime = Math.max(1, Math.ceil(words.length / 225));

    // Structure analysis
    const structureInfo = {
      headings: html ? (html.match(/<h[1-6][^>]*>/gi) || []).length :
                      (content.match(/^.{1,100}:$/gm) || []).length,
      paragraphs: html ? (html.match(/<p[^>]*>/gi) || []).length :
                        content.split('\n\n').length,
      lists: html ? (html.match(/<[uo]l[^>]*>/gi) || []).length :
                   (content.match(/^\s*[•\-\*]\s/gm) || []).length,
      tables: html ? (html.match(/<table[^>]*>/gi) || []).length :
                    (content.match(/\|.*\|/g) || []).length,
      images: html ? (html.match(/<img[^>]*>/gi) || []).length : 0
    };

    return {
      wordCount: words.length,
      pageCount: Math.max(1, pageCount),
      estimatedReadingTime,
      structureInfo
    };
  }

  // Estimate page count from HTML content using layout analysis
  private estimatePageCountFromHTML(html: string): number {
    try {
      // Create temporary container to measure content
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '210mm'; // A4 width
      tempContainer.style.fontSize = '12pt';
      tempContainer.style.lineHeight = '1.5';
      tempContainer.style.fontFamily = 'Times New Roman, serif';
      tempContainer.innerHTML = html;

      document.body.appendChild(tempContainer);

      // Measure content height
      const contentHeight = tempContainer.scrollHeight;

      // A4 page height in pixels (approximately 297mm at 96 DPI)
      const pageHeight = 1122; // ~297mm in pixels
      const marginHeight = 200; // Account for margins
      const usablePageHeight = pageHeight - marginHeight;

      const pageCount = Math.max(1, Math.ceil(contentHeight / usablePageHeight));

      document.body.removeChild(tempContainer);

      return pageCount;

    } catch (error) {
      console.warn('Failed to estimate page count from HTML:', error);
      // Fallback to word-based estimation
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      const text = tempDiv.textContent || tempDiv.innerText || '';
      const words = text.trim().split(/\s+/).length;
      return Math.max(1, Math.ceil(words / 450));
    }
  }

  // SANDBOXED PREVIEW GENERATORS

  private generateWordSandboxedPreview(
    fileName: string,
    extractorResult: ExtractorResult,
    metrics: LayoutMetrics,
    fileSize: number,
    extractionAttempts: ExtractorResult[]
  ): string {
    const isRichFormat = !!extractorResult.html;
    const successfulMethod = extractorResult.method;

    return `
      <div class="comprehensive-office-preview">
        ${this.getComprehensiveStyles()}

        <div class="document-header">
          <div class="header-content">
            <div class="file-info">
              <div class="doc-icon">📝</div>
              <div class="file-details">
                <h1>${this.escapeHtml(fileName)}</h1>
                <div class="file-meta">Microsoft Word Document • ${this.formatFileSize(fileSize)}</div>
              </div>
            </div>
            <div class="status-badge ${extractorResult.success ? 'success' : 'warning'}">
              ${isRichFormat ? '🎨 Rich Format' : extractorResult.success ? '✅ Content Extracted' : '⚠️ Limited Preview'}
            </div>
          </div>
        </div>

        <div class="metrics-dashboard">
          <div class="metric">
            <span class="metric-label">Words</span>
            <span class="metric-value">${metrics.wordCount.toLocaleString()}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Pages</span>
            <span class="metric-value">${metrics.pageCount}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Read Time</span>
            <span class="metric-value">${metrics.estimatedReadingTime} min</span>
          </div>
          <div class="metric">
            <span class="metric-label">Extraction</span>
            <span class="metric-value">${this.getMethodDisplayName(successfulMethod)}</span>
          </div>
        </div>

        <div class="structure-overview">
          <div class="structure-item">
            <span class="structure-icon">📋</span>
            <span class="structure-text">${metrics.structureInfo.paragraphs} paragraphs</span>
          </div>
          ${metrics.structureInfo.headings > 0 ? `
          <div class="structure-item">
            <span class="structure-icon">📑</span>
            <span class="structure-text">${metrics.structureInfo.headings} headings</span>
          </div>
          ` : ''}
          ${metrics.structureInfo.tables > 0 ? `
          <div class="structure-item">
            <span class="structure-icon">📊</span>
            <span class="structure-text">${metrics.structureInfo.tables} tables</span>
          </div>
          ` : ''}
          ${metrics.structureInfo.lists > 0 ? `
          <div class="structure-item">
            <span class="structure-icon">📝</span>
            <span class="structure-text">${metrics.structureInfo.lists} lists</span>
          </div>
          ` : ''}
        </div>

        <div class="document-content">
          <div class="content-container ${isRichFormat ? 'rich-format' : 'text-format'}">
            ${isRichFormat ?
              `<div class="sandboxed-content rich-document">${extractorResult.content}</div>` :
              `<pre class="sandboxed-content plain-text">${this.escapeHtml(extractorResult.content)}</pre>`
            }
          </div>
        </div>

        ${extractionAttempts.length > 1 ? `
        <div class="extraction-info">
          <details>
            <summary>Extraction Methods Attempted (${extractionAttempts.length})</summary>
            <div class="extraction-methods">
              ${extractionAttempts.map((attempt, index) => `
                <div class="extraction-method ${attempt.success ? 'success' : 'failed'}">
                  <span class="method-indicator">${attempt.success ? '✅' : '❌'}</span>
                  <span class="method-name">${this.getMethodDisplayName(attempt.method)}</span>
                  ${index === 0 && attempt.success ? '<span class="method-used">USED</span>' : ''}
                </div>
              `).join('')}
            </div>
          </details>
        </div>
        ` : ''}
      </div>
    `;
  }

  private generateExcelSandboxedPreview(
    fileName: string,
    data: any,
    fileSize: number
  ): string {
    const hasData = data.sheets && data.sheets.length > 0;
    const firstSheet = hasData ? data.sheets[0] : null;

    return `
      <div class="comprehensive-office-preview excel-preview">
        ${this.getComprehensiveStyles()}

        <div class="document-header">
          <div class="header-content">
            <div class="file-info">
              <div class="doc-icon">📊</div>
              <div class="file-details">
                <h1>${this.escapeHtml(fileName)}</h1>
                <div class="file-meta">Microsoft Excel Spreadsheet • ${this.formatFileSize(fileSize)}</div>
              </div>
            </div>
            <div class="status-badge success">
              ✅ Data Extracted
            </div>
          </div>
        </div>

        <div class="metrics-dashboard">
          <div class="metric">
            <span class="metric-label">Sheets</span>
            <span class="metric-value">${data.totalSheets || 0}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Total Cells</span>
            <span class="metric-value">${(data.totalCells || 0).toLocaleString()}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Preview Rows</span>
            <span class="metric-value">${firstSheet ? Math.min(firstSheet.data.length, 100) : 0}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Extraction</span>
            <span class="metric-value">XLSX.js</span>
          </div>
        </div>

        <div class="document-content">
          ${hasData ? `
            <div class="sheets-container">
              ${data.sheets.slice(0, 3).map((sheet: any, index: number) => `
                <div class="sheet-preview ${index === 0 ? 'active' : ''}">
                  <div class="sheet-header">
                    <h3>📊 ${this.escapeHtml(sheet.name)}</h3>
                    <div class="sheet-stats">
                      ${sheet.totalRows} rows × ${sheet.totalCols} columns
                      ${sheet.metadata.hasFormulas ? ' • Contains formulas' : ''}
                      ${sheet.metadata.mergedCells > 0 ? ` • ${sheet.metadata.mergedCells} merged cells` : ''}
                    </div>
                  </div>
                  <div class="sheet-content">
                    ${this.generateAdvancedTableHTML(sheet.data, sheet.name)}
                  </div>
                </div>
              `).join('')}

              ${data.sheets.length > 3 ? `
                <div class="additional-sheets">
                  <p>+ ${data.sheets.length - 3} more sheets available</p>
                </div>
              ` : ''}
            </div>
          ` : `
            <div class="no-data">
              <p>No spreadsheet data could be extracted from this file.</p>
            </div>
          `}
        </div>
      </div>
    `;
  }

  private generatePowerPointSandboxedPreview(
    fileName: string,
    data: any,
    metrics: LayoutMetrics,
    fileSize: number
  ): string {
    const hasSlides = data.slides && data.slides.length > 0;

    return `
      <div class="comprehensive-office-preview powerpoint-preview">
        ${this.getComprehensiveStyles()}

        <div class="document-header">
          <div class="header-content">
            <div class="file-info">
              <div class="doc-icon">📋</div>
              <div class="file-details">
                <h1>${this.escapeHtml(fileName)}</h1>
                <div class="file-meta">Microsoft PowerPoint Presentation • ${this.formatFileSize(fileSize)}</div>
              </div>
            </div>
            <div class="status-badge success">
              ✅ Slides Extracted
            </div>
          </div>
        </div>

        <div class="metrics-dashboard">
          <div class="metric">
            <span class="metric-label">Slides</span>
            <span class="metric-value">${data.slideCount || 0}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Words</span>
            <span class="metric-value">${metrics.wordCount.toLocaleString()}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Est. Duration</span>
            <span class="metric-value">${Math.max(1, Math.ceil(data.slideCount * 1.5))} min</span>
          </div>
          <div class="metric">
            <span class="metric-label">Extraction</span>
            <span class="metric-value">XML Parser</span>
          </div>
        </div>

        <div class="document-content">
          ${hasSlides ? `
            <div class="slides-container">
              ${data.slides.slice(0, 10).map((slide: any) => `
                <div class="slide-preview">
                  <div class="slide-header">
                    <h3>Slide ${slide.number}</h3>
                    <div class="slide-indicators">
                      ${slide.metadata.hasImages ? '<span class="indicator">🖼️ Images</span>' : ''}
                      ${slide.metadata.hasCharts ? '<span class="indicator">📊 Charts</span>' : ''}
                      ${slide.metadata.hasShapes ? `<span class="indicator">🔷 ${slide.metadata.hasShapes} shapes</span>` : ''}
                    </div>
                  </div>
                  <div class="slide-content">
                    <h4>${this.escapeHtml(slide.title)}</h4>
                    <div class="slide-text">${this.escapeHtml(slide.content)}</div>
                  </div>
                </div>
              `).join('')}

              ${data.slides.length > 10 ? `
                <div class="additional-slides">
                  <p>+ ${data.slides.length - 10} more slides available</p>
                </div>
              ` : ''}
            </div>
          ` : `
            <div class="no-data">
              <p>No slide content could be extracted from this presentation.</p>
            </div>
          `}
        </div>
      </div>
    `;
  }

  // UTILITY METHODS

  private generateAdvancedTableHTML(data: any[], sheetName: string): string {
    if (!data || data.length === 0) return '<p>No data available</p>';

    const maxRows = Math.min(data.length, 50); // Limit for performance
    const maxCols = 15; // Limit columns for readability

    const headerRow = data[0];
    const dataRows = data.slice(1, maxRows);

    return `
      <div class="advanced-table-container">
        <table class="advanced-data-table">
          <thead>
            <tr>
              ${headerRow.slice(0, maxCols).map((cell: any, index: number) =>
                `<th title="Column ${String.fromCharCode(65 + index)}">${this.escapeHtml(String(cell || ''))}</th>`
              ).join('')}
              ${headerRow.length > maxCols ? '<th class="more-cols">...</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${dataRows.map((row, rowIndex) => `
              <tr>
                ${row.slice(0, maxCols).map((cell: any) =>
                  `<td title="${this.escapeHtml(String(cell || ''))}">${this.escapeHtml(String(cell || ''))}</td>`
                ).join('')}
                ${row.length > maxCols ? '<td class="more-cols">...</td>' : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${data.length > maxRows || headerRow.length > maxCols ? `
          <div class="table-note">
            Showing ${Math.min(maxRows, dataRows.length)} of ${data.length - 1} rows
            ${headerRow.length > maxCols ? ` and ${maxCols} of ${headerRow.length} columns` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  private enhanceMammothHTML(html: string): string {
    let enhanced = html;

    // Fix common Mammoth.js formatting issues
    enhanced = enhanced.replace(/<p><\/p>/g, '<p>&nbsp;</p>');
    enhanced = enhanced.replace(/(<p[^>]*>)\s*(<\/p>)/g, '$1&nbsp;$2');
    enhanced = enhanced.replace(/<p><strong>([^<]+)<\/strong><\/p>/g, '<h3>$1</h3>');

    // Improve list formatting
    enhanced = enhanced.replace(/(<\/ul>)\s*(<ul>)/g, '$1$2');
    enhanced = enhanced.replace(/(<\/ol>)\s*(<ol>)/g, '$1$2');

    // Add semantic structure
    enhanced = enhanced.replace(/(<\/p>)(?!\s*<)/g, '$1\n');
    enhanced = enhanced.replace(/(<\/li>)(?!\s*<)/g, '$1\n');
    enhanced = enhanced.replace(/(<\/h[1-6]>)(?!\s*<)/g, '$1\n');

    // Clean up whitespace
    enhanced = enhanced.replace(/\n\s*\n\s*\n/g, '\n\n');

    return enhanced.trim();
  }

  private generateWordFallbackContent(fileName: string, fileSize: number): string {
    return `Document Preview Unavailable

This Microsoft Word document (${fileName}) could not be processed for preview due to:

• Complex document structure or formatting
• Document protection or encryption
• Unsupported embedded content
• File corruption or compatibility issues

File Information:
• Name: ${fileName}
• Size: ${this.formatFileSize(fileSize)}
• Type: Microsoft Word Document

To view this document:
• Download the file and open with Microsoft Word
• Use Microsoft Word Online for browser viewing
• Convert to PDF format for universal compatibility
• Contact support if you continue experiencing issues

The document is fully available for download and should open normally in compatible applications.`;
  }

  private createErrorFallback(blob: Blob, fileName: string, mimeType: string, error: Error): PreviewResult {
    const content = `Document Processing Error

An error occurred while processing ${fileName}:
${error.message}

This document is available for download. The preview failed due to technical limitations.

File Information:
• Name: ${fileName}
• Size: ${this.formatFileSize(blob.size)}
• Type: ${mimeType || 'Unknown'}

Recommended Actions:
• Download the file for viewing in appropriate software
• Verify the file is not corrupted
• Check file format compatibility
• Contact support if this issue persists`;

    return {
      type: 'success',
      format: 'html',
      content: this.generateErrorPreviewHTML(fileName, content, blob.size, mimeType),
      metadata: {
        title: fileName,
        extractionMethod: 'error_fallback',
        fileSize: blob.size,
        error: error.message
      }
    };
  }

  private generateErrorPreviewHTML(fileName: string, content: string, fileSize: number, mimeType: string): string {
    return `
      <div class="comprehensive-office-preview error-preview">
        ${this.getComprehensiveStyles()}

        <div class="document-header error">
          <div class="header-content">
            <div class="file-info">
              <div class="doc-icon">⚠️</div>
              <div class="file-details">
                <h1>${this.escapeHtml(fileName)}</h1>
                <div class="file-meta">${mimeType} • ${this.formatFileSize(fileSize)}</div>
              </div>
            </div>
            <div class="status-badge error">
              ❌ Processing Failed
            </div>
          </div>
        </div>

        <div class="document-content">
          <div class="error-content">
            <pre>${this.escapeHtml(content)}</pre>
          </div>
        </div>
      </div>
    `;
  }

  private getMethodDisplayName(method: string): string {
    const names: { [key: string]: string } = {
      'docx_preview_rich': 'DocX-Preview',
      'mammoth_enhanced': 'Mammoth.js+',
      'jszip_advanced_xml': 'XML Parser',
      'binary_smart_extraction': 'Binary Filter',
      'xlsx_advanced': 'XLSX.js',
      'powerpoint_advanced_xml': 'PPT Parser',
      'info_display': 'Info Only',
      'error_fallback': 'Error'
    };
    return names[method] || method;
  }

  private getComprehensiveStyles(): string {
    return `
      <style>
        .comprehensive-office-preview {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        .document-header {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .document-header.error {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1400px;
          margin: 0 auto;
        }

        .file-info {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .doc-icon {
          font-size: 4rem;
          background: rgba(255,255,255,0.15);
          padding: 1rem;
          border-radius: 16px;
          backdrop-filter: blur(10px);
        }

        .file-details h1 {
          margin: 0;
          font-size: 2rem;
          font-weight: 700;
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .file-meta {
          font-size: 1rem;
          opacity: 0.9;
          margin-top: 0.5rem;
        }

        .status-badge {
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          backdrop-filter: blur(10px);
        }

        .status-badge.success {
          background: rgba(16, 185, 129, 0.9);
          color: white;
        }

        .status-badge.warning {
          background: rgba(245, 158, 11, 0.9);
          color: white;
        }

        .status-badge.error {
          background: rgba(239, 68, 68, 0.9);
          color: white;
        }

        .metrics-dashboard {
          background: white;
          margin: 0;
          padding: 2rem;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 2rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .metric {
          text-align: center;
          padding: 1rem;
          border-radius: 12px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .metric-label {
          display: block;
          font-size: 0.875rem;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
          font-weight: 600;
        }

        .metric-value {
          display: block;
          font-size: 2rem;
          font-weight: 800;
          color: #1e293b;
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .structure-overview {
          background: white;
          padding: 1.5rem 2rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          flex-wrap: wrap;
          gap: 1.5rem;
        }

        .structure-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .structure-icon {
          font-size: 1.1rem;
        }

        .structure-text {
          font-size: 0.9rem;
          color: #475569;
          font-weight: 500;
        }

        .document-content {
          flex: 1;
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }

        .content-container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .sandboxed-content {
          padding: 3rem;
          min-height: 500px;
          overflow-x: auto;
        }

        .sandboxed-content.rich-document {
          font-family: 'Times New Roman', Times, serif;
          font-size: 16px;
          line-height: 1.6;
          color: #1a1a1a;
        }

        .sandboxed-content.plain-text {
          font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;
          font-size: 14px;
          line-height: 1.5;
          color: #374151;
          white-space: pre-wrap;
          word-wrap: break-word;
          margin: 0;
        }

        /* Rich document formatting */
        .rich-document h1,
        .rich-document h2,
        .rich-document h3,
        .rich-document h4,
        .rich-document h5,
        .rich-document h6 {
          color: #1e293b;
          margin: 1.5em 0 0.75em 0;
          font-weight: 600;
          line-height: 1.3;
        }

        .rich-document h1 {
          font-size: 2.25em;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 0.3em;
        }

        .rich-document h2 {
          font-size: 1.75em;
          border-bottom: 2px solid #94a3b8;
          padding-bottom: 0.2em;
        }

        .rich-document h3 {
          font-size: 1.5em;
        }

        .rich-document p {
          margin: 1em 0;
          text-align: justify;
        }

        .rich-document table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.5em 0;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .rich-document table th,
        .rich-document table td {
          border: 1px solid #d1d5db;
          padding: 0.75em;
          text-align: left;
          vertical-align: top;
        }

        .rich-document table th {
          background: #f3f4f6;
          font-weight: 600;
          color: #374151;
        }

        .rich-document table tr:nth-child(even) {
          background: #f9fafb;
        }

        .rich-document ul,
        .rich-document ol {
          margin: 1em 0;
          padding-left: 2em;
        }

        .rich-document li {
          margin: 0.5em 0;
        }

        /* Excel-specific styles */
        .excel-preview .sheets-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .sheet-preview {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .sheet-header {
          background: #f8fafc;
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
        }

        .sheet-header h3 {
          margin: 0 0 0.5rem 0;
          color: #1e293b;
          font-size: 1.25rem;
        }

        .sheet-stats {
          font-size: 0.9rem;
          color: #64748b;
        }

        .advanced-table-container {
          overflow-x: auto;
          background: white;
        }

        .advanced-data-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
          font-family: 'SF Mono', Monaco, monospace;
        }

        .advanced-data-table th,
        .advanced-data-table td {
          border: 1px solid #e2e8f0;
          padding: 0.5rem 0.75rem;
          text-align: left;
          vertical-align: top;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .advanced-data-table th {
          background: #f1f5f9;
          font-weight: 600;
          color: #475569;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .advanced-data-table tr:nth-child(even) {
          background: #f8fafc;
        }

        .advanced-data-table tr:hover {
          background: #e0f2fe;
        }

        .more-cols {
          background: #e2e8f0 !important;
          color: #64748b;
          font-style: italic;
          text-align: center;
        }

        /* PowerPoint-specific styles */
        .powerpoint-preview .slides-container {
          display: grid;
          gap: 2rem;
        }

        .slide-preview {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }

        .slide-header {
          background: #f8fafc;
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .slide-header h3 {
          margin: 0;
          color: #1e293b;
          font-size: 1.25rem;
        }

        .slide-indicators {
          display: flex;
          gap: 0.5rem;
        }

        .indicator {
          padding: 0.25rem 0.5rem;
          background: #e0f2fe;
          color: #0369a1;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .slide-content {
          padding: 2rem;
        }

        .slide-content h4 {
          margin: 0 0 1rem 0;
          color: #1e293b;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .slide-text {
          color: #475569;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .table-note,
        .additional-sheets,
        .additional-slides {
          text-align: center;
          padding: 1rem;
          color: #64748b;
          font-style: italic;
          background: #f8fafc;
          border-radius: 8px;
          margin-top: 1rem;
        }

        .extraction-info {
          margin-top: 2rem;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .extraction-info summary {
          padding: 1rem 1.5rem;
          cursor: pointer;
          background: #f8fafc;
          border-radius: 12px;
          font-weight: 500;
          color: #475569;
        }

        .extraction-methods {
          padding: 1rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .extraction-method {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.5rem;
          border-radius: 6px;
        }

        .extraction-method.success {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
        }

        .extraction-method.failed {
          background: #fef2f2;
          border: 1px solid #fecaca;
        }

        .method-indicator {
          font-size: 1.1rem;
        }

        .method-name {
          flex: 1;
          font-weight: 500;
          color: #374151;
        }

        .method-used {
          background: #3b82f6;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .error-content {
          padding: 2rem;
          background: #fef2f2;
          border-left: 4px solid #ef4444;
        }

        .error-content pre {
          color: #374151;
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 0.9rem;
          line-height: 1.5;
          margin: 0;
          white-space: pre-wrap;
        }

        .no-data {
          padding: 3rem;
          text-align: center;
          color: #64748b;
          font-size: 1.1rem;
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .document-header {
            padding: 1.5rem;
          }

          .header-content {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .file-details h1 {
            font-size: 1.5rem;
          }

          .metrics-dashboard {
            grid-template-columns: repeat(2, 1fr);
            padding: 1.5rem;
            gap: 1rem;
          }

          .metric-value {
            font-size: 1.5rem;
          }

          .structure-overview {
            padding: 1rem 1.5rem;
          }

          .document-content {
            padding: 1rem;
          }

          .sandboxed-content {
            padding: 1.5rem;
          }

          .advanced-data-table th,
          .advanced-data-table td {
            padding: 0.375rem 0.5rem;
            max-width: 120px;
          }
        }

        /* Print styles */
        @media print {
          .comprehensive-office-preview {
            background: white;
          }

          .document-header {
            background: #f8fafc !important;
            color: #1e293b !important;
            box-shadow: none;
          }

          .status-badge,
          .extraction-info {
            display: none;
          }

          .sandboxed-content.rich-document {
            font-size: 12pt;
            line-height: 1.4;
          }
        }
      </style>
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