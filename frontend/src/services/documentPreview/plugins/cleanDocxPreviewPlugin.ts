/**
 * Clean DOCX Preview Plugin
 * Provides clean, minimal document preview for DOCX files without debug metadata
 * Features: Clean interface, proper HTML formatting, document-like styling
 */

import { PreviewPlugin, PreviewResult, PreviewOptions } from '../pluginSystem';

interface ExtractorResult {
  content: string;
  html?: string;
  plainText?: string;
  method: string;
  success: boolean;
}

export class CleanDocxPreviewPlugin implements PreviewPlugin {
  name = 'CleanDocxPreviewPlugin';
  priority = 500; // Higher priority than other processors
  description = 'Clean DOCX preview without debug metadata and stats';
  version = '1.0.0';

  supportedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];

  supportedExtensions = ['.docx', '.doc'];

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
    console.log(`🔧 Clean DOCX Preview: Processing ${fileName}`);

    try {
      // Multi-stage extraction pipeline (best quality first)
      const extractors = [
        () => this.extractWithMammothEnhanced(blob),     // Primary: Rich HTML
        () => this.extractWithDocxPreview(blob),         // Secondary: DocX-Preview
        () => this.extractWithJSZipXML(blob),            // Tertiary: XML parsing
        () => this.extractBasicText(blob)                // Fallback: Text extraction
      ];

      let bestResult: ExtractorResult | null = null;

      // Try each extractor until we get good content
      for (const extractor of extractors) {
        try {
          const result = await extractor();
          if (result.success && result.content && result.content.trim().length > 50) {
            bestResult = result;
            break; // Use first successful extraction
          }
        } catch (error) {
          console.warn('DOCX extraction method failed:', error);
        }
      }

      // If no content extracted, provide clean fallback
      if (!bestResult) {
        bestResult = {
          content: this.generateCleanFallbackContent(fileName, blob.size),
          method: 'fallback',
          success: false
        };
      }

      // Generate clean preview without debug metadata
      const previewContent = this.generateCleanDocxPreview(
        fileName,
        bestResult,
        blob.size
      );

      // Debug logging to see what's being returned
      console.log('🔍 CleanDocxPreviewPlugin returning:', {
        type: 'success',
        format: 'html',
        contentPreview: previewContent.substring(0, 200) + '...',
        isHtmlContent: !!bestResult.html,
        extractionMethod: bestResult.method
      });

      return {
        type: 'success',
        format: 'html',
        content: previewContent,
        metadata: {
          title: fileName,
          fileSize: blob.size,
          extractionMethod: bestResult.method
        }
      };

    } catch (error) {
      console.error(`❌ Clean DOCX Preview failed for ${fileName}:`, error);
      return this.createCleanErrorFallback(blob, fileName, mimeType, error as Error);
    }
  }

  // PRIMARY EXTRACTOR: Enhanced Mammoth.js
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

      // Extract plain text for potential use
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = result.value;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';

      // Enhance HTML structure for better document display
      const enhancedHtml = this.enhanceDocumentHTML(result.value);

      // Debug logging to see what Mammoth.js returned
      console.log('🔍 Mammoth.js extraction result:', {
        originalLength: result.value.length,
        enhancedLength: enhancedHtml.length,
        rawHtmlPreview: result.value.substring(0, 200) + '...',
        enhancedHtmlPreview: enhancedHtml.substring(0, 200) + '...',
        plainTextPreview: plainText.substring(0, 100) + '...'
      });

      return {
        content: enhancedHtml,
        html: enhancedHtml,
        plainText: plainText,
        method: 'mammoth_enhanced',
        success: true
      };

    } catch (error) {
      throw new Error(`Enhanced Mammoth extraction failed: ${error.message}`);
    }
  }

  // SECONDARY EXTRACTOR: DocX-Preview
  private async extractWithDocxPreview(blob: Blob): Promise<ExtractorResult> {
    try {
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
          breakPages: false, // Disable page breaks for cleaner output
          ignoreLastRenderedPageBreak: true,
          experimental: true,
          trimXmlDeclaration: true
        });

        const renderedHtml = tempContainer.innerHTML;
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
          method: 'docx_preview',
          success: true
        };

      } catch (renderError) {
        document.body.removeChild(tempContainer);
        throw renderError;
      }

    } catch (error) {
      throw new Error(`DocX-Preview extraction failed: ${error.message}`);
    }
  }

  // TERTIARY EXTRACTOR: JSZip XML parsing
  private async extractWithJSZipXML(blob: Blob): Promise<ExtractorResult> {
    try {
      const JSZip = await import('jszip');
      const zip = new (JSZip as any).default();
      const zipContent = await zip.loadAsync(blob);

      // Extract from document.xml
      const documentXml = zipContent.files['word/document.xml'];
      if (!documentXml) {
        throw new Error('No document.xml found');
      }

      const xmlContent = await documentXml.async('text');

      // Enhanced text extraction with paragraph structure
      const paragraphMatches = xmlContent.match(/<w:p[^>]*>.*?<\/w:p>/g) || [];
      const extractedParagraphs = paragraphMatches
        .map(para => {
          const textMatches = para.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
          return textMatches
            .map(match => match.replace(/<w:t[^>]*>/, '').replace(/<\/w:t>/, ''))
            .join('')
            .trim();
        })
        .filter(para => para.length > 0);

      if (extractedParagraphs.length === 0) {
        throw new Error('No text content found in document.xml');
      }

      const extractedText = extractedParagraphs.join('\n\n');

      return {
        content: extractedText,
        plainText: extractedText,
        method: 'xml_parsing',
        success: true
      };

    } catch (error) {
      throw new Error(`XML parsing extraction failed: ${error.message}`);
    }
  }

  // FALLBACK EXTRACTOR: Basic text extraction
  private async extractBasicText(blob: Blob): Promise<ExtractorResult> {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      let text = '';
      let lastWasSpace = false;

      // Extract printable ASCII text
      for (let i = 0; i < uint8Array.length; i++) {
        const char = uint8Array[i];

        if ((char >= 32 && char <= 126) || char === 10 || char === 13) {
          text += String.fromCharCode(char);
          lastWasSpace = false;
        } else if ((char === 0 || char === 9) && !lastWasSpace) {
          text += ' ';
          lastWasSpace = true;
        }
      }

      // Clean up extracted text
      text = text
        .replace(/\s{3,}/g, '  ')
        .replace(/([.!?])\s*([A-Z])/g, '$1\n\n$2')
        .trim();

      // Filter out binary noise
      const lines = text.split('\n');
      const cleanLines = lines.filter(line => {
        const printableRatio = line.replace(/[^\x20-\x7E]/g, '').length / Math.max(line.length, 1);
        return printableRatio > 0.7 && line.length > 3;
      });

      const cleanedText = cleanLines.join('\n').trim();

      if (cleanedText.length < 50) {
        throw new Error('Insufficient readable text found');
      }

      return {
        content: cleanedText,
        plainText: cleanedText,
        method: 'text_extraction',
        success: true
      };

    } catch (error) {
      throw new Error(`Text extraction failed: ${error.message}`);
    }
  }

  // Generate clean DOCX preview without debug metadata
  private generateCleanDocxPreview(
    fileName: string,
    extractorResult: ExtractorResult,
    fileSize: number
  ): string {
    const isHtmlContent = !!extractorResult.html;
    const hasContent = extractorResult.success && extractorResult.content.trim().length > 0;

    // Return clean structure WITHOUT inline styles - CSS will be applied externally
    return `
      <div class="clean-docx-preview">
        <div class="document-container">
          <div class="document-header">
            <h1 class="document-title">${this.escapeHtml(fileName)}</h1>
          </div>

          <div class="document-content">
            ${hasContent ? (
              isHtmlContent ?
                `<div class="docx-preview formatted-content">${extractorResult.content}</div>` :
                `<div class="docx-preview plain-content">${this.formatPlainText(extractorResult.content)}</div>`
            ) : (
              `<div class="docx-preview fallback-content">${this.formatPlainText(extractorResult.content)}</div>`
            )}
          </div>
        </div>
      </div>
    `;
  }

  // Enhance HTML structure for better document display
  private enhanceDocumentHTML(html: string): string {
    let enhanced = html;

    console.log('🔍 Original Mammoth HTML:', enhanced.substring(0, 300));

    // Clean up empty paragraphs and improve structure
    enhanced = enhanced.replace(/<p><\/p>/g, '<p>&nbsp;</p>');
    enhanced = enhanced.replace(/(<p[^>]*>)\s*(<\/p>)/g, '$1&nbsp;$2');

    // Convert bold paragraphs to headings for better document structure
    enhanced = enhanced.replace(/<p><strong>([^<]+)<\/strong><\/p>/g, '<h3>$1</h3>');
    enhanced = enhanced.replace(/<p><b>([^<]+)<\/b><\/p>/g, '<h3>$1</h3>');

    // Improve heading hierarchy - convert ALL_CAPS paragraphs to headings
    enhanced = enhanced.replace(/<p>([A-Z\s]{3,})<\/p>/g, '<h2>$1</h2>');

    // Ensure proper paragraph structure - add document-style classes
    enhanced = enhanced.replace(/<p>/g, '<p class="doc-paragraph">');
    enhanced = enhanced.replace(/<h1>/g, '<h1 class="doc-heading-1">');
    enhanced = enhanced.replace(/<h2>/g, '<h2 class="doc-heading-2">');
    enhanced = enhanced.replace(/<h3>/g, '<h3 class="doc-heading-3">');

    // Improve list formatting with proper nesting
    enhanced = enhanced.replace(/(<\/ul>)\s*(<ul>)/g, '$1$2');
    enhanced = enhanced.replace(/(<\/ol>)\s*(<ol>)/g, '$1$2');
    enhanced = enhanced.replace(/<li>/g, '<li class="doc-list-item">');

    // Add proper line breaks for readability (but not for display)
    enhanced = enhanced.replace(/(<\/p>)(?!\s*<)/g, '$1\n');
    enhanced = enhanced.replace(/(<\/li>)(?!\s*<)/g, '$1\n');
    enhanced = enhanced.replace(/(<\/h[1-6]>)(?!\s*<)/g, '$1\n');

    // Clean up excessive whitespace
    enhanced = enhanced.replace(/\n\s*\n\s*\n/g, '\n\n');

    // Add container wrapper for better styling
    enhanced = `<div class="document-body">${enhanced}</div>`;

    console.log('✅ Enhanced HTML:', enhanced.substring(0, 300));

    return enhanced.trim();
  }

  // Format plain text with basic paragraph structure
  private formatPlainText(text: string): string {
    return text
      .split('\n\n')
      .map(paragraph => `<p>${this.escapeHtml(paragraph.trim())}</p>`)
      .join('\n');
  }

  // Generate clean fallback content
  private generateCleanFallbackContent(fileName: string, fileSize: number): string {
    return `Document Preview Unavailable

This Microsoft Word document is available for download and viewing in compatible applications.

The document content cannot be displayed due to complex formatting, protection, or compatibility limitations.

To view the complete document:
• Download the file
• Open with Microsoft Word or compatible software
• Use Microsoft Word Online for browser viewing`;
  }

  // Create clean error fallback
  private createCleanErrorFallback(blob: Blob, fileName: string, mimeType: string, error: Error): PreviewResult {
    const content = `Document Processing Error

An error occurred while processing this Word document.

The document is available for download and should open normally in Microsoft Word or compatible applications.

Error details: ${error.message}`;

    return {
      type: 'success',
      format: 'html',
      content: this.generateCleanDocxPreview(fileName, {
        content: content,
        method: 'error_fallback',
        success: false
      }, blob.size),
      metadata: {
        title: fileName,
        fileSize: blob.size,
        extractionMethod: 'error_fallback',
        error: error.message
      }
    };
  }

  // Note: CSS styles are now handled externally by React component
  // This method is no longer used but kept for potential future reference
  private getCleanDocxStyles(): string {
    // Styles moved to external CSS files or React component styling
    return '';
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}