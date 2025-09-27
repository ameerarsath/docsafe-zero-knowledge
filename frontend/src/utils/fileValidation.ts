/**
 * File validation utilities for SecureVault
 * 
 * Provides comprehensive file validation including:
 * - File type validation
 * - Size validation
 * - Security checks
 * - Content validation
 * - Malware detection patterns
 */

// File type definitions - Comprehensive support for all common file types
export const ALLOWED_MIME_TYPES = {
  // Documents
  'application/pdf': { extension: '.pdf', category: 'document', icon: '📄' },
  'application/msword': { extension: '.doc', category: 'document', icon: '📝' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    extension: '.docx', category: 'document', icon: '📝'
  },
  'application/vnd.ms-excel': { extension: '.xls', category: 'spreadsheet', icon: '📊' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    extension: '.xlsx', category: 'spreadsheet', icon: '📊'
  },
  'application/vnd.ms-powerpoint': { extension: '.ppt', category: 'presentation', icon: '📋' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
    extension: '.pptx', category: 'presentation', icon: '📋'
  },
  'application/rtf': { extension: '.rtf', category: 'document', icon: '📝' },
  'application/epub+zip': { extension: '.epub', category: 'document', icon: '📚' },
  'application/vnd.oasis.opendocument.text': { extension: '.odt', category: 'document', icon: '📝' },
  'application/vnd.oasis.opendocument.spreadsheet': { extension: '.ods', category: 'spreadsheet', icon: '📊' },
  'application/vnd.oasis.opendocument.presentation': { extension: '.odp', category: 'presentation', icon: '📋' },

  // Text files
  'text/plain': { extension: '.txt', category: 'text', icon: '📃' },
  'text/csv': { extension: '.csv', category: 'data', icon: '📊' },
  'text/markdown': { extension: '.md', category: 'text', icon: '📃' },
  'text/html': { extension: '.html', category: 'text', icon: '🌐' },
  'text/css': { extension: '.css', category: 'text', icon: '🎨' },
  'text/javascript': { extension: '.js', category: 'code', icon: '💻' },
  'text/typescript': { extension: '.ts', category: 'code', icon: '💻' },
  'text/x-python': { extension: '.py', category: 'code', icon: '🐍' },
  'text/x-java-source': { extension: '.java', category: 'code', icon: '☕' },
  'text/x-c': { extension: '.c', category: 'code', icon: '💻' },
  'text/x-c++': { extension: '.cpp', category: 'code', icon: '💻' },
  'text/x-csharp': { extension: '.cs', category: 'code', icon: '💻' },
  'text/x-php': { extension: '.php', category: 'code', icon: '💻' },
  'text/x-ruby': { extension: '.rb', category: 'code', icon: '💎' },
  'text/x-go': { extension: '.go', category: 'code', icon: '🔵' },
  'text/x-rust': { extension: '.rs', category: 'code', icon: '🦀' },
  'application/json': { extension: '.json', category: 'data', icon: '📋' },
  'application/xml': { extension: '.xml', category: 'data', icon: '📋' },
  'application/yaml': { extension: '.yaml', category: 'data', icon: '📋' },
  'application/x-yaml': { extension: '.yml', category: 'data', icon: '📋' },
  'text/x-sql': { extension: '.sql', category: 'code', icon: '🗄️' },

  // Images
  'image/jpeg': { extension: '.jpg', category: 'image', icon: '🖼️' },
  'image/png': { extension: '.png', category: 'image', icon: '🖼️' },
  'image/gif': { extension: '.gif', category: 'image', icon: '🖼️' },
  'image/webp': { extension: '.webp', category: 'image', icon: '🖼️' },
  'image/svg+xml': { extension: '.svg', category: 'image', icon: '🖼️' },
  'image/bmp': { extension: '.bmp', category: 'image', icon: '🖼️' },
  'image/tiff': { extension: '.tiff', category: 'image', icon: '🖼️' },
  'image/x-icon': { extension: '.ico', category: 'image', icon: '🖼️' },
  'image/heic': { extension: '.heic', category: 'image', icon: '🖼️' },
  'image/avif': { extension: '.avif', category: 'image', icon: '🖼️' },

  // Video files
  'video/mp4': { extension: '.mp4', category: 'video', icon: '🎥' },
  'video/avi': { extension: '.avi', category: 'video', icon: '🎥' },
  'video/quicktime': { extension: '.mov', category: 'video', icon: '🎥' },
  'video/x-msvideo': { extension: '.avi', category: 'video', icon: '🎥' },
  'video/webm': { extension: '.webm', category: 'video', icon: '🎥' },
  'video/x-flv': { extension: '.flv', category: 'video', icon: '🎥' },
  'video/3gpp': { extension: '.3gp', category: 'video', icon: '🎥' },

  // Audio files
  'audio/mpeg': { extension: '.mp3', category: 'audio', icon: '🎵' },
  'audio/wav': { extension: '.wav', category: 'audio', icon: '🎵' },
  'audio/x-wav': { extension: '.wav', category: 'audio', icon: '🎵' },
  'audio/ogg': { extension: '.ogg', category: 'audio', icon: '🎵' },
  'audio/aac': { extension: '.aac', category: 'audio', icon: '🎵' },
  'audio/flac': { extension: '.flac', category: 'audio', icon: '🎵' },
  'audio/x-m4a': { extension: '.m4a', category: 'audio', icon: '🎵' },

  // Archives
  'application/zip': { extension: '.zip', category: 'archive', icon: '📦' },
  'application/x-rar-compressed': { extension: '.rar', category: 'archive', icon: '📦' },
  'application/x-7z-compressed': { extension: '.7z', category: 'archive', icon: '📦' },
  'application/x-tar': { extension: '.tar', category: 'archive', icon: '📦' },
  'application/gzip': { extension: '.gz', category: 'archive', icon: '📦' },
  'application/x-bzip2': { extension: '.bz2', category: 'archive', icon: '📦' },

  // CAD and Design
  'application/x-autocad': { extension: '.dwg', category: 'cad', icon: '📐' },
  'application/dxf': { extension: '.dxf', category: 'cad', icon: '📐' },
  'application/x-photoshop': { extension: '.psd', category: 'design', icon: '🎨' },
  'application/illustrator': { extension: '.ai', category: 'design', icon: '🎨' },

  // Fonts
  'font/ttf': { extension: '.ttf', category: 'font', icon: '🔤' },
  'font/otf': { extension: '.otf', category: 'font', icon: '🔤' },
  'font/woff': { extension: '.woff', category: 'font', icon: '🔤' },
  'font/woff2': { extension: '.woff2', category: 'font', icon: '🔤' },

  // Specialized formats
  'application/vnd.google-earth.kml+xml': { extension: '.kml', category: 'geo', icon: '🌍' },
  'application/vnd.google-earth.kmz': { extension: '.kmz', category: 'geo', icon: '🌍' },
  'application/x-sqlite3': { extension: '.db', category: 'database', icon: '🗄️' },
  'application/x-msaccess': { extension: '.mdb', category: 'database', icon: '🗄️' },

  // Catch-all for other file types
  'application/octet-stream': { extension: '', category: 'binary', icon: '📁' }
} as const;

// Dangerous file extensions that should never be allowed
export const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.scr', '.com', '.pif', '.vbs', '.js', '.jar',
  '.app', '.deb', '.pkg', '.dmg', '.rpm', '.msi', '.apk', '.ipa',
  '.sh', '.bash', '.zsh', '.fish', '.ps1', '.psm1', '.psd1',
  '.py', '.pl', '.rb', '.php', '.asp', '.aspx', '.jsp'
] as const;

// Maximum file sizes by category (in bytes)
export const MAX_FILE_SIZES = {
  document: 100 * 1024 * 1024, // 100MB
  spreadsheet: 50 * 1024 * 1024, // 50MB
  presentation: 100 * 1024 * 1024, // 100MB
  image: 25 * 1024 * 1024, // 25MB
  text: 10 * 1024 * 1024, // 10MB
  data: 25 * 1024 * 1024, // 25MB
  archive: 200 * 1024 * 1024, // 200MB
  code: 10 * 1024 * 1024, // 10MB
  video: 500 * 1024 * 1024, // 500MB
  audio: 100 * 1024 * 1024, // 100MB
  cad: 200 * 1024 * 1024, // 200MB
  design: 100 * 1024 * 1024, // 100MB
  font: 5 * 1024 * 1024, // 5MB
  geo: 50 * 1024 * 1024, // 50MB
  database: 500 * 1024 * 1024, // 500MB
  binary: 100 * 1024 * 1024, // 100MB
  default: 50 * 1024 * 1024 // 50MB
} as const;

// Validation result types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    category: string;
    icon: string;
    expectedExtension: string;
    actualExtension: string;
    sizeFormatted: string;
  };
}

export interface FileValidationOptions {
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  blockedExtensions?: string[];
  requireExtensionMatch?: boolean;
  enableContentValidation?: boolean;
  enableSecurityScanning?: boolean;
}

/**
 * Format file size to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.substring(lastDot).toLowerCase() : '';
}

/**
 * Get file info from MIME type
 */
export function getFileInfo(mimeType: string) {
  return ALLOWED_MIME_TYPES[mimeType as keyof typeof ALLOWED_MIME_TYPES] || {
    extension: '',
    category: 'unknown',
    icon: '📁'
  };
}

/**
 * Check if file extension is dangerous
 */
export function isDangerousExtension(extension: string): boolean {
  return DANGEROUS_EXTENSIONS.includes(extension.toLowerCase() as any);
}

/**
 * Validate MIME type against file extension
 */
export function validateMimeTypeExtension(mimeType: string, filename: string): boolean {
  const fileInfo = getFileInfo(mimeType);
  const actualExtension = getFileExtension(filename);
  
  if (!fileInfo.extension) return false;
  
  // Handle multiple valid extensions for same MIME type
  const validExtensions = [fileInfo.extension];
  
  // Add common alternative extensions
  if (mimeType === 'image/jpeg') validExtensions.push('.jpeg' as any);
  if (mimeType === 'text/plain') validExtensions.push('.text' as any);
  
  return validExtensions.includes(actualExtension as any);
}

/**
 * Perform basic content validation by checking file headers
 */
export async function validateFileContent(file: File): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];
  
  try {
    // Read first few bytes to check file signature
    const headerBytes = await readFileHeader(file, 16);
    
    // Check for common file signatures
    const signatures = {
      pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
      png: [0x89, 0x50, 0x4E, 0x47], // PNG
      jpeg: [0xFF, 0xD8, 0xFF], // JPEG
      gif: [0x47, 0x49, 0x46], // GIF
      zip: [0x50, 0x4B, 0x03, 0x04], // ZIP/DOCX/XLSX/PPTX
      docx: [0x50, 0x4B, 0x03, 0x04], // Same as ZIP
    };
    
    // Validate signature matches expected type
    if (file.type === 'application/pdf') {
      if (!matchesSignature(headerBytes, signatures.pdf)) {
        errors.push('File appears to be corrupted or not a valid PDF');
      }
    } else if (file.type === 'image/png') {
      if (!matchesSignature(headerBytes, signatures.png)) {
        errors.push('File appears to be corrupted or not a valid PNG');
      }
    } else if (file.type === 'image/jpeg') {
      if (!matchesSignature(headerBytes, signatures.jpeg)) {
        errors.push('File appears to be corrupted or not a valid JPEG');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    return {
      isValid: false,
      errors: ['Failed to validate file content']
    };
  }
}

/**
 * Read file header bytes
 */
async function readFileHeader(file: File, numBytes: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      resolve(new Uint8Array(arrayBuffer.slice(0, numBytes)));
    };
    
    reader.onerror = () => reject(reader.error);
    
    const blob = file.slice(0, numBytes);
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Check if file header matches expected signature
 */
function matchesSignature(headerBytes: Uint8Array, signature: number[]): boolean {
  if (headerBytes.length < signature.length) return false;
  
  return signature.every((byte, index) => headerBytes[index] === byte);
}

/**
 * Scan file for potential security threats
 */
export async function scanFileForThreats(file: File): Promise<{ isSafe: boolean; threats: string[] }> {
  const threats: string[] = [];
  
  try {
    // Check filename for suspicious patterns
    const filename = file.name.toLowerCase();
    
    // Double extension check
    const extensions = filename.split('.').slice(1);
    if (extensions.length > 1) {
      const penultimateExt = '.' + extensions[extensions.length - 2];
      if (isDangerousExtension(penultimateExt)) {
        threats.push('File has suspicious double extension');
      }
    }
    
    // Check for suspicious patterns in filename
    const suspiciousPatterns = [
      /\.(scr|pif|com|bat|cmd|exe)\./i,
      /[<>:"|?*]/,
      /^\./,
      /\s+\./,
      /invoice.*\.zip$/i,
      /document.*\.exe$/i
    ];
    
    suspiciousPatterns.forEach(pattern => {
      if (pattern.test(filename)) {
        threats.push('Filename contains suspicious pattern');
      }
    });
    
    // Check file size anomalies
    if (file.size === 0) {
      threats.push('File is empty');
    } else if (file.size > 500 * 1024 * 1024) { // 500MB
      threats.push('File is unusually large');
    }
    
    // For text files, check for suspicious content
    if (file.type.startsWith('text/')) {
      const content = await readTextFileContent(file, 1024); // First 1KB
      
      const suspiciousTextPatterns = [
        /<script[^>]*>/i,
        /javascript:/i,
        /vbscript:/i,
        /onload\s*=/i,
        /onerror\s*=/i,
        /eval\s*\(/i,
        /document\.write/i
      ];
      
      suspiciousTextPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          threats.push('File contains potentially malicious script content');
        }
      });
    }
    
    return {
      isSafe: threats.length === 0,
      threats
    };
  } catch (error) {
    return {
      isSafe: false,
      threats: ['Failed to scan file for threats']
    };
  }
}

/**
 * Read text content from file
 */
async function readTextFileContent(file: File, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    
    const blob = file.slice(0, maxBytes);
    reader.readAsText(blob);
  });
}

/**
 * Main file validation function
 */
export async function validateFile(
  file: File, 
  options: FileValidationOptions = {}
): Promise<ValidationResult> {
  const {
    maxFileSize,
    allowedMimeTypes = Object.keys(ALLOWED_MIME_TYPES),
    blockedExtensions = DANGEROUS_EXTENSIONS,
    requireExtensionMatch = true,
    enableContentValidation = false,
    enableSecurityScanning = true
  } = options;
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Get file info
  const fileInfo = getFileInfo(file.type);
  const actualExtension = getFileExtension(file.name);
  
  // MIME type validation
  if (!allowedMimeTypes.includes(file.type)) {
    errors.push(`File type "${file.type}" is not supported`);
  }
  
  // Extension validation
  if (isDangerousExtension(actualExtension)) {
    errors.push(`File extension "${actualExtension}" is not allowed for security reasons`);
  }
  
  if (blockedExtensions.includes(actualExtension as any)) {
    errors.push(`File extension "${actualExtension}" is blocked`);
  }
  
  // MIME type and extension match validation
  if (requireExtensionMatch && fileInfo.extension && !validateMimeTypeExtension(file.type, file.name)) {
    warnings.push(`File extension "${actualExtension}" doesn't match expected "${fileInfo.extension}" for MIME type "${file.type}"`);
  }
  
  // File size validation
  const maxSize = maxFileSize || MAX_FILE_SIZES[fileInfo.category as keyof typeof MAX_FILE_SIZES] || MAX_FILE_SIZES.default;
  if (file.size > maxSize) {
    errors.push(`File size ${formatFileSize(file.size)} exceeds maximum allowed ${formatFileSize(maxSize)}`);
  }
  
  // Content validation
  if (enableContentValidation && allowedMimeTypes.includes(file.type)) {
    try {
      const contentValidation = await validateFileContent(file);
      if (!contentValidation.isValid) {
        errors.push(...contentValidation.errors);
      }
    } catch (error) {
      warnings.push('Could not validate file content');
    }
  }
  
  // Security scanning
  if (enableSecurityScanning) {
    try {
      const securityScan = await scanFileForThreats(file);
      if (!securityScan.isSafe) {
        errors.push(...securityScan.threats);
      }
    } catch (error) {
      warnings.push('Could not complete security scan');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    fileInfo: {
      category: fileInfo.category,
      icon: fileInfo.icon,
      expectedExtension: fileInfo.extension,
      actualExtension,
      sizeFormatted: formatFileSize(file.size)
    }
  };
}

/**
 * Batch validate multiple files
 */
export async function validateFiles(
  files: File[], 
  options: FileValidationOptions = {}
): Promise<ValidationResult[]> {
  return Promise.all(files.map(file => validateFile(file, options)));
}

/**
 * Get validation summary for multiple files
 */
export function getValidationSummary(results: ValidationResult[]) {
  const total = results.length;
  const valid = results.filter(r => r.isValid).length;
  const invalid = total - valid;
  const warnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
  const errors = results.reduce((sum, r) => sum + r.errors.length, 0);
  
  return {
    total,
    valid,
    invalid,
    warnings,
    errors,
    hasErrors: errors > 0,
    hasWarnings: warnings > 0,
    allValid: invalid === 0
  };
}