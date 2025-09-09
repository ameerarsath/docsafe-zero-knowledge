/**
 * Document Preview Component for SecureVault
 * 
 * Features:
 * - Preview various document types (PDF, images, text)
 * - Fallback for unsupported types
 * - Loading states and error handling
 * - Full-screen modal support
 * - Download and share actions
 */

import React, { useState, useCallback, useEffect } from 'react';
import { 
  X, 
  Download, 
  Share2, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Eye,
  FileText,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Document } from '../../hooks/useDocuments';
import { documentsApi } from '../../services/api/documents';
import { useEncryption } from '../../hooks/useEncryption';

interface DocumentPreviewProps {
  document: Document;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (documentId: number) => void;
  onShare?: (document: Document) => void;
  className?: string;
}

interface PreviewState {
  content: string | null;
  isLoading: boolean;
  error: string | null;
  zoom: number;
  rotation: number;
  needsPassword: boolean;
  isDecrypting: boolean;
  decryptedBlob: Blob | null;
  blobUrl: string | null;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  document,
  isOpen,
  onClose,
  onDownload,
  onShare,
  className = ''
}) => {
  const [state, setState] = useState<PreviewState>({
    content: null,
    isLoading: false,
    error: null,
    zoom: 100,
    rotation: 0,
    needsPassword: true,
    isDecrypting: false,
    decryptedBlob: null,
    blobUrl: null
  });

  const [password, setPassword] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  // Use encryption hook for decryption
  const { decryptDownloadedFile, keys } = useEncryption();

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<PreviewState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Check if document type is previewable
   */
  const isPreviewable = useCallback((doc: Document): boolean => {
    if (!doc.mime_type) return false;
    
    const previewableTypes = [
      'text/plain',
      'text/csv',
      'text/markdown',
      'application/json',
      'application/xml',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf'
    ];
    
    return previewableTypes.includes(doc.mime_type);
  }, []);

  /**
   * Decrypt and load preview content
   */
  const decryptAndPreview = useCallback(async (encryptionPassword: string) => {
    if (!document || !isPreviewable(document)) {
      updateState({ content: null, error: 'Preview not available for this file type' });
      return;
    }

    updateState({ isDecrypting: true, error: null });

    try {
      console.log('🔐 Starting document decryption for preview:', document.name);

      // Fetch the encrypted document data
      const downloadUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:8002'}/api/v1/documents/${document.id}/download`;
      console.log('🔗 DOWNLOAD DIAGNOSTIC - Fetching from URL:', downloadUrl);

      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token') || sessionStorage.getItem('access_token')}`,
        },
      });

      console.log('🔗 DOWNLOAD DIAGNOSTIC - Response status:', response.status);
      console.log('🔗 DOWNLOAD DIAGNOSTIC - Content-Length header:', response.headers.get('Content-Length'));

      if (!response.ok) {
        // Handle specific HTTP error responses from backend
        let errorMessage = 'Failed to fetch document';
        
        try {
          const errorResponse = await response.json();
          if (errorResponse.detail) {
            errorMessage = errorResponse.detail;
          }
        } catch {
          // If response is not JSON, use default error message based on status
          if (response.status === 404) {
            errorMessage = 'Document file not found. The file may have been moved or deleted from storage.';
          } else if (response.status === 403) {
            errorMessage = 'Access denied. You do not have permission to view this document.';
          } else if (response.status === 500) {
            errorMessage = 'Server error occurred while accessing the document file.';
          } else {
            errorMessage = `Failed to fetch document (Status: ${response.status})`;
          }
        }
        
        throw new Error(errorMessage);
      }

      const encryptedBlob = await response.blob();
      console.log('📦 Downloaded encrypted blob:', { size: encryptedBlob.size, type: encryptedBlob.type });
      console.log('📦 DOWNLOAD DIAGNOSTIC - Blob size vs Content-Length:', {
        blobSize: encryptedBlob.size,
        contentLength: response.headers.get('Content-Length'),
        mismatch: encryptedBlob.size !== parseInt(response.headers.get('Content-Length') || '0')
      });

      // Check if document has encryption metadata
      if (document.encryption_key_id && document.encryption_iv && document.encryption_auth_tag) {
        console.log('🔑 Decrypting document with metadata:', {
          keyId: document.encryption_key_id,
          hasIv: !!document.encryption_iv,
          hasAuthTag: !!document.encryption_auth_tag
        });

        // Convert blob to ArrayBuffer for decryption
        const encryptedData = await encryptedBlob.arrayBuffer();
        
        // Prepare decryption metadata
        const decryptionMetadata = {
          keyId: document.encryption_key_id,
          iv: document.encryption_iv,
          authTag: document.encryption_auth_tag,
          originalName: document.name,
          mimeType: document.mime_type
        };

        // Decrypt the document
        const decryptedFile = await decryptDownloadedFile(encryptedData, decryptionMetadata, encryptionPassword);
        console.log('✅ Document decrypted successfully:', decryptedFile.name);

        // Create blob URL for preview
        const blobUrl = URL.createObjectURL(decryptedFile);
        
        updateState({
          content: document.mime_type === 'application/pdf' ? 'pdf-viewer' : 'decrypted-content',
          isDecrypting: false,
          needsPassword: false,
          decryptedBlob: decryptedFile,
          blobUrl: blobUrl
        });
        
      } else {
        console.log('📄 Document not encrypted, using directly');
        // Document is not encrypted, use directly
        const blobUrl = URL.createObjectURL(encryptedBlob);
        
        updateState({
          content: document.mime_type === 'application/pdf' ? 'pdf-viewer' : 'decrypted-content',
          isDecrypting: false,
          needsPassword: false,
          decryptedBlob: encryptedBlob,
          blobUrl: blobUrl
        });
      }
      
      setShowPasswordDialog(false);

    } catch (error) {
      console.error('❌ Document preview failed:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to load document preview';
      
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        
        // Check for specific error types and provide appropriate messages
        if (message.includes('missing from disk') || message.includes('not found on storage') || message.includes('file not found')) {
          errorMessage = `📁 Document Missing: The file "${document.name}" is no longer available on the server. It may have been moved, deleted, or the storage location is inaccessible.`;
        } else if (message.includes('access denied') || message.includes('permission')) {
          errorMessage = `🔒 Access Denied: You don't have permission to access "${document.name}" or the file permissions have changed.`;
        } else if (message.includes('corrupted') || message.includes('invalid')) {
          errorMessage = `⚠️ File Error: The document "${document.name}" appears to be corrupted or invalid.`;
        } else if (message.includes('wrong password') || message.includes('decryption failed')) {
          errorMessage = `🔑 Decryption Failed: Unable to decrypt "${document.name}". Please check your password.`;
        } else if (message.includes('moved during download') || message.includes('disappeared')) {
          errorMessage = `📋 File Changed: The document "${document.name}" was modified during preview. Please refresh and try again.`;
        } else {
          // Use the original error message if it's already user-friendly
          errorMessage = error.message;
        }
      }
      
      updateState({
        error: errorMessage,
        isDecrypting: false
      });
    }
  }, [document, isPreviewable, updateState, decryptDownloadedFile]);

  /**
   * Handle password submission
   */
  const handlePasswordSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      decryptAndPreview(password);
    }
  }, [password, decryptAndPreview]);

  /**
   * Start preview process (show password dialog)
   */
  const startPreview = useCallback(() => {
    if (!document) return;
    
    if (state.needsPassword) {
      setShowPasswordDialog(true);
    } else {
      // Already decrypted, just show content
      updateState({ isLoading: false });
    }
  }, [document, state.needsPassword, updateState]);

  /**
   * Handle zoom controls
   */
  const handleZoom = useCallback((direction: 'in' | 'out' | 'reset') => {
    updateState({
      zoom: direction === 'in' ? Math.min(state.zoom + 25, 200) :
            direction === 'out' ? Math.max(state.zoom - 25, 25) :
            100
    });
  }, [state.zoom, updateState]);

  /**
   * Handle rotation
   */
  const handleRotate = useCallback(() => {
    updateState({ rotation: (state.rotation + 90) % 360 });
  }, [state.rotation, updateState]);

  /**
   * Format file size
   */
  const formatFileSize = useCallback((bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  /**
   * Get file type icon
   */
  const getFileIcon = useCallback((mimeType?: string) => {
    if (!mimeType) return <FileText className="w-8 h-8 text-gray-400" />;
    
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📋';
    if (mimeType.startsWith('text/')) return '📃';
    return '📁';
  }, []);

  /**
   * Render preview content based on file type
   */
  const renderPreviewContent = useCallback(() => {
    if (state.isDecrypting) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Decrypting document...</p>
            <p className="text-gray-500 text-sm mt-2">Please wait while we decrypt your document</p>
          </div>
        </div>
      );
    }

    if (state.needsPassword && !showPasswordDialog) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Document Encrypted</h3>
            <p className="text-gray-600 mb-4">
              This document is encrypted and requires a password to preview
            </p>
            <button
              onClick={() => setShowPasswordDialog(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Eye className="w-4 h-4 mr-2" />
              Decrypt and Preview
            </button>
          </div>
        </div>
      );
    }

    if (state.isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Loading preview...</p>
          </div>
        </div>
      );
    }

    if (state.error) {
      return (
        <div className="flex items-center justify-center h-64 p-6">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-600 mb-3">Preview Unavailable</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm whitespace-pre-wrap">{state.error}</p>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (!isPreviewable(document)) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-4xl mb-4">{getFileIcon(document.mime_type)}</div>
            <p className="text-gray-600 mb-2">Preview not available</p>
            <p className="text-gray-500 text-sm">
              {document.mime_type || 'Unknown file type'}
            </p>
            <button
              onClick={() => onDownload?.(document.id)}
              className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Download to View
            </button>
          </div>
        </div>
      );
    }

    // PDF preview
    if (document.mime_type === 'application/pdf' && state.content === 'pdf-viewer' && state.blobUrl) {
      return (
        <div className="flex-1 overflow-hidden">
          <iframe
            src={state.blobUrl}
            title={`PDF Preview: ${document.name}`}
            className="w-full h-full min-h-96 border-0"
            style={{ height: 'calc(90vh - 200px)' }}
          >
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-6xl mb-4">📄</div>
                <p className="text-gray-600 mb-2">PDF cannot be displayed in this browser</p>
                <button
                  onClick={() => onDownload?.(document.id)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </button>
              </div>
            </div>
          </iframe>
        </div>
      );
    }

    // Image preview
    if (document.mime_type?.startsWith('image/')) {
      if (state.blobUrl) {
        return (
          <div className="flex items-center justify-center min-h-64 p-4">
            <div
              style={{
                transform: `scale(${state.zoom / 100}) rotate(${state.rotation}deg)`,
                transition: 'transform 0.2s ease'
              }}
            >
              <img
                src={state.blobUrl}
                alt={document.name}
                className="max-w-full max-h-96 object-contain border border-gray-200 rounded-lg shadow-sm"
                onError={() => {
                  updateState({ error: 'Failed to display image' });
                }}
              />
            </div>
          </div>
        );
      } else {
        return (
          <div className="flex items-center justify-center min-h-64 p-4">
            <div
              style={{
                transform: `scale(${state.zoom / 100}) rotate(${state.rotation}deg)`,
                transition: 'transform 0.2s ease'
              }}
            >
              <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8">
                <div className="text-center">
                  <div className="text-4xl mb-4">🖼️</div>
                  <p className="text-gray-600">Image Preview</p>
                  <p className="text-gray-500 text-sm mt-1">
                    Encrypted image preview placeholder
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      }
    }

    // Text preview
    if (document.mime_type?.startsWith('text/') || 
        document.mime_type === 'application/json' ||
        document.mime_type === 'application/xml') {
      
      let textContent = state.content;
      
      // If we have a decrypted blob, read its content for text files
      if (state.decryptedBlob && !textContent) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          updateState({ content: text });
        };
        reader.readAsText(state.decryptedBlob);
        textContent = 'Loading decrypted content...';
      }
      
      return (
        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap">{textContent || 'No content available'}</pre>
          </div>
        </div>
      );
    }

    return null;
  }, [state, document, isPreviewable, getFileIcon, onDownload]);

  // Start preview when document changes
  useEffect(() => {
    if (isOpen && document) {
      startPreview();
    }
  }, [isOpen, document, startPreview]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Clean up blob URL to prevent memory leaks
      if (state.blobUrl) {
        URL.revokeObjectURL(state.blobUrl);
      }
      
      updateState({
        content: null,
        error: null,
        zoom: 100,
        rotation: 0,
        needsPassword: true,
        isDecrypting: false,
        decryptedBlob: null,
        blobUrl: null
      });
      setPassword('');
      setShowPasswordDialog(false);
    }
  }, [isOpen, updateState, state.blobUrl]);

  if (!isOpen) return null;
  
  // Return early if no document is provided
  if (!document) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Document Selected</h3>
            <p className="text-gray-600 mb-4">Please select a document to preview.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] w-full flex flex-col ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {document.name}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{document.mime_type || 'Unknown type'}</span>
                <span>{formatFileSize(document.file_size)}</span>
                <span>Modified {new Date(document.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2 ml-4">
            {isPreviewable(document) && document.mime_type?.startsWith('image/') && (
              <>
                <button
                  onClick={() => handleZoom('out')}
                  disabled={state.zoom <= 25}
                  className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-500 min-w-12 text-center">
                  {state.zoom}%
                </span>
                <button
                  onClick={() => handleZoom('in')}
                  disabled={state.zoom >= 200}
                  className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-2 text-gray-600 hover:text-gray-800"
                  title="Rotate"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </>
            )}

            <div className="w-px h-6 bg-gray-300 mx-2" />

            <button
              onClick={() => onDownload?.(document.id)}
              className="p-2 text-gray-600 hover:text-gray-800"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>

            {onShare && (
              <button
                onClick={() => onShare(document)}
                className="p-2 text-gray-600 hover:text-gray-800"
                title="Share"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {renderPreviewContent()}
        </div>

        {/* Footer */}
        {document.description && (
          <div className="border-t border-gray-200 p-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Description:</span> {document.description}
            </p>
          </div>
        )}
      </div>

      {/* Password Dialog */}
      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Eye className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Decrypt Document</h3>
                  <p className="text-sm text-gray-500">Enter your password to preview this encrypted document</p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label htmlFor="decryption-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="decryption-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your document password"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    autoFocus
                  />
                </div>

                <div className="text-xs text-gray-500">
                  <p>📄 Document: <span className="font-medium">{document.name}</span></p>
                  <p>📊 Size: <span className="font-medium">{formatFileSize(document.file_size)}</span></p>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordDialog(false);
                      setPassword('');
                    }}
                    className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!password.trim() || state.isDecrypting}
                    className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {state.isDecrypting ? 'Decrypting...' : 'Decrypt & Preview'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentPreview;