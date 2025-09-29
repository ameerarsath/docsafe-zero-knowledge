/**
 * Document Components Index
 * 
 * Exports all document-related components for easy importing
 */

export { default as DocumentUpload } from './DocumentUpload';
export { default as DocumentPreview } from './DocumentPreview';
export { default as DocumentMoveDialog } from './DocumentMoveDialog';
export { default as DocumentShareDialog } from './DocumentShareDialog';
export { default as DocumentVersionHistory } from './DocumentVersionHistory';
export { default as FolderManagementDialog } from './FolderManagementDialog';
export { default as SecurePDFViewer } from './SecurePDFViewer';
export { default as UniversalFileViewer } from './UniversalFileViewer';

// Re-export types that might be useful
export type { Document } from '../../hooks/useDocuments';