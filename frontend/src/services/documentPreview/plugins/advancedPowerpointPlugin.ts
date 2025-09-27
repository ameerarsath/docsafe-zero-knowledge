/**
 * Advanced PowerPoint Preview Plugin
 * Extracts and renders actual slide content from PPTX files
 * Features: Slide navigation, text extraction, image display, animations preview
 */

import { PreviewPlugin, PreviewResult, PreviewOptions } from '../pluginSystem';
import * as JSZip from 'jszip';

interface SlideContent {
  slideNumber: number;
  title: string;
  textContent: string[];
  images: ImageContent[];
  layout: string;
  animations: string[];
  notes: string;
}

interface ImageContent {
  id: string;
  name: string;
  extension: string;
  data: string; // base64
  width?: number;
  height?: number;
  position?: {
    x: number;
    y: number;
  };
}

interface PresentationData {
  title: string;
  author: string;
  slides: SlideContent[];
  theme: string;
  totalSlides: number;
  createdDate?: string;
  modifiedDate?: string;
}

export class AdvancedPowerPointPreviewPlugin implements PreviewPlugin {
  name = 'AdvancedPowerPointPreview';
  priority = 95; // Highest priority for advanced PowerPoint plugin

  supportedMimeTypes = [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];

  supportedExtensions = ['.ppt', '.pptx'];

  canPreview(mimeType: string, fileName: string): boolean {
    const extension = fileName.toLowerCase().split('.').pop();
    // Only handle PPTX files (modern format), fallback to basic plugin for PPT
    return mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
           (extension === 'pptx');
  }

  async preview(
    blob: Blob,
    fileName: string,
    mimeType: string,
    options?: PreviewOptions
  ): Promise<PreviewResult> {
    try {
      console.log('🔄 Advanced PowerPoint preview starting for:', fileName);

      const presentationData = await this.extractPresentationData(blob);
      const previewHtml = this.generateAdvancedViewer(presentationData, fileName, blob.size);

      console.log('✅ Advanced PowerPoint preview generated:', {
        slides: presentationData.totalSlides,
        title: presentationData.title
      });

      return {
        type: 'success',
        format: 'html',
        content: previewHtml,
        metadata: {
          title: presentationData.title || fileName,
          author: presentationData.author,
          created: presentationData.createdDate,
          modified: presentationData.modifiedDate
        }
      };
    } catch (error) {
      console.error('❌ Advanced PowerPoint preview failed:', error);

      // Fallback to basic PowerPoint preview
      return {
        type: 'error',
        format: 'html',
        error: 'Failed to extract slide content. Using basic preview.',
        content: this.generateFallbackViewer(fileName, blob.size)
      };
    }
  }

  private async extractPresentationData(blob: Blob): Promise<PresentationData> {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(blob);

    console.log('📦 PPTX ZIP contents:', Object.keys(zipContent.files));

    // Extract core properties
    const coreProps = await this.extractCoreProperties(zipContent);

    // Extract app properties
    const appProps = await this.extractAppProperties(zipContent);

    // Extract presentation metadata
    const presentation = await this.extractPresentationXml(zipContent);

    // Extract slide content
    const slides = await this.extractSlides(zipContent);

    // Extract theme information
    const theme = await this.extractTheme(zipContent);

    return {
      title: coreProps.title || appProps.title || 'Untitled Presentation',
      author: coreProps.creator || 'Unknown',
      slides: slides,
      theme: theme,
      totalSlides: slides.length,
      createdDate: coreProps.created,
      modifiedDate: coreProps.modified
    };
  }

  private async extractCoreProperties(zip: JSZip): Promise<any> {
    try {
      const corePropsFile = zip.files['docProps/core.xml'];
      if (!corePropsFile) return {};

      const content = await corePropsFile.async('text');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'text/xml');

      return {
        title: this.getXMLValue(xmlDoc, 'dc:title'),
        creator: this.getXMLValue(xmlDoc, 'dc:creator'),
        created: this.getXMLValue(xmlDoc, 'dcterms:created'),
        modified: this.getXMLValue(xmlDoc, 'dcterms:modified'),
        subject: this.getXMLValue(xmlDoc, 'dc:subject')
      };
    } catch (error) {
      console.warn('Failed to extract core properties:', error);
      return {};
    }
  }

  private async extractAppProperties(zip: JSZip): Promise<any> {
    try {
      const appPropsFile = zip.files['docProps/app.xml'];
      if (!appPropsFile) return {};

      const content = await appPropsFile.async('text');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'text/xml');

      return {
        title: this.getXMLValue(xmlDoc, 'TitlesOfParts'),
        application: this.getXMLValue(xmlDoc, 'Application'),
        version: this.getXMLValue(xmlDoc, 'AppVersion')
      };
    } catch (error) {
      console.warn('Failed to extract app properties:', error);
      return {};
    }
  }

  private async extractPresentationXml(zip: JSZip): Promise<any> {
    try {
      const presentationFile = zip.files['ppt/presentation.xml'];
      if (!presentationFile) return {};

      const content = await presentationFile.async('text');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, 'text/xml');

      // Extract slide references
      const slideIds = Array.from(xmlDoc.querySelectorAll('p\\:sldId, sldId')).map(el =>
        el.getAttribute('r:id') || el.getAttribute('id')
      );

      return {
        slideIds: slideIds
      };
    } catch (error) {
      console.warn('Failed to extract presentation XML:', error);
      return {};
    }
  }

  private async extractSlides(zip: JSZip): Promise<SlideContent[]> {
    const slides: SlideContent[] = [];

    // Find all slide files
    const slideFiles = Object.keys(zip.files).filter(filename =>
      filename.match(/^ppt\/slides\/slide\d+\.xml$/)
    );

    console.log('📊 Found slide files:', slideFiles);

    // Extract all images first
    const images = await this.extractAllImages(zip);
    console.log('🖼️ Extracted images:', images.length);

    // Extract slide relationships
    const relationships = await this.extractSlideRelationships(zip);

    for (let i = 0; i < slideFiles.length; i++) {
      try {
        const slideFile = zip.files[slideFiles[i]];
        const slideContent = await slideFile.async('text');
        const slideNumber = i + 1;

        // Get relationships for this specific slide
        const slideRelPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
        const slideRelationships = relationships[slideRelPath] || {};

        const slideData = await this.parseSlideXML(slideContent, slideNumber, images, slideRelationships);
        slides.push(slideData);
      } catch (error) {
        console.error(`Failed to parse slide ${i + 1}:`, error);
        // Add placeholder slide
        slides.push({
          slideNumber: i + 1,
          title: `Slide ${i + 1}`,
          textContent: ['Unable to extract slide content'],
          images: [],
          layout: 'unknown',
          animations: [],
          notes: ''
        });
      }
    }

    return slides.sort((a, b) => a.slideNumber - b.slideNumber);
  }

  private async extractAllImages(zip: JSZip): Promise<{[key: string]: ImageContent}> {
    const images: {[key: string]: ImageContent} = {};

    // Find all media files
    const mediaFiles = Object.keys(zip.files).filter(filename =>
      filename.match(/^ppt\/media\//) &&
      (filename.endsWith('.png') || filename.endsWith('.jpg') || filename.endsWith('.jpeg') || filename.endsWith('.gif') || filename.endsWith('.bmp'))
    );

    console.log('🖼️ Found media files:', mediaFiles);

    for (const mediaPath of mediaFiles) {
      try {
        const mediaFile = zip.files[mediaPath];
        const arrayBuffer = await mediaFile.async('arraybuffer');
        const base64 = this.arrayBufferToBase64(arrayBuffer);

        const extension = mediaPath.split('.').pop()?.toLowerCase() || 'png';
        const mimeType = this.getMimeTypeFromExtension(extension);
        const fileName = mediaPath.split('/').pop() || 'image';

        images[mediaPath] = {
          id: mediaPath,
          name: fileName,
          extension: extension,
          data: `data:${mimeType};base64,${base64}`,
          width: undefined,
          height: undefined
        };

        console.log('✅ Extracted image:', fileName);
      } catch (error) {
        console.error('Failed to extract image:', mediaPath, error);
      }
    }

    return images;
  }

  private async extractSlideRelationships(zip: JSZip): Promise<{[key: string]: {[key: string]: string}}> {
    const relationships: {[key: string]: {[key: string]: string}} = {};

    // Find all relationship files for slides
    const relFiles = Object.keys(zip.files).filter(filename =>
      filename.match(/^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/)
    );

    for (const relPath of relFiles) {
      try {
        const relFile = zip.files[relPath];
        const content = await relFile.async('text');
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, 'text/xml');

        const rels: {[key: string]: string} = {};
        const relationshipElements = xmlDoc.querySelectorAll('Relationship');

        relationshipElements.forEach(rel => {
          const id = rel.getAttribute('Id');
          const target = rel.getAttribute('Target');
          if (id && target) {
            rels[id] = target;
          }
        });

        relationships[relPath] = rels;
      } catch (error) {
        console.error('Failed to parse relationships:', relPath, error);
      }
    }

    return relationships;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: {[key: string]: string} = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'bmp': 'image/bmp'
    };
    return mimeTypes[extension] || 'image/png';
  }

  private async parseSlideXML(
    slideXml: string,
    slideNumber: number,
    availableImages: {[key: string]: ImageContent},
    relationships: {[key: string]: string}
  ): Promise<SlideContent> {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(slideXml, 'text/xml');

    // Extract text content
    const textElements = Array.from(xmlDoc.querySelectorAll('a\\:t, t'));
    const textContent = textElements.map(el => el.textContent?.trim() || '').filter(text => text.length > 0);

    // Extract title (first text element is usually the title)
    const title = textContent[0] || `Slide ${slideNumber}`;

    // Extract layout information
    const layout = this.extractLayoutInfo(xmlDoc);

    // Extract images with positioning
    const images = await this.extractSlideImages(xmlDoc, availableImages, relationships);

    // Extract animation information
    const animations = this.extractAnimations(xmlDoc);

    return {
      slideNumber,
      title,
      textContent,
      images,
      layout,
      animations,
      notes: ''
    };
  }

  private async extractSlideImages(
    xmlDoc: Document,
    availableImages: {[key: string]: ImageContent},
    relationships: {[key: string]: string}
  ): Promise<ImageContent[]> {
    const slideImages: ImageContent[] = [];

    try {
      // Look for image references in the slide
      const imageBlips = xmlDoc.querySelectorAll('a\\:blip, blip');

      imageBlips.forEach((blip, index) => {
        const embedId = blip.getAttribute('r:embed') || blip.getAttribute('embed');
        if (embedId && relationships[embedId]) {
          const imagePath = relationships[embedId];
          const fullImagePath = `ppt/${imagePath.replace('../', '')}`;

          console.log('🔍 Looking for image:', fullImagePath);

          // Find the image in our extracted images
          const imageData = availableImages[fullImagePath];
          if (imageData) {
            console.log('✅ Found image data for:', fullImagePath);

            // Try to extract positioning information
            const position = this.extractImagePosition(blip);

            slideImages.push({
              ...imageData,
              position: position
            });
          } else {
            console.log('❌ Image data not found for:', fullImagePath);
            console.log('Available images:', Object.keys(availableImages));
          }
        }
      });

      console.log(`📸 Extracted ${slideImages.length} images for slide`);
    } catch (error) {
      console.error('Failed to extract slide images:', error);
    }

    return slideImages;
  }

  private extractImagePosition(blipElement: Element): { x: number; y: number } | undefined {
    try {
      // Walk up the DOM to find positioning elements
      let current = blipElement.parentElement;
      while (current) {
        // Look for transform or positioning attributes
        const transform = current.getAttribute('transform');
        if (transform) {
          // Parse transform to extract x, y coordinates
          const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
          if (match) {
            return {
              x: parseFloat(match[1]) || 0,
              y: parseFloat(match[2]) || 0
            };
          }
        }

        // Look for direct x, y attributes
        const x = current.getAttribute('x');
        const y = current.getAttribute('y');
        if (x && y) {
          return {
            x: parseFloat(x) || 0,
            y: parseFloat(y) || 0
          };
        }

        current = current.parentElement;
      }
    } catch (error) {
      console.warn('Failed to extract image position:', error);
    }

    return undefined;
  }

  private extractLayoutInfo(xmlDoc: Document): string {
    // Try to determine slide layout based on structure
    const shapes = xmlDoc.querySelectorAll('p\\:sp, sp');

    if (shapes.length === 0) return 'blank';
    if (shapes.length === 1) return 'title-only';
    if (shapes.length === 2) return 'title-content';

    return 'content';
  }

  private extractAnimations(xmlDoc: Document): string[] {
    const animations: string[] = [];

    // Look for animation timing information
    const animationNodes = xmlDoc.querySelectorAll('p\\:timing, timing');
    animationNodes.forEach(node => {
      animations.push('Animation detected');
    });

    return animations;
  }

  private async extractTheme(zip: JSZip): Promise<string> {
    try {
      // Look for theme files
      const themeFiles = Object.keys(zip.files).filter(filename =>
        filename.match(/^ppt\/theme\/theme\d+\.xml$/)
      );

      if (themeFiles.length === 0) return 'default';

      const themeFile = zip.files[themeFiles[0]];
      const themeContent = await themeFile.async('text');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(themeContent, 'text/xml');

      // Extract theme name
      const themeName = this.getXMLValue(xmlDoc, 'name') || 'Custom Theme';
      return themeName;
    } catch (error) {
      console.warn('Failed to extract theme:', error);
      return 'default';
    }
  }

  private getXMLValue(xmlDoc: Document, tagName: string): string | null {
    const elements = xmlDoc.querySelectorAll(tagName);
    return elements.length > 0 ? elements[0].textContent : null;
  }

  private generateAdvancedViewer(presentation: PresentationData, fileName: string, fileSize: number): string {
    const fileSizeFormatted = this.formatFileSize(fileSize);

    // Generate slide thumbnails
    const slideThumbnails = presentation.slides.map((slide, index) => `
      <div class="slide-thumbnail ${index === 0 ? 'active' : ''}"
           data-slide="${index}"
           data-action="goto-slide"
           title="${this.escapeHtml(slide.title)}">
        <div class="thumbnail-number">${slide.slideNumber}</div>
        <div class="thumbnail-content">
          <div class="thumbnail-title">${this.escapeHtml(slide.title)}</div>
          <div class="thumbnail-preview">${slide.textContent.length > 1 ? slide.textContent.slice(1, 3).join(' ').substring(0, 50) + '...' : ''}</div>
        </div>
      </div>
    `).join('');

    // Generate slide content
    const slideContents = presentation.slides.map((slide, index) => `
      <div class="slide-content ${index === 0 ? 'active' : ''}" data-slide="${index}">
        <div class="slide-wrapper">
          <div class="slide-header">
            <h2 class="slide-title">${this.escapeHtml(slide.title)}</h2>
            <div class="slide-meta">Slide ${slide.slideNumber} of ${presentation.totalSlides}</div>
          </div>

          <div class="slide-body">
            <div class="slide-canvas">
              ${this.renderSlideContent(slide)}
            </div>
          </div>

          ${slide.animations.length > 0 ? `
            <div class="slide-animations">
              <div class="animations-indicator">
                ✨ ${slide.animations.length} animation(s) detected
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');

    return `
      <div class="advanced-powerpoint-viewer">
        <style>
          .advanced-powerpoint-viewer {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: #f5f5f5;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            min-height: 500px;
          }

          .ppt-header {
            background: linear-gradient(135deg, #d73527 0%, #b02e1c 100%);
            color: white;
            padding: 1rem;
            display: flex;
            align-items: center;
            gap: 1rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          }

          .ppt-icon {
            font-size: 2rem;
          }

          .ppt-info h3 {
            margin: 0;
            font-size: 1.3rem;
            font-weight: 600;
          }

          .ppt-details {
            font-size: 0.9rem;
            opacity: 0.9;
            margin-top: 0.25rem;
          }

          .ppt-main {
            flex: 1;
            display: flex;
            min-height: 0;
          }

          .slides-sidebar {
            width: 320px;
            background: #f8f9fa;
            border-right: 2px solid #dee2e6;
            display: flex;
            flex-direction: column;
          }

          .sidebar-header {
            padding: 1rem;
            background: #e9ecef;
            border-bottom: 1px solid #dee2e6;
            font-weight: 600;
            font-size: 0.9rem;
            color: #333;
            text-align: left;
          }

          .slides-list {
            flex: 1;
            overflow-y: auto;
            padding: 0.5rem;
          }

          .slide-thumbnail {
            display: flex;
            align-items: flex-start;
            padding: 0.75rem;
            margin: 0.25rem 0.5rem 0.5rem 0.5rem;
            background: white;
            border: 2px solid #dee2e6;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }

          .slide-thumbnail:hover {
            border-color: #d73527;
            background: #fff8f7;
            box-shadow: 0 2px 8px rgba(215, 53, 39, 0.1);
          }

          .slide-thumbnail.active {
            border-color: #d73527;
            background: #fff0ef;
            box-shadow: 0 3px 12px rgba(215, 53, 39, 0.2);
          }

          .thumbnail-number {
            width: 30px;
            height: 30px;
            background: #d73527;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            font-weight: 600;
            flex-shrink: 0;
            margin-right: 0.75rem;
          }

          .thumbnail-content {
            flex: 1;
            min-width: 0;
          }

          .thumbnail-title {
            font-weight: 600;
            font-size: 0.85rem;
            color: #333;
            margin-bottom: 0.25rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .thumbnail-preview {
            font-size: 0.75rem;
            color: #666;
            line-height: 1.3;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .slide-viewer {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: white;
            min-width: 0;
          }

          .viewer-controls {
            padding: 1rem;
            background: #fafafa;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 1rem;
          }

          .slide-counter {
            font-size: 0.9rem;
            color: #666;
            font-weight: 500;
          }

          .viewer-buttons {
            display: flex;
            gap: 0.5rem;
          }

          .control-btn {
            padding: 0.5rem 1rem;
            background: #d73527;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: background 0.2s ease;
          }

          .control-btn:hover:not(:disabled) {
            background: #b02e1c;
          }

          .control-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
          }

          .slide-display {
            flex: 1;
            overflow-y: auto;
            position: relative;
          }

          .slide-content {
            display: none;
            padding: 2rem;
            max-width: 900px;
            margin: 0 auto;
          }

          .slide-content.active {
            display: block;
          }

          .slide-wrapper {
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            overflow: hidden;
            min-height: 400px;
          }

          .slide-header {
            background: linear-gradient(135deg, #d73527 0%, #b02e1c 100%);
            color: white;
            padding: 1.5rem 2rem;
            text-align: center;
          }

          .slide-title {
            margin: 0;
            font-size: 1.8rem;
            font-weight: 600;
            line-height: 1.2;
          }

          .slide-meta {
            margin-top: 0.5rem;
            font-size: 0.9rem;
            opacity: 0.9;
          }

          .slide-body {
            padding: 2rem;
            min-height: 300px;
          }

          .slide-text-content {
            space-y: 1rem;
          }

          .text-block {
            margin-bottom: 1rem;
            font-size: 1.1rem;
            line-height: 1.6;
            color: #333;
            padding: 1rem;
            background: #f8f9fa;
            border-left: 4px solid #d73527;
            border-radius: 0 6px 6px 0;
          }

          .slide-images {
            margin-top: 1.5rem;
            display: flex;
            flex-wrap: wrap;
            gap: 1rem;
            justify-content: center;
          }

          .slide-image {
            max-width: 100%;
            max-height: 300px;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }

          .slide-animations {
            padding: 1rem 2rem;
            background: #fff3cd;
            border-top: 1px solid #ffeaa7;
          }

          .animations-indicator {
            font-size: 0.9rem;
            color: #856404;
            text-align: center;
          }

          .navigation-help {
            position: absolute;
            bottom: 1rem;
            right: 1rem;
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.8rem;
            opacity: 0.8;
          }

          /* Ensure buttons are properly styled and clickable */
          .control-btn {
            position: relative;
            z-index: 100;
            pointer-events: all;
          }

          .slide-thumbnail {
            position: relative;
            z-index: 100;
            pointer-events: all;
          }

          /* Fix layout to match expected output */
          .ppt-main {
            min-height: 600px;
          }

          .slides-sidebar {
            background: #f8f9fa;
            border-right: 2px solid #dee2e6;
          }

          .slide-display {
            padding: 0;
            background: #fff;
          }

          .slide-content {
            height: 100%;
            padding: 0;
          }

          .slide-wrapper {
            height: 100%;
            display: flex;
            flex-direction: column;
          }

          .slide-body {
            flex: 1;
            background: #fff;
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: 2rem;
            overflow: hidden;
          }

          .slide-canvas {
            position: relative;
            width: 100%;
            height: 100%;
            min-height: 400px;
            background: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }

          .slide-content-area {
            position: relative;
            width: 100%;
            height: 100%;
            padding: 2rem;
          }

          .slide-text-block {
            margin-bottom: 1.5rem;
            position: relative;
          }

          .slide-text-title {
            font-size: 2rem;
            font-weight: bold;
            color: #333;
            margin-bottom: 1rem;
            text-align: center;
          }

          .slide-text-content {
            font-size: 1.2rem;
            line-height: 1.6;
            color: #555;
          }

          .slide-bullet-point {
            margin: 0.8rem 0;
            padding-left: 1.5rem;
            position: relative;
          }

          .slide-bullet-point::before {
            content: "•";
            color: #d73527;
            font-weight: bold;
            position: absolute;
            left: 0;
            font-size: 1.4rem;
          }

          .slide-image-container {
            position: relative;
            margin: 1rem 0;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .slide-image {
            max-width: 100%;
            max-height: 300px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            object-fit: contain;
          }

          .slide-positioned-image {
            position: absolute;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }

          @media (max-width: 768px) {
            .ppt-main {
              flex-direction: column;
            }

            .slides-sidebar {
              width: 100%;
              height: 120px;
            }

            .slides-list {
              display: flex;
              flex-direction: row;
              overflow-x: auto;
              overflow-y: hidden;
            }

            .slide-thumbnail {
              flex-shrink: 0;
              width: 200px;
              margin-right: 0.5rem;
              margin-bottom: 0;
            }
          }
        </style>

        <div class="ppt-header">
          <div class="ppt-icon">📋</div>
          <div class="ppt-info">
            <h3>${this.escapeHtml(presentation.title)}</h3>
            <div class="ppt-details">
              ${presentation.author} • ${presentation.totalSlides} slides • ${fileSizeFormatted}
              ${presentation.theme !== 'default' ? ` • ${presentation.theme}` : ''}
            </div>
          </div>
        </div>

        <div class="ppt-main">
          <div class="slides-sidebar">
            <div class="sidebar-header">
              📑 Slides Overview
            </div>
            <div class="slides-list">
              ${slideThumbnails}
            </div>
          </div>

          <div class="slide-viewer">
            <div class="viewer-controls">
              <div class="slide-counter">
                Slide <span id="currentSlide">1</span> of ${presentation.totalSlides}
              </div>
              <div class="viewer-buttons">
                <button class="control-btn" id="prevButton" data-action="previous">← Previous</button>
                <button class="control-btn" id="nextButton" data-action="next">Next →</button>
                <button class="control-btn" id="fullscreenButton" data-action="fullscreen">🔍 Fullscreen</button>
              </div>
            </div>

            <div class="slide-display">
              ${slideContents}
              <div class="navigation-help">
                Use ← → arrow keys or click thumbnails to navigate
              </div>
            </div>
          </div>
        </div>

        <script>
          (function() {
            let currentSlideIndex = 0;
            const totalSlides = ${presentation.totalSlides};

            function showSlide(index) {
              console.log('Showing slide:', index);

              // Hide all slides
              document.querySelectorAll('.advanced-powerpoint-viewer .slide-content').forEach(slide => {
                slide.classList.remove('active');
              });

              // Hide all thumbnails
              document.querySelectorAll('.advanced-powerpoint-viewer .slide-thumbnail').forEach(thumb => {
                thumb.classList.remove('active');
              });

              // Show current slide
              const currentSlide = document.querySelector(\`.advanced-powerpoint-viewer [data-slide="\${index}"].slide-content\`);
              const currentThumb = document.querySelector(\`.advanced-powerpoint-viewer [data-slide="\${index}"].slide-thumbnail\`);

              if (currentSlide) {
                currentSlide.classList.add('active');
                console.log('Activated slide:', index);
              }
              if (currentThumb) {
                currentThumb.classList.add('active');
                currentThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                console.log('Activated thumbnail:', index);
              }

              currentSlideIndex = index;
              const slideCounter = document.querySelector('.advanced-powerpoint-viewer #currentSlide');
              if (slideCounter) {
                slideCounter.textContent = index + 1;
              }

              updateNavigationButtons();
            }

            function nextSlide() {
              console.log('Next slide clicked, current:', currentSlideIndex);
              if (currentSlideIndex < totalSlides - 1) {
                showSlide(currentSlideIndex + 1);
              }
            }

            function previousSlide() {
              console.log('Previous slide clicked, current:', currentSlideIndex);
              if (currentSlideIndex > 0) {
                showSlide(currentSlideIndex - 1);
              }
            }

            function toggleFullscreen() {
              console.log('Fullscreen toggle clicked');
              const viewer = document.querySelector('.advanced-powerpoint-viewer');
              if (viewer) {
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch(console.error);
                } else {
                  viewer.requestFullscreen().catch(console.error);
                }
              }
            }

            function updateNavigationButtons() {
              const prevBtn = document.querySelector('.advanced-powerpoint-viewer #prevButton');
              const nextBtn = document.querySelector('.advanced-powerpoint-viewer #nextButton');

              if (prevBtn) prevBtn.disabled = currentSlideIndex === 0;
              if (nextBtn) nextBtn.disabled = currentSlideIndex === totalSlides - 1;
            }

            function setupEventListeners() {
              const viewer = document.querySelector('.advanced-powerpoint-viewer');
              if (!viewer) {
                console.error('PowerPoint viewer not found!');
                return;
              }

              console.log('Setting up PowerPoint event listeners');

              // Button event listeners
              const prevBtn = viewer.querySelector('#prevButton');
              const nextBtn = viewer.querySelector('#nextButton');
              const fullscreenBtn = viewer.querySelector('#fullscreenButton');

              if (prevBtn) {
                prevBtn.addEventListener('click', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Previous button clicked via event listener');
                  previousSlide();
                });
              }

              if (nextBtn) {
                nextBtn.addEventListener('click', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Next button clicked via event listener');
                  nextSlide();
                });
              }

              if (fullscreenBtn) {
                fullscreenBtn.addEventListener('click', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Fullscreen button clicked via event listener');
                  toggleFullscreen();
                });
              }

              // Thumbnail event listeners
              const thumbnails = viewer.querySelectorAll('.slide-thumbnail');
              thumbnails.forEach((thumb, index) => {
                thumb.addEventListener('click', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  const slideIndex = parseInt(thumb.getAttribute('data-slide') || '0');
                  console.log('Thumbnail clicked via event listener:', slideIndex);
                  showSlide(slideIndex);
                });
              });

              // Keyboard navigation
              function handleKeydown(e) {
                if (!viewer.contains(e.target) && e.target !== viewer) return;

                switch(e.key) {
                  case 'ArrowLeft':
                    e.preventDefault();
                    e.stopPropagation();
                    previousSlide();
                    break;
                  case 'ArrowRight':
                    e.preventDefault();
                    e.stopPropagation();
                    nextSlide();
                    break;
                  case 'Escape':
                    if (document.fullscreenElement) {
                      document.exitFullscreen().catch(console.error);
                    }
                    break;
                }
              }

              document.addEventListener('keydown', handleKeydown);

              // Initialize navigation buttons
              updateNavigationButtons();

              console.log('PowerPoint event listeners setup complete');
            }

            // Initialize when DOM is ready
            function initializePowerPointViewer() {
              if (document.querySelector('.advanced-powerpoint-viewer')) {
                setupEventListeners();
              } else {
                // Retry after a short delay if viewer not found
                setTimeout(initializePowerPointViewer, 100);
              }
            }

            // Start initialization
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', initializePowerPointViewer);
            } else {
              initializePowerPointViewer();
            }

            console.log('PowerPoint viewer script loaded');
          })();
        </script>
      </div>
    `;
  }

  private generateFallbackViewer(fileName: string, fileSize: number): string {
    const fileSizeFormatted = this.formatFileSize(fileSize);

    return `
      <div class="powerpoint-fallback" style="
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #d73527 0%, #b02e1c 100%);
        color: white;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        min-height: 400px;
      ">
        <div style="
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 2rem;
          text-align: center;
          max-width: 500px;
        ">
          <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
          <h3 style="margin: 0 0 1rem 0; font-size: 1.5rem;">Preview Generation Failed</h3>
          <p style="margin-bottom: 1rem;">Unable to extract slide content from this PowerPoint file.</p>
          <div style="background: rgba(255, 255, 255, 0.2); border-radius: 8px; padding: 1rem; margin: 1rem 0;">
            <div style="font-weight: 600; margin-bottom: 0.5rem;">📄 ${fileName}</div>
            <div style="font-size: 0.9rem;">💾 Size: ${fileSizeFormatted}</div>
          </div>
          <p style="font-size: 0.9rem; opacity: 0.9;">Download the file to view in PowerPoint or a compatible application.</p>
        </div>
      </div>
    `;
  }

  private renderSlideContent(slide: SlideContent): string {
    let contentHtml = '<div class="slide-content-area">';

    // Render title (skip the first item which is the slide title)
    const contentText = slide.textContent.slice(1);

    // Render text content
    if (contentText.length > 0) {
      contentHtml += '<div class="slide-text-content">';

      contentText.forEach((text, index) => {
        if (text.trim()) {
          // Check if it looks like a bullet point
          const isBulletPoint = text.trim().startsWith('-') ||
                               text.trim().startsWith('•') ||
                               text.trim().startsWith('*') ||
                               index > 0; // Assume subsequent items are bullet points

          if (isBulletPoint) {
            const cleanText = text.replace(/^[-•*]\s*/, '');
            contentHtml += `<div class="slide-bullet-point">${this.escapeHtml(cleanText)}</div>`;
          } else {
            contentHtml += `<div class="slide-text-block">${this.escapeHtml(text)}</div>`;
          }
        }
      });

      contentHtml += '</div>';
    }

    // Render images
    if (slide.images.length > 0) {
      slide.images.forEach(img => {
        if (img.position) {
          // Positioned image
          contentHtml += `
            <img src="${img.data}"
                 alt="${img.name}"
                 class="slide-positioned-image"
                 style="left: ${img.position.x}px; top: ${img.position.y}px; max-width: 200px; max-height: 150px;" />
          `;
        } else {
          // Regular image
          contentHtml += `
            <div class="slide-image-container">
              <img src="${img.data}" alt="${img.name}" class="slide-image" />
            </div>
          `;
        }
      });
    }

    // If no content, show a placeholder
    if (contentText.length === 0 && slide.images.length === 0) {
      contentHtml += `
        <div style="text-align: center; color: #888; margin-top: 2rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">📋</div>
          <p>Slide content preview</p>
          <p style="font-size: 0.9rem; margin-top: 0.5rem;">
            This slide may contain complex layouts, shapes, or charts that cannot be fully displayed in preview mode.
          </p>
        </div>
      `;
    }

    contentHtml += '</div>';
    return contentHtml;
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