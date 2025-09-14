/**
 * Document Preview Size Configurations
 * 
 * Utility functions and presets for custom document preview sizing
 * across different file extensions and use cases.
 */

export interface PreviewDimensions {
  width?: string | number;
  height?: string | number;
  maxWidth?: string | number;
  maxHeight?: string | number;
}

/**
 * Predefined size presets for different use cases
 */
export const PREVIEW_PRESETS: Record<string, PreviewDimensions> = {
  // Small preview for thumbnails or compact views
  small: {
    width: '400px',
    height: '300px',
    maxWidth: '400px',
    maxHeight: '300px'
  },
  
  // Medium preview for modal dialogs
  medium: {
    width: '800px',
    height: '600px',
    maxWidth: '800px',
    maxHeight: '600px'
  },
  
  // Large preview for detailed viewing
  large: {
    width: '1200px',
    height: '800px',
    maxWidth: '1200px',
    maxHeight: '800px'
  },
  
  // Full screen preview
  fullscreen: {
    width: '100vw',
    height: '100vh',
    maxWidth: '100vw',
    maxHeight: '100vh'
  },
  
  // Responsive preview that adapts to container
  responsive: {
    width: '100%',
    height: 'auto',
    maxWidth: '100%',
    maxHeight: '90vh'
  },
  
  // Square preview for images
  square: {
    width: '500px',
    height: '500px',
    maxWidth: '500px',
    maxHeight: '500px'
  },
  
  // Wide preview for documents
  wide: {
    width: '1000px',
    height: '600px',
    maxWidth: '1000px',
    maxHeight: '600px'
  },
  
  // Tall preview for long documents
  tall: {
    width: '600px',
    height: '900px',
    maxWidth: '600px',
    maxHeight: '900px'
  }
};

/**
 * Get optimal preview size based on file extension and MIME type
 */
export const getOptimalPreviewSize = (
  mimeType: string,
  fileName: string,
  context: 'modal' | 'inline' | 'thumbnail' | 'fullscreen' = 'modal'
): PreviewDimensions => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Context-based sizing
  switch (context) {
    case 'thumbnail':
      return PREVIEW_PRESETS.small;
    case 'fullscreen':
      return PREVIEW_PRESETS.fullscreen;
    case 'inline':
      return PREVIEW_PRESETS.responsive;
  }
  
  // File type specific sizing for modal context
  if (mimeType.startsWith('image/')) {
    // Image files - prefer square or responsive
    if (mimeType === 'image/svg+xml') {
      return PREVIEW_PRESETS.medium; // SVGs can be resized well
    }
    return PREVIEW_PRESETS.large; // Photos need larger preview
  }
  
  if (mimeType === 'application/pdf') {
    // PDFs use custom viewer with optimized dimensions
    return {
      width: '100%',
      height: '700px',
      maxWidth: '100%',
      maxHeight: '85vh'
    };
  }
  
  if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml')) {
    // Text files can be displayed in various sizes
    return PREVIEW_PRESETS.wide;
  }
  
  // Office documents
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return PREVIEW_PRESETS.tall;
  }
  
  if (mimeType.includes('excel') || mimeType.includes('sheet')) {
    return PREVIEW_PRESETS.wide;
  }
  
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) {
    return PREVIEW_PRESETS.wide;
  }
  
  // Default to medium size
  return PREVIEW_PRESETS.medium;
};

/**
 * Create custom size based on aspect ratio and container constraints
 */
export const createCustomSize = (
  aspectRatio: number,
  maxWidth: number,
  maxHeight: number
): PreviewDimensions => {
  let width = maxWidth;
  let height = width / aspectRatio;
  
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }
  
  return {
    width: `${Math.round(width)}px`,
    height: `${Math.round(height)}px`,
    maxWidth: `${maxWidth}px`,
    maxHeight: `${maxHeight}px`
  };
};

/**
 * Get responsive size that maintains aspect ratio
 */
export const getResponsiveSize = (
  preferredWidth: number,
  preferredHeight: number,
  containerWidth?: number,
  containerHeight?: number
): PreviewDimensions => {
  const aspectRatio = preferredWidth / preferredHeight;
  
  if (containerWidth && containerHeight) {
    return createCustomSize(aspectRatio, containerWidth, containerHeight);
  }
  
  return {
    width: `${preferredWidth}px`,
    height: `${preferredHeight}px`,
    maxWidth: '100%',
    maxHeight: '100%'
  };
};

/**
 * Size utilities for different file extensions
 */
export const FILE_EXTENSION_SIZES: Record<string, PreviewDimensions> = {
  // Images
  'jpg': PREVIEW_PRESETS.large,
  'jpeg': PREVIEW_PRESETS.large,
  'png': PREVIEW_PRESETS.large,
  'gif': PREVIEW_PRESETS.medium,
  'webp': PREVIEW_PRESETS.large,
  'svg': PREVIEW_PRESETS.medium,
  'bmp': PREVIEW_PRESETS.large,
  'tiff': PREVIEW_PRESETS.large,
  'ico': PREVIEW_PRESETS.small,
  
  // Documents - PDFs get custom viewer optimized sizing
  'pdf': {
    width: '100%',
    height: '700px',
    maxWidth: '100%',
    maxHeight: '85vh'
  },
  'doc': PREVIEW_PRESETS.tall,
  'docx': PREVIEW_PRESETS.tall,
  'rtf': PREVIEW_PRESETS.tall,
  
  // Spreadsheets
  'xls': PREVIEW_PRESETS.wide,
  'xlsx': PREVIEW_PRESETS.wide,
  'csv': PREVIEW_PRESETS.wide,
  
  // Presentations
  'ppt': PREVIEW_PRESETS.wide,
  'pptx': PREVIEW_PRESETS.wide,
  
  // Text files
  'txt': PREVIEW_PRESETS.medium,
  'md': PREVIEW_PRESETS.medium,
  'json': PREVIEW_PRESETS.medium,
  'xml': PREVIEW_PRESETS.medium,
  'html': PREVIEW_PRESETS.wide,
  'css': PREVIEW_PRESETS.medium,
  'js': PREVIEW_PRESETS.medium,
  'ts': PREVIEW_PRESETS.medium,
  'yaml': PREVIEW_PRESETS.medium,
  'yml': PREVIEW_PRESETS.medium
};

/**
 * Get size by file extension
 */
export const getSizeByExtension = (fileName: string): PreviewDimensions => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  return FILE_EXTENSION_SIZES[extension] || PREVIEW_PRESETS.medium;
};