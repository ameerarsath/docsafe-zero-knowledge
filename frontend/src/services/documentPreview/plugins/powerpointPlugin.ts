/**
 * Production-Level PowerPoint Preview Plugin
 * Advanced content extraction from PPT and PPTX files with image support, formatting, and comprehensive metadata
 */

import { PreviewPlugin, PreviewResult, PreviewOptions } from '../pluginSystem';
import JSZip from 'jszip';

interface PowerPointImage {
  id: string;
  name: string;
  type: string;
  size: number;
  base64Data: string;
  slideNumber: number;
  description?: string;
}

interface PowerPointSlideData {
  slideNumber: number;
  title: string;
  content: string;
  notes: string;
  layout: string;
  images: PowerPointImage[];
  bullets: string[];
  tables: PowerPointTable[];
  hasAnimations: boolean;
  slideId: string;
}

interface PowerPointTable {
  rows: number;
  columns: number;
  data: string[][];
  hasHeader: boolean;
}

interface PowerPointMetadata {
  author: string;
  title: string;
  subject: string;
  created: string;
  modified: string;
  company: string;
  version: string;
  slideCount: number;
  hasNotes: boolean;
  hasImages: boolean;
  hasTables: boolean;
  hasAnimations: boolean;
  fileSize: number;
}

interface PowerPointPresentation {
  slides: PowerPointSlideData[];
  metadata: PowerPointMetadata;
  images: PowerPointImage[];
  fileName: string;
  extractionSuccess: boolean;
  extractionMethod: 'full' | 'partial' | 'info';
  totalSlides: number;
  statistics: {
    textSlides: number;
    imageSlides: number;
    tableSlides: number;
    animatedSlides: number;
    notesCount: number;
    totalWords: number;
    totalImages: number;
  };
}

export class PowerPointPreviewPlugin implements PreviewPlugin {
  name = 'PowerPointPreview';
  priority = 80; // Higher priority for production-level extraction

  supportedMimeTypes = [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];

  supportedExtensions = ['.ppt', '.pptx'];

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
      console.log('🎯 Production PowerPoint Plugin: Starting advanced extraction for', fileName);

      const extension = fileName.toLowerCase().split('.').pop();
      let presentation: PowerPointPresentation;

      try {
        if (extension === 'pptx' || mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
          presentation = await this.extractPptxContent(blob, fileName);
          console.log(`✅ PowerPoint Plugin: Successfully extracted PPTX content in ${(performance.now() - startTime).toFixed(1)}ms`);
        } else {
          // For PPT files, try simple text extraction first
          presentation = await this.extractSimplePresentationContent(blob, fileName, 'PPT');
          console.log('ℹ️ PowerPoint Plugin: Extracted text content from PPT file');
        }
      } catch (error) {
        console.warn('⚠️ PowerPoint Plugin: Advanced extraction failed, falling back to simple extraction:', error);
        try {
          presentation = await this.extractSimplePresentationContent(blob, fileName, extension?.toUpperCase() || 'PowerPoint');
        } catch (fallbackError) {
          console.warn('⚠️ PowerPoint Plugin: Simple extraction failed, using info display:', fallbackError);
          presentation = this.createInfoDisplay(blob, fileName, extension?.toUpperCase() || 'PowerPoint');
        }
      }

      const previewHtml = this.generatePowerPointViewer(presentation);

      return {
        type: 'success',
        format: 'html',
        content: previewHtml,
        metadata: {
          title: fileName,
          creator: 'Microsoft PowerPoint',
          slides: presentation.totalSlides,
          extractionMethod: presentation.extractionMethod,
          processingTime: `${(performance.now() - startTime).toFixed(1)}ms`
        }
      };
    } catch (error) {
      console.error('❌ PowerPoint preview error:', error);
      // Even if everything fails, provide a helpful preview
      return await this.generateBasicPresentationPreview(blob, fileName, error);
    }
  }

  private async extractPptxContent(blob: Blob, fileName: string): Promise<PowerPointPresentation> {
    try {
      console.log('📊 Production PowerPoint Plugin: Starting comprehensive PPTX extraction...');

      const zip = new JSZip();
      const zipContent = await zip.loadAsync(blob);
      console.log('✅ PowerPoint Plugin: PPTX zip loaded successfully');

      // Extract metadata first
      const metadata = await this.extractMetadata(zipContent, blob.size);

      // Get slide files with natural sorting
      const slideFiles = Object.keys(zipContent.files)
        .filter(path => path.startsWith('ppt/slides/slide') && path.endsWith('.xml'))
        .sort((a, b) => {
          const numA = parseInt(a.match(/slide(\d+)/)?.[1] || '0');
          const numB = parseInt(b.match(/slide(\d+)/)?.[1] || '0');
          return numA - numB;
        });

      console.log(`✅ PowerPoint Plugin: Found ${slideFiles.length} slides`);

      // Extract images from media folder
      const images = await this.extractImages(zipContent);
      console.log(`✅ PowerPoint Plugin: Found ${images.length} images`);

      const slides: PowerPointSlideData[] = [];
      const maxSlides = Math.min(slideFiles.length, 50); // Process up to 50 slides

      for (let i = 0; i < maxSlides; i++) {
        const slideFile = zipContent.files[slideFiles[i]];
        if (slideFile) {
          const slideXml = await slideFile.async('text');
          const slideData = await this.parseSlideXml(slideXml, i + 1, images, zipContent);
          slides.push(slideData);
        }
      }

      if (slides.length === 0) {
        throw new Error('No readable slides found in presentation');
      }

      // Calculate statistics
      const statistics = this.calculateStatistics(slides, images);

      return {
        slides,
        metadata,
        images,
        fileName,
        extractionSuccess: true,
        extractionMethod: 'full',
        totalSlides: slideFiles.length,
        statistics
      };
    } catch (error) {
      console.error('❌ PowerPoint Plugin: PPTX extraction failed:', error);
      throw error;
    }
  }

  private async parseSlideXml(
    xmlContent: string,
    slideNumber: number,
    allImages: PowerPointImage[],
    zipContent: JSZip
  ): Promise<PowerPointSlideData> {
    try {
      // Extract all text content from <a:t> tags
      const textMatches = xmlContent.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
      const allText = textMatches
        .map(match => match.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '').trim())
        .filter(text => text.length > 0);

      // Extract slide title (usually the first text element or from title placeholder)
      const titleMatch = xmlContent.match(/<p:sp[^>]*>.*?<p:nvSpPr>.*?<p:cNvPr[^>]*name="Title[^"]*".*?<\/p:sp>/s);
      let title = '';
      if (titleMatch) {
        const titleTextMatches = titleMatch[0].match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
        title = titleTextMatches
          .map(match => match.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '').trim())
          .join(' ');
      }
      if (!title && allText.length > 0) {
        title = allText[0];
      }
      if (!title) {
        title = `Slide ${slideNumber}`;
      }

      // Extract bullet points and content
      const bullets: string[] = [];
      const contentText: string[] = [];

      // Look for bullet points in paragraph structures
      const bulletMatches = xmlContent.match(/<a:buChar[^>]*char="([^"]*)"/g) || [];
      const hasBullets = bulletMatches.length > 0;

      // Extract text from paragraph structures
      const paragraphMatches = xmlContent.match(/<a:p[^>]*>[\s\S]*?<\/a:p>/g) || [];

      for (const para of paragraphMatches) {
        const paraText = para.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
        const text = paraText
          .map(match => match.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '').trim())
          .join(' ')
          .trim();

        if (text && text !== title && text.length > 0) {
          if (hasBullets && para.includes('<a:buChar')) {
            bullets.push(text);
          } else {
            contentText.push(text);
          }
        }
      }

      // If no content was extracted from paragraphs, use all text except title
      if (contentText.length === 0 && bullets.length === 0 && allText.length > 1) {
        contentText.push(...allText.slice(1)); // Skip title
      }

      // Extract tables
      const tables = this.extractTablesFromSlide(xmlContent);

      // Find images on this slide
      const slideImages = allImages.filter(img => img.slideNumber === slideNumber);

      // Check for animations
      const hasAnimations = xmlContent.includes('<p:timing>') || xmlContent.includes('<p:animLst>');

      // Detect slide layout
      const layoutMatch = xmlContent.match(/<p:sldLayout[^>]*>/);
      const layout = layoutMatch ? this.detectSlideLayout(xmlContent) : 'Content';

      // Extract speaker notes
      const notes = await this.extractSlideNotes(slideNumber, zipContent);

      // Generate slide ID
      const slideIdMatch = xmlContent.match(/<p:sld[^>]*id="([^"]*)"/);
      const slideId = slideIdMatch?.[1] || `slide-${slideNumber}`;

      // Debug logging
      console.log(`📋 Slide ${slideNumber}: Title="${title}", Content=${contentText.length} items, Bullets=${bullets.length} items`);
      if (contentText.length > 0) console.log(`   Content: ${contentText.join(' | ')}`);
      if (bullets.length > 0) console.log(`   Bullets: ${bullets.join(' | ')}`);

      return {
        slideNumber,
        title,
        content: contentText.join('\n\n'),
        notes,
        layout,
        images: slideImages,
        bullets,
        tables,
        hasAnimations,
        slideId
      };
    } catch (error) {
      console.error(`❌ PowerPoint Plugin: Slide ${slideNumber} XML parsing failed:`, error);
      return {
        slideNumber,
        title: `Slide ${slideNumber}`,
        content: 'Unable to extract slide content',
        notes: '',
        layout: 'Unknown',
        images: [],
        bullets: [],
        tables: [],
        hasAnimations: false,
        slideId: `slide-${slideNumber}`
      };
    }
  }

  private createInfoDisplay(blob: Blob, fileName: string, format: string): PowerPointPresentation {
    const metadata: PowerPointMetadata = {
      author: 'Unknown',
      title: fileName,
      subject: '',
      created: '',
      modified: '',
      company: '',
      version: format,
      slideCount: 3,
      hasNotes: false,
      hasImages: true,
      hasTables: false,
      hasAnimations: false,
      fileSize: blob.size
    };

    const infoSlides: PowerPointSlideData[] = [
      {
        slideNumber: 1,
        title: `${format} Presentation Preview`,
        content: `This is a Microsoft PowerPoint presentation in ${format} format.\n\nFile: ${fileName}\nSize: ${this.formatFileSize(blob.size)}\n\nFor the complete presentation experience with animations, transitions, and full formatting, please download and open the file in Microsoft PowerPoint or a compatible application.`,
        notes: '',
        layout: 'Title and Content',
        images: [],
        bullets: [
          `File: ${fileName}`,
          `Size: ${this.formatFileSize(blob.size)}`,
          'Format: Microsoft PowerPoint ' + format,
          'Full content requires download'
        ],
        tables: [],
        hasAnimations: false,
        slideId: 'info-1'
      },
      {
        slideNumber: 2,
        title: 'Viewing Options',
        content: `Complete your presentation experience with these options`,
        notes: '',
        layout: 'Two Content',
        images: [],
        bullets: [
          '🎯 Full Experience: Download and open in PowerPoint',
          '🎯 View animations and transitions',
          '🎯 Access speaker notes',
          '🎯 Edit and present',
          '🌐 Online Options: Use PowerPoint Online',
          '🌐 Upload to cloud services',
          '🌐 Share with collaborators'
        ],
        tables: [],
        hasAnimations: false,
        slideId: 'info-2'
      },
      {
        slideNumber: 3,
        title: 'Technical Information',
        content: `Detailed file specifications and capabilities`,
        notes: '',
        layout: 'Content with Caption',
        images: [],
        bullets: [
          `📄 Filename: ${fileName}`,
          `💾 Size: ${this.formatFileSize(blob.size)}`,
          `🎨 Format: Microsoft PowerPoint ${format}`,
          `🔒 Security: Preview mode - full content requires download`,
          `⚡ Processing: Client-side preview generation`,
          `🌐 Compatibility: Modern web browsers supported`
        ],
        tables: [],
        hasAnimations: false,
        slideId: 'info-3'
      }
    ];

    const statistics = {
      textSlides: 3,
      imageSlides: 0,
      tableSlides: 0,
      animatedSlides: 0,
      notesCount: 0,
      totalWords: infoSlides.reduce((total, slide) => total + slide.content.split(' ').length, 0),
      totalImages: 0
    };

    return {
      slides: infoSlides,
      metadata,
      images: [],
      fileName,
      extractionSuccess: false,
      extractionMethod: 'info',
      totalSlides: infoSlides.length,
      statistics
    };
  }

  // Add the new helper methods
  private async extractMetadata(zipContent: JSZip, fileSize: number): Promise<PowerPointMetadata> {
    try {
      // Try to extract metadata from app.xml and core.xml
      const appXmlFile = zipContent.files['docProps/app.xml'];
      const coreXmlFile = zipContent.files['docProps/core.xml'];

      let metadata: PowerPointMetadata = {
        author: 'Unknown',
        title: '',
        subject: '',
        created: '',
        modified: '',
        company: '',
        version: '',
        slideCount: 0,
        hasNotes: false,
        hasImages: false,
        hasTables: false,
        hasAnimations: false,
        fileSize
      };

      if (coreXmlFile) {
        const coreXml = await coreXmlFile.async('text');

        const titleMatch = coreXml.match(/<dc:title>([^<]*)<\/dc:title>/);
        if (titleMatch) metadata.title = titleMatch[1];

        const authorMatch = coreXml.match(/<dc:creator>([^<]*)<\/dc:creator>/);
        if (authorMatch) metadata.author = authorMatch[1];

        const subjectMatch = coreXml.match(/<dc:subject>([^<]*)<\/dc:subject>/);
        if (subjectMatch) metadata.subject = subjectMatch[1];

        const createdMatch = coreXml.match(/<dcterms:created[^>]*>([^<]*)<\/dcterms:created>/);
        if (createdMatch) metadata.created = new Date(createdMatch[1]).toLocaleDateString();

        const modifiedMatch = coreXml.match(/<dcterms:modified[^>]*>([^<]*)<\/dcterms:modified>/);
        if (modifiedMatch) metadata.modified = new Date(modifiedMatch[1]).toLocaleDateString();
      }

      if (appXmlFile) {
        const appXml = await appXmlFile.async('text');

        const companyMatch = appXml.match(/<Company>([^<]*)<\/Company>/);
        if (companyMatch) metadata.company = companyMatch[1];

        const versionMatch = appXml.match(/<AppVersion>([^<]*)<\/AppVersion>/);
        if (versionMatch) metadata.version = versionMatch[1];

        const slidesMatch = appXml.match(/<Slides>([^<]*)<\/Slides>/);
        if (slidesMatch) metadata.slideCount = parseInt(slidesMatch[1]) || 0;
      }

      return metadata;
    } catch (error) {
      console.warn('⚠️ Could not extract metadata:', error);
      return {
        author: 'Unknown',
        title: '',
        subject: '',
        created: '',
        modified: '',
        company: '',
        version: '',
        slideCount: 0,
        hasNotes: false,
        hasImages: false,
        hasTables: false,
        hasAnimations: false,
        fileSize
      };
    }
  }

  private async extractImages(zipContent: JSZip): Promise<PowerPointImage[]> {
    try {
      const images: PowerPointImage[] = [];
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
              type: `image/${extension}`,
              size: arrayBuffer.byteLength,
              base64Data: base64,
              slideNumber: 0, // Will be updated when processing slides
              description: `Image ${images.length + 1}`
            });
          } catch (error) {
            console.warn(`⚠️ Could not extract image ${mediaPath}:`, error);
          }
        }
      }

      console.log(`✅ Extracted ${images.length} images from presentation`);
      return images;
    } catch (error) {
      console.warn('⚠️ Could not extract images:', error);
      return [];
    }
  }

  private extractTablesFromSlide(xmlContent: string): PowerPointTable[] {
    try {
      const tables: PowerPointTable[] = [];

      // Look for table structures in PowerPoint XML
      const tableMatches = xmlContent.match(/<a:tbl[^>]*>[\s\S]*?<\/a:tbl>/g) || [];

      for (const tableXml of tableMatches) {
        const rowMatches = tableXml.match(/<a:tr[^>]*>[\s\S]*?<\/a:tr>/g) || [];
        const tableData: string[][] = [];
        let maxColumns = 0;

        for (const rowXml of rowMatches) {
          const cellMatches = rowXml.match(/<a:tc[^>]*>[\s\S]*?<\/a:tc>/g) || [];
          const rowData: string[] = [];

          for (const cellXml of cellMatches) {
            const textMatches = cellXml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
            const cellText = textMatches
              .map(match => match.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '').trim())
              .join(' ');
            rowData.push(cellText);
          }

          if (rowData.length > maxColumns) {
            maxColumns = rowData.length;
          }
          tableData.push(rowData);
        }

        if (tableData.length > 0) {
          tables.push({
            rows: tableData.length,
            columns: maxColumns,
            data: tableData,
            hasHeader: true // Assume first row is header
          });
        }
      }

      return tables;
    } catch (error) {
      console.warn('⚠️ Could not extract tables:', error);
      return [];
    }
  }

  private detectSlideLayout(xmlContent: string): string {
    if (xmlContent.includes('name="Title Slide"')) return 'Title Slide';
    if (xmlContent.includes('name="Title and Content"')) return 'Title and Content';
    if (xmlContent.includes('name="Section Header"')) return 'Section Header';
    if (xmlContent.includes('name="Two Content"')) return 'Two Content';
    if (xmlContent.includes('name="Comparison"')) return 'Comparison';
    if (xmlContent.includes('name="Content with Caption"')) return 'Content with Caption';
    if (xmlContent.includes('name="Picture with Caption"')) return 'Picture with Caption';
    if (xmlContent.includes('name="Blank"')) return 'Blank';
    return 'Content';
  }

  private async extractSlideNotes(slideNumber: number, zipContent: JSZip): Promise<string> {
    try {
      const notesFile = zipContent.files[`ppt/notesSlides/notesSlide${slideNumber}.xml`];
      if (!notesFile) return '';

      const notesXml = await notesFile.async('text');
      const textMatches = notesXml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];

      return textMatches
        .map(match => match.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '').trim())
        .filter(text => text.length > 0)
        .join(' ');
    } catch (error) {
      return '';
    }
  }

  private calculateStatistics(slides: PowerPointSlideData[], images: PowerPointImage[]): PowerPointPresentation['statistics'] {
    return {
      textSlides: slides.filter(slide => slide.content.length > 0 || slide.bullets.length > 0).length,
      imageSlides: slides.filter(slide => slide.images.length > 0).length,
      tableSlides: slides.filter(slide => slide.tables.length > 0).length,
      animatedSlides: slides.filter(slide => slide.hasAnimations).length,
      notesCount: slides.filter(slide => slide.notes.length > 0).length,
      totalWords: slides.reduce((total, slide) => {
        const slideWords = slide.content.split(/\s+/).length +
                          slide.bullets.join(' ').split(/\s+/).length;
        return total + slideWords;
      }, 0),
      totalImages: images.length
    };
  }

  private generatePowerPointViewer(presentation: PowerPointPresentation): string {
    const fileSizeFormatted = this.formatFileSize(presentation.metadata.fileSize);
    const isActualContent = presentation.extractionMethod === 'full';
    const stats = presentation.statistics;

    // Generate slide navigation with enhanced features
    const slideNavigation = presentation.slides.map((slide, index) => {
      const hasImages = slide.images.length > 0;
      const hasTables = slide.tables.length > 0;
      const hasAnimations = slide.hasAnimations;

      return `<button class="slide-nav-btn ${index === 0 ? 'active' : ''}"
        data-slide="${index}"
        data-action="show-slide"
        title="${slide.title}${hasImages ? ' 🖼️' : ''}${hasTables ? ' 📊' : ''}${hasAnimations ? ' ⚡' : ''}">
        ${slide.slideNumber}
        <div class="slide-indicators">
          ${hasImages ? '<span class="indicator image-indicator">🖼️</span>' : ''}
          ${hasTables ? '<span class="indicator table-indicator">📊</span>' : ''}
          ${hasAnimations ? '<span class="indicator animation-indicator">⚡</span>' : ''}
        </div>
      </button>`;
    }).join('');

    // Generate enhanced slide content
    const slideContents = presentation.slides.map((slide, index) => {
      const slideImages = slide.images.map(img =>
        `<div class="slide-image">
          <img src="data:${img.type};base64,${img.base64Data}" alt="${img.description || img.name}"
               title="${img.name} (${this.formatFileSize(img.size)})" />
          <div class="image-caption">${img.name}</div>
        </div>`
      ).join('');

      const slideTables = slide.tables.map((table, tableIndex) => {
        const tableRows = table.data.map((row, rowIndex) => {
          const cells = row.map(cell =>
            rowIndex === 0 && table.hasHeader
              ? `<th>${this.escapeHtml(cell)}</th>`
              : `<td>${this.escapeHtml(cell)}</td>`
          ).join('');
          return `<tr>${cells}</tr>`;
        }).join('');

        return `<div class="slide-table">
          <h5>Table ${tableIndex + 1} (${table.rows} rows × ${table.columns} columns)</h5>
          <table class="powerpoint-table">
            ${tableRows}
          </table>
        </div>`;
      }).join('');

      const bulletsHtml = slide.bullets.length > 0 ? `
        <div class="slide-bullets">
          <ul>
            ${slide.bullets.map(bullet => `<li>${this.escapeHtml(bullet)}</li>`).join('')}
          </ul>
        </div>
      ` : '';

      return `
        <div class="slide-content ${index === 0 ? 'active' : ''}" data-slide="${index}">
          <div class="slide-header">
            <div class="slide-title-section">
              <h2 class="slide-title">${this.escapeHtml(slide.title)}</h2>
              <div class="slide-layout">${slide.layout}</div>
            </div>
            <div class="slide-meta">
              <div class="slide-number">Slide ${slide.slideNumber} of ${presentation.totalSlides}</div>
              <div class="slide-features">
                ${slide.images.length > 0 ? `<span class="feature-badge">🖼️ ${slide.images.length}</span>` : ''}
                ${slide.tables.length > 0 ? `<span class="feature-badge">📊 ${slide.tables.length}</span>` : ''}
                ${slide.hasAnimations ? '<span class="feature-badge">⚡ Animated</span>' : ''}
              </div>
            </div>
          </div>
          <div class="slide-body">
            ${slide.content && slide.content.trim() ? `<div class="slide-text">${this.formatSlideContent(slide.content)}</div>` : ''}
            ${bulletsHtml}
            ${slideImages}
            ${slideTables}
            ${!slide.content.trim() && slide.bullets.length === 0 && slide.tables.length === 0 && slide.images.length === 0 ?
              `<div class="slide-text"><p><em>No content available for this slide</em></p></div>` : ''}
          </div>
          ${slide.notes ? `
            <div class="slide-notes">
              <h4>📝 Speaker Notes:</h4>
              <p>${this.escapeHtml(slide.notes)}</p>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="powerpoint-preview-container">
        <style>
          .powerpoint-preview-container {
            width: 100%;
            height: 100vh;
            max-height: 800px;
            display: flex;
            flex-direction: column;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            min-height: 600px;
            overflow: hidden;
          }
          .powerpoint-header {
            background: linear-gradient(135deg, #d83b01 0%, #b02e00 100%);
            color: white;
            padding: 1.5rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
          }
          .extraction-badge {
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            text-align: center;
            min-width: 120px;
          }
          .extraction-badge.full {
            background: rgba(40, 167, 69, 0.2);
            border: 2px solid rgba(40, 167, 69, 0.4);
          }
          .extraction-badge.partial {
            background: rgba(255, 193, 7, 0.2);
            border: 2px solid rgba(255, 193, 7, 0.4);
          }
          .extraction-badge.info {
            background: rgba(23, 162, 184, 0.2);
            border: 2px solid rgba(23, 162, 184, 0.4);
          }
          .powerpoint-icon {
            font-size: 2rem;
          }
          .file-info h3 {
            margin: 0;
            font-size: 1.3rem;
            font-weight: 600;
          }
          .file-info .details {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-top: 0.25rem;
          }
          .file-info .author {
            font-size: 0.85rem;
            opacity: 0.8;
            margin-top: 0.25rem;
            font-style: italic;
          }
          .powerpoint-stats {
            background: linear-gradient(135deg, #e9ecef 0%, #f8f9fa 100%);
            padding: 1rem;
            border-bottom: 1px solid #dee2e6;
            font-size: 0.9rem;
            display: flex;
            gap: 1.5rem;
            align-items: center;
            flex-wrap: wrap;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
          }
          .stat-item {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .stat-value {
            font-weight: 600;
            color: #d83b01;
          }
          .content-notice {
            padding: 1rem 1.5rem;
            margin: 1rem;
            border-radius: 8px;
            font-size: 0.9rem;
            line-height: 1.5;
          }
          .content-notice.success {
            background: #d1ecf1;
            color: #0c5460;
            border-left: 4px solid #17a2b8;
          }
          .content-notice.warning {
            background: #fff3cd;
            color: #856404;
            border-left: 4px solid #ffc107;
          }
          .content-notice.info {
            background: #e2e3e5;
            color: #383d41;
            border-left: 4px solid #6c757d;
          }
          .presentation-metadata {
            background: white;
            margin: 0 1rem;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            font-size: 0.9rem;
          }
          .meta-item {
            margin-bottom: 0.5rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid #f8f9fa;
          }
          .meta-item:last-child {
            border-bottom: none;
            margin-bottom: 0;
          }
          .slide-navigation {
            background: white;
            padding: 1rem;
            border-bottom: 1px solid #dee2e6;
            display: flex;
            gap: 0.5rem;
            overflow-x: auto;
            align-items: center;
          }
          .slide-navigation label {
            font-weight: 600;
            margin-right: 1rem;
            color: #666;
          }
          .slide-nav-btn {
            padding: 0.75rem 1rem;
            border: 2px solid #dee2e6;
            background: white;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            min-width: 50px;
            position: relative;
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.25rem;
          }
          .slide-indicators {
            display: flex;
            gap: 0.25rem;
            font-size: 0.7rem;
          }
          .indicator {
            opacity: 0.7;
          }
          .slide-nav-btn:hover {
            border-color: #d83b01;
            background: #fff5f0;
          }
          .slide-nav-btn.active {
            background: #d83b01;
            color: white;
            border-color: #d83b01;
          }
          .slides-container {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 1rem;
            height: 0; /* This forces flex to calculate height properly */
          }
          .slide-content {
            display: none;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
            min-height: 500px;
            max-height: calc(100vh - 300px);
            overflow-y: auto;
            overflow-x: hidden;
          }
          .slide-content.active {
            display: block;
          }
          .slide-header {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 1.5rem 2rem;
            border-radius: 12px 12px 0 0;
            border-bottom: 2px solid #dee2e6;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .slide-title-section {
            flex: 1;
          }
          .slide-layout {
            font-size: 0.8rem;
            color: #6c757d;
            margin-top: 0.5rem;
            font-style: italic;
          }
          .slide-meta {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 0.5rem;
          }
          .slide-features {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
          }
          .feature-badge {
            background: #d83b01;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: 600;
          }
          .slide-title {
            margin: 0;
            font-size: 1.5rem;
            color: #333;
            font-weight: 600;
          }
          .slide-number {
            background: #d83b01;
            color: white;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
          }
          .slide-body {
            padding: 2rem;
            line-height: 1.7;
            font-size: 1rem;
            color: #333;
            min-height: 350px;
            max-height: calc(100vh - 450px);
            overflow-y: auto;
            overflow-x: hidden;
          }
          .slide-text {
            margin-bottom: 1.5rem;
          }
          .slide-bullets {
            margin: 1.5rem 0;
          }
          .slide-bullets ul {
            padding-left: 1.5rem;
            margin: 0;
          }
          .slide-bullets li {
            margin-bottom: 0.75rem;
            line-height: 1.6;
          }
          .slide-image {
            margin: 1.5rem 0;
            text-align: center;
            background: #f8f9fa;
            border-radius: 8px;
            padding: 1rem;
            border: 2px solid #e9ecef;
          }
          .slide-image img {
            max-width: 100%;
            max-height: 300px;
            border-radius: 6px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          }
          .image-caption {
            margin-top: 0.5rem;
            font-size: 0.85rem;
            color: #6c757d;
            font-style: italic;
          }
          .slide-table {
            margin: 1.5rem 0;
          }
          .slide-table h5 {
            margin: 0 0 1rem 0;
            color: #d83b01;
            font-size: 1rem;
          }
          .powerpoint-table {
            width: 100%;
            border-collapse: collapse;
            margin: 1rem 0;
            background: white;
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .powerpoint-table th,
          .powerpoint-table td {
            padding: 0.75rem 1rem;
            text-align: left;
            border-bottom: 1px solid #dee2e6;
          }
          .powerpoint-table th {
            background: #d83b01;
            color: white;
            font-weight: 600;
          }
          .powerpoint-table tr:hover {
            background: #f8f9fa;
          }
          .slide-body p {
            margin-bottom: 1rem;
          }
          .slide-body ul {
            margin-left: 1.5rem;
            margin-bottom: 1rem;
          }
          .slide-body li {
            margin-bottom: 0.5rem;
          }
          .slide-notes {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 1.5rem 2rem;
            border-top: 2px solid #dee2e6;
            border-radius: 0 0 12px 12px;
            margin-top: auto;
          }
          .slide-notes h4 {
            margin: 0 0 1rem 0;
            color: #495057;
            font-size: 1rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .slide-notes p {
            margin: 0;
            font-size: 0.95rem;
            color: #495057;
            line-height: 1.6;
            background: white;
            padding: 1rem;
            border-radius: 6px;
            border-left: 4px solid #d83b01;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          }

          /* Custom scrollbar styling */
          .slides-container::-webkit-scrollbar,
          .slide-content::-webkit-scrollbar,
          .slide-body::-webkit-scrollbar {
            width: 8px;
          }
          .slides-container::-webkit-scrollbar-track,
          .slide-content::-webkit-scrollbar-track,
          .slide-body::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }
          .slides-container::-webkit-scrollbar-thumb,
          .slide-content::-webkit-scrollbar-thumb,
          .slide-body::-webkit-scrollbar-thumb {
            background: #d83b01;
            border-radius: 4px;
          }
          .slides-container::-webkit-scrollbar-thumb:hover,
          .slide-content::-webkit-scrollbar-thumb:hover,
          .slide-body::-webkit-scrollbar-thumb:hover {
            background: #b02e00;
          }

          /* Responsive design */
          @media (max-width: 768px) {
            .powerpoint-header {
              flex-direction: column;
              align-items: flex-start;
              gap: 1rem;
            }
            .powerpoint-stats {
              flex-direction: column;
              align-items: flex-start;
              gap: 0.75rem;
            }
            .slide-navigation {
              flex-wrap: wrap;
            }
            .slide-header {
              flex-direction: column;
              align-items: flex-start;
              gap: 1rem;
            }
            .slide-meta {
              align-items: flex-start;
            }
            .slide-features {
              justify-content: flex-start;
            }
            .slide-body {
              padding: 1rem;
            }
            .slide-notes {
              padding: 1rem;
            }
          }
        </style>

        <div class="powerpoint-header">
          <div class="powerpoint-icon">🎨</div>
          <div class="file-info">
            <h3>${this.escapeHtml(presentation.fileName)}</h3>
            <div class="details">Microsoft PowerPoint Presentation • ${fileSizeFormatted}</div>
            ${presentation.metadata.author !== 'Unknown' ? `<div class="author">by ${this.escapeHtml(presentation.metadata.author)}</div>` : ''}
          </div>
          <div class="extraction-badge ${presentation.extractionMethod}">
            ${presentation.extractionMethod === 'full' ? '✅ Full Extraction' : presentation.extractionMethod === 'partial' ? '⚠️ Partial Extraction' : 'ℹ️ Info Display'}
          </div>
        </div>

        <div class="powerpoint-stats">
          <div class="stat-item">
            <span>📊 Total Slides:</span>
            <span class="stat-value">${presentation.totalSlides}</span>
          </div>
          <div class="stat-item">
            <span>🖼️ Images:</span>
            <span class="stat-value">${stats.totalImages}</span>
          </div>
          <div class="stat-item">
            <span>📝 Text Slides:</span>
            <span class="stat-value">${stats.textSlides}</span>
          </div>
          <div class="stat-item">
            <span>📋 Tables:</span>
            <span class="stat-value">${stats.tableSlides}</span>
          </div>
          <div class="stat-item">
            <span>⚡ Animations:</span>
            <span class="stat-value">${stats.animatedSlides}</span>
          </div>
          <div class="stat-item">
            <span>📖 Notes:</span>
            <span class="stat-value">${stats.notesCount}</span>
          </div>
        </div>

        ${presentation.extractionMethod === 'full' ? `
          <div class="content-notice success">
            ✅ <strong>Full Content Extracted:</strong> Successfully extracted ${stats.totalWords} words, ${stats.totalImages} images, and ${stats.tableSlides} tables from ${presentation.totalSlides} slides. Some animations and advanced formatting may not be preserved.
          </div>
        ` : presentation.extractionMethod === 'partial' ? `
          <div class="content-notice warning">
            ⚠️ <strong>Partial Extraction:</strong> Some content was extracted but full parsing encountered limitations. Download for complete experience.
          </div>
        ` : `
          <div class="content-notice info">
            ℹ️ <strong>Preview Mode:</strong> This presentation format requires specialized parsing. Download the file for the complete experience with animations and formatting.
          </div>
        `}

        ${presentation.metadata.title || presentation.metadata.subject ? `
          <div class="presentation-metadata">
            ${presentation.metadata.title ? `<div class="meta-item"><strong>Title:</strong> ${this.escapeHtml(presentation.metadata.title)}</div>` : ''}
            ${presentation.metadata.subject ? `<div class="meta-item"><strong>Subject:</strong> ${this.escapeHtml(presentation.metadata.subject)}</div>` : ''}
            ${presentation.metadata.company ? `<div class="meta-item"><strong>Company:</strong> ${this.escapeHtml(presentation.metadata.company)}</div>` : ''}
            ${presentation.metadata.created ? `<div class="meta-item"><strong>Created:</strong> ${presentation.metadata.created}</div>` : ''}
            ${presentation.metadata.modified ? `<div class="meta-item"><strong>Modified:</strong> ${presentation.metadata.modified}</div>` : ''}
          </div>
        ` : ''}

        <div class="slide-navigation">
          <label>Navigate:</label>
          ${slideNavigation}
        </div>

        <div class="slides-container">
          ${slideContents}
        </div>

        <script>
          // PowerPoint Viewer Interactive Functions
          (function() {
            function initializePowerPointViewer() {
              // Add event listeners to navigation buttons
              const navButtons = document.querySelectorAll('[data-action="show-slide"]');

              navButtons.forEach(button => {
                button.addEventListener('click', function(e) {
                  e.preventDefault();
                  const slideIndex = this.getAttribute('data-slide');
                  showSlide(parseInt(slideIndex));
                });
              });

              // Also support keyboard navigation
              document.addEventListener('keydown', function(e) {
                if (e.target.closest('.powerpoint-preview-container')) {
                  const activeSlide = document.querySelector('.slide-content.active');
                  if (!activeSlide) return;

                  const currentIndex = parseInt(activeSlide.getAttribute('data-slide'));
                  const totalSlides = ${presentation.slides.length};

                  if (e.key === 'ArrowLeft' && currentIndex > 0) {
                    e.preventDefault();
                    showSlide(currentIndex - 1);
                  } else if (e.key === 'ArrowRight' && currentIndex < totalSlides - 1) {
                    e.preventDefault();
                    showSlide(currentIndex + 1);
                  }
                }
              });
            }

            function showSlide(slideIndex) {
              // Hide all slides
              document.querySelectorAll('.slide-content').forEach(slide => {
                slide.classList.remove('active');
              });

              // Remove active from all nav buttons
              document.querySelectorAll('.slide-nav-btn').forEach(btn => {
                btn.classList.remove('active');
              });

              // Show selected slide
              const targetSlide = document.querySelector('.slide-content[data-slide="' + slideIndex + '"]');
              const targetButton = document.querySelector('.slide-nav-btn[data-slide="' + slideIndex + '"]');

              if (targetSlide && targetButton) {
                targetSlide.classList.add('active');
                targetButton.classList.add('active');

                // Scroll to ensure button is visible
                targetButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }
            }

            // Initialize when DOM is ready
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', initializePowerPointViewer);
            } else {
              // DOM is already loaded
              setTimeout(initializePowerPointViewer, 100);
            }

            // Also try to initialize after a short delay to ensure all content is rendered
            setTimeout(initializePowerPointViewer, 500);

            // Make showSlide function globally available for debugging
            window.showSlide = showSlide;
          })();
        </script>
      </div>
    `;
  }

  private formatSlideContent(content: string): string {
    // Convert line breaks to paragraphs and format bullet points
    const lines = content.split('\n').filter(line => line.trim());

    return lines.map(line => {
      const trimmedLine = line.trim();

      // Check if line starts with bullet point indicators
      if (trimmedLine.match(/^[•·▪▫‣⁃]\s/)) {
        return `<li>${this.escapeHtml(trimmedLine.substring(2))}</li>`;
      } else if (trimmedLine.match(/^[\d]+\.\s/)) {
        return `<li>${this.escapeHtml(trimmedLine.replace(/^[\d]+\.\s/, ''))}</li>`;
      } else if (trimmedLine.match(/^[*-]\s/)) {
        return `<li>${this.escapeHtml(trimmedLine.substring(2))}</li>`;
      } else {
        return `<p>${this.escapeHtml(trimmedLine)}</p>`;
      }
    }).join('');
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private async extractSimplePresentationContent(blob: Blob, fileName: string, format: string): Promise<PowerPointPresentation> {
    console.log(`🎯 PowerPoint Plugin: Extracting simple text content from ${format} file...`);

    let extractedText = '';
    let hasTextContent = false;

    try {
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Extract readable text from binary data (similar to Word plugin approach)
      let textChunks: string[] = [];
      let currentChunk = '';
      let consecutiveNulls = 0;

      // Scan through first 100KB for text content
      for (let i = 0; i < Math.min(uint8Array.length, 100000); i++) {
        const char = uint8Array[i];

        if (char === 0) {
          consecutiveNulls++;
          if (currentChunk.trim().length > 3) {
            textChunks.push(currentChunk.trim());
            currentChunk = '';
          }
          if (consecutiveNulls < 5) currentChunk += ' ';
        } else {
          consecutiveNulls = 0;
          // Include printable ASCII characters
          if ((char >= 32 && char <= 126) || char === 10 || char === 13) {
            currentChunk += String.fromCharCode(char);
          } else if (char >= 160 && char <= 255) {
            // Extended ASCII
            currentChunk += String.fromCharCode(char);
          }
        }
      }

      // Add final chunk
      if (currentChunk.trim().length > 3) {
        textChunks.push(currentChunk.trim());
      }

      // Filter and clean text chunks
      const meaningfulChunks = textChunks
        .filter(chunk => {
          const cleaned = chunk.replace(/[^a-zA-Z0-9\s.,!?-]/g, '').trim();
          return cleaned.length > 5 && /[a-zA-Z]/.test(cleaned);
        })
        .map(chunk => {
          return chunk.replace(/\s+/g, ' ')
                    .replace(/[^a-zA-Z0-9\s.,!?:;()\[\]\-"']/g, '')
                    .trim();
        })
        .filter(chunk => chunk.length > 0);

      extractedText = meaningfulChunks.join('\n\n');
      hasTextContent = extractedText.length > 20;

      console.log(`📄 PowerPoint Plugin: Extracted ${meaningfulChunks.length} text chunks, total length: ${extractedText.length}`);
    } catch (error) {
      console.warn('⚠️ PowerPoint Plugin: Text extraction failed:', error);
    }

    // Create slides from extracted content or provide informative slides
    const slides: PowerPointSlideData[] = [];

    if (hasTextContent && extractedText.length > 0) {
      // Split content into logical slides
      const contentLines = extractedText.split(/\n+/).filter(line => line.trim().length > 0);
      const slidesContent: string[][] = [];
      let currentSlide: string[] = [];

      for (const line of contentLines) {
        if (line.length < 50 && currentSlide.length > 0) {
          // Likely a new slide title
          if (currentSlide.length > 0) {
            slidesContent.push([...currentSlide]);
            currentSlide = [];
          }
        }
        currentSlide.push(line);
      }

      // Add final slide
      if (currentSlide.length > 0) {
        slidesContent.push(currentSlide);
      }

      // Create slide objects
      slidesContent.forEach((slideLines, index) => {
        const title = slideLines[0] || `Slide ${index + 1}`;
        const content = slideLines.slice(1).join('\n\n');
        const bullets = slideLines.slice(1).filter(line => line.length < 100);

        slides.push({
          slideNumber: index + 1,
          title: title.length > 100 ? title.substring(0, 97) + '...' : title,
          content: content || 'Content extracted from presentation',
          notes: '',
          layout: 'Content',
          images: [],
          bullets: bullets.slice(0, 5), // Limit bullets
          tables: [],
          hasAnimations: false,
          slideId: `slide-${index + 1}`
        });
      });

      // Limit number of slides
      if (slides.length > 20) {
        slides.splice(20);
      }
    }

    // If no content extracted, create informative slides
    if (slides.length === 0) {
      slides.push({
        slideNumber: 1,
        title: `${format} Presentation`,
        content: `This PowerPoint presentation contains content that requires specialized viewing software to display properly.\n\nFile: ${fileName}\nSize: ${this.formatFileSize(blob.size)}\nFormat: ${format}`,
        notes: '',
        layout: 'Title and Content',
        images: [],
        bullets: [
          `File: ${fileName}`,
          `Size: ${this.formatFileSize(blob.size)}`,
          `Format: Microsoft PowerPoint ${format}`,
          'Contains slides with complex formatting',
          'May include animations, transitions, or embedded media',
          'Download for complete viewing experience'
        ],
        tables: [],
        hasAnimations: false,
        slideId: 'info-1'
      });

      slides.push({
        slideNumber: 2,
        title: 'Viewing Instructions',
        content: 'To view this presentation with full functionality:',
        notes: '',
        layout: 'Content',
        images: [],
        bullets: [
          '🔽 Download the presentation file',
          '📱 Open with Microsoft PowerPoint',
          '🌐 Use PowerPoint Online or Office 365',
          '📺 View slides, animations, and transitions',
          '📝 Access speaker notes and comments',
          '✏️ Edit and modify the presentation'
        ],
        tables: [],
        hasAnimations: false,
        slideId: 'info-2'
      });
    }

    const metadata: PowerPointMetadata = {
      author: 'Unknown',
      title: fileName,
      subject: '',
      created: '',
      modified: '',
      company: '',
      version: format,
      slideCount: slides.length,
      hasNotes: false,
      hasImages: false,
      hasTables: false,
      hasAnimations: false,
      fileSize: blob.size
    };

    const statistics = {
      textSlides: slides.filter(slide => slide.content.length > 0 || slide.bullets.length > 0).length,
      imageSlides: 0,
      tableSlides: 0,
      animatedSlides: 0,
      notesCount: 0,
      totalWords: slides.reduce((total, slide) => {
        return total + slide.content.split(/\s+/).length + slide.bullets.join(' ').split(/\s+/).length;
      }, 0),
      totalImages: 0
    };

    return {
      slides,
      metadata,
      images: [],
      fileName,
      extractionSuccess: hasTextContent,
      extractionMethod: hasTextContent ? 'partial' : 'info',
      totalSlides: slides.length,
      statistics
    };
  }

  private async generateBasicPresentationPreview(blob: Blob, fileName: string, error: any): Promise<PreviewResult> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const extension = fileName.toLowerCase().split('.').pop() || 'presentation';
    const fileIcon = extension === 'pptx' ? '🎨' : '📊';

    const content = `
      <div style="padding: 2rem; font-family: system-ui, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 2rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">${fileIcon}</div>
          <h1 style="color: #1e293b; margin: 0 0 0.5rem 0;">${this.escapeHtml(fileName)}</h1>
          <p style="color: #64748b; margin: 0;">Microsoft PowerPoint Presentation</p>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
          <h3 style="color: #374151; margin: 0 0 1rem 0;">🎨 Presentation Information</h3>
          <p style="color: #4b5563; margin: 0;">This PowerPoint presentation is available for download. The slides cannot be displayed in the browser preview due to the presentation's format or complexity.</p>
        </div>

        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
          <h4 style="color: #1e40af; margin: 0 0 1rem 0;">💡 To view this presentation:</h4>
          <ul style="color: #1e40af; margin: 0; padding-left: 1.5rem;">
            <li>Download the file using the download button</li>
            <li>Open with Microsoft PowerPoint or compatible software</li>
            <li>Use PowerPoint Online or Office 365 for browser viewing</li>
            <li>View slides with animations, transitions, and multimedia</li>
            <li>Access speaker notes and presenter tools</li>
          </ul>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; text-align: center;">
          <div style="color: #64748b; font-size: 0.875rem;">File Size: ${this.formatFileSize(blob.size)}</div>
        </div>

        <div style="text-align: center;">
          <button onclick="window.parent.postMessage({type: 'download'}, '*')"
                  style="background: #d83b01; color: white; border: none; border-radius: 6px; padding: 0.75rem 1.5rem; font-size: 0.875rem; font-weight: 500; cursor: pointer; margin-right: 0.5rem;">
            🎨 Download Presentation
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

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}