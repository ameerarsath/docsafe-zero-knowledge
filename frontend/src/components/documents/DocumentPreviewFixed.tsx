import React, { useState, useEffect, useCallback } from 'react';
import { documentPreviewService } from '../../services/api/documentPreview';
import type { PreviewData } from '../../services/api/documentPreview';

interface Document {
  id: number;
  name: string;
  file_size: number;
  mime_type: string;
  is_encrypted: boolean;
}

interface DocumentPreviewProps {
  document: Document;
  isOpen?: boolean;
  onClose?: () => void;
  onDownload?: (documentId: number) => void;
  onShare?: (document: Document) => void;
  customSize?: {
    width?: string | number;
    height?: string | number;
    maxWidth?: string | number;
    maxHeight?: string | number;
  };
}

interface PreviewState {
  isDecrypting: boolean;
  error: string | null;
  previewData: PreviewData | null;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ 
  document, 
  isOpen = true, 
  onClose, 
  onDownload, 
  onShare, 
  customSize 
}) => {
  const [state, setState] = useState<PreviewState>({
    isDecrypting: false,
    error: null,
    previewData: null
  });
  
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');

  const updateState = useCallback((updates: Partial<PreviewState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Define all functions first to avoid hoisting issues
  const handleDecryptAndPreview = useCallback(async () => {
    if (state.isDecrypting) return;
    
    updateState({ isDecrypting: true, error: null, previewData: null });
    
    try {
      console.log(`🔍 Getting preview for document ${document.id}...`);
      
      const previewData = await documentPreviewService.getPreview(document.id, {
        previewType: 'auto',
        maxSize: 1024
      });
      
      console.log('✅ Preview data received:', previewData);
      
      updateState({
        isDecrypting: false,
        previewData
      });
      
    } catch (error: any) {
      console.error('❌ Preview failed:', error);
      let errorMessage = 'Failed to generate preview';
      
      if (error.code === 'NETWORK_ERROR' || error.message?.includes('fetch')) {
        errorMessage = 'Network error - please check your connection';
      } else if (error.response?.status === 403) {
        errorMessage = 'Permission denied - you may not have access to this document';
      } else if (error.response?.status === 404) {
        errorMessage = 'Document not found';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error - please try again later';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      updateState({
        isDecrypting: false,
        error: errorMessage
      });
    }
  }, [document.id, updateState, state.isDecrypting]);

  const decryptAndPreview = useCallback(async (encryptionPassword: string) => {
    if (state.isDecrypting) return;
    
    updateState({ isDecrypting: true, error: null });
    
    try {
      console.log(`🔓 Getting encrypted preview for document ${document.id} with password...`);
      
      const previewData = await documentPreviewService.getEncryptedPreview(
        document.id, 
        encryptionPassword,
        {
          previewType: 'auto',
          maxSize: 1024
        }
      );
      
      console.log('✅ Encrypted preview data received:', previewData);
      
      updateState({
        isDecrypting: false,
        previewData
      });
      
      setShowPasswordDialog(false);
      setPassword('');
      
    } catch (error: any) {
      console.error('❌ Encrypted preview failed:', error);
      let errorMessage = 'Failed to decrypt and preview document';
      
      if (error.response?.status === 401) {
        errorMessage = 'Wrong password - please try again';
      } else if (error.response?.status === 404) {
        errorMessage = 'Document not found';
      } else if (error.response?.status === 500) {
        errorMessage = 'Internal server error - please try again later';
      } else if (error.response?.status === 403) {
        errorMessage = 'Permission denied - insufficient access rights';
      } else if (error.code === 'NETWORK_ERROR' || error.message?.includes('fetch')) {
        errorMessage = 'Network error - please check your connection';
      } else {
        errorMessage = error.message || errorMessage;
      }
      
      updateState({
        isDecrypting: false,
        error: errorMessage
      });
    }
  }, [document.id, updateState, state.isDecrypting]);

  const handlePasswordSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    
    await decryptAndPreview(password);
  }, [password, decryptAndPreview]);

  // Now the useEffect can safely call the functions
  useEffect(() => {
    if (isOpen && document?.id) {
      setState({
        isDecrypting: false,
        error: null,
        previewData: null
      });
      setShowPasswordDialog(false);
      setPassword('');
      
      // Automatically start preview generation
      handleDecryptAndPreview();
    }
  }, [document.id, isOpen, handleDecryptAndPreview]);

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderPreviewContent = () => {
    if (state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Preview Failed</h3>
          <p className="text-sm text-gray-600 max-w-md mb-4">{state.error}</p>
          
          {/* Enhanced Debug Information */}
          <div className="text-xs text-gray-500 mb-4 p-3 bg-gray-50 rounded border">
            <div><strong>Debug Info:</strong></div>
            <div>Document ID: {document.id}</div>
            <div>Document Name: {document.name}</div>
            <div>File Size: {formatFileSize(document.file_size)}</div>
            <div>MIME Type: {document.mime_type}</div>
            <div>Is Encrypted: {document.is_encrypted ? 'Yes' : 'No'}</div>
            <div>API URL: {import.meta.env.VITE_API_URL || 'http://localhost:8002'}</div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handleDecryptAndPreview}
              disabled={state.isDecrypting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {state.isDecrypting ? 'Retrying...' : 'Retry Preview'}
            </button>
            {document.is_encrypted && (
              <button
                onClick={() => setShowPasswordDialog(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try with Password
              </button>
            )}
          </div>
        </div>
      );
    }

    if (state.isDecrypting) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 animate-spin">
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Preview</h3>
          <p className="text-sm text-gray-600">Please wait while we prepare your document preview...</p>
        </div>
      );
    }

    if (state.previewData) {
      const { previewData } = state;
      
      if (previewData.type === 'encrypted') {
        return (
          <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Encrypted Document</h3>
            <p className="text-sm text-gray-600 mb-4">{previewData.message}</p>
            <div className="text-xs text-gray-500 mb-6">
              <p>📄 Document: <span className="font-medium">{previewData.document_name}</span></p>
              <p>📊 Size: <span className="font-medium">{formatFileSize(previewData.file_size)}</span></p>
              <p>🔒 Type: <span className="font-medium">{previewData.encryption_type}</span></p>
            </div>
            <button
              onClick={() => setShowPasswordDialog(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Enter Password to Preview
            </button>
          </div>
        );
      }

      if (previewData.type === 'thumbnail' && previewData.data_url) {
        return (
          <div className="w-full h-full p-4">
            <div className="flex flex-col items-center">
              <img 
                src={previewData.data_url}
                alt={`Preview of ${previewData.document_name}`}
                className="max-w-full max-h-96 object-contain rounded-lg shadow-sm border"
              />
              <div className="mt-4 text-center">
                <h3 className="text-lg font-medium text-gray-900">{previewData.document_name}</h3>
                <p className="text-sm text-gray-600">{formatFileSize(previewData.file_size)}</p>
              </div>
            </div>
          </div>
        );
      }

      if (previewData.type === 'text' && previewData.preview) {
        return (
          <div className="w-full h-full p-4">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">{previewData.document_name}</h3>
              <p className="text-sm text-gray-600">
                {formatFileSize(previewData.file_size)} • {previewData.word_count || 0} words
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                {previewData.preview}
              </pre>
              {previewData.is_truncated && (
                <p className="mt-2 text-xs text-gray-500 italic">
                  Preview truncated. Download full document to see complete content.
                </p>
              )}
            </div>
          </div>
        );
      }

      if (previewData.type === 'metadata') {
        return (
          <div className="w-full h-full p-4">
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{previewData.document_name}</h3>
              <div className="text-sm text-gray-600 space-y-1 text-center">
                <p>📊 Size: {formatFileSize(previewData.file_size)}</p>
                <p>📄 Type: {previewData.mime_type}</p>
                <p>📁 Category: {previewData.category || 'Document'}</p>
              </div>
            </div>
          </div>
        );
      }
    }

    // Default: Show manual trigger button
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Document Preview</h3>
        <p className="text-sm text-gray-600 mb-4">Click "Generate Preview" to view this document.</p>
        <div className="text-xs text-gray-500 mb-6">
          <p>📄 Document: <span className="font-medium">{document.name}</span></p>
          <p>📊 Size: <span className="font-medium">{formatFileSize(document.file_size)}</span></p>
        </div>
        <button
          onClick={handleDecryptAndPreview}
          disabled={state.isDecrypting}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {state.isDecrypting ? 'Loading...' : 'Generate Preview'}
        </button>
      </div>
    );
  };

  // If not open, don't render anything
  if (!isOpen) {
    return null;
  }

  // Calculate modal size based on customSize prop
  const modalStyle = customSize ? {
    maxWidth: customSize.maxWidth || '90vw',
    maxHeight: customSize.maxHeight || '90vh',
    width: customSize.width || 'auto',
    height: customSize.height || 'auto'
  } : {
    maxWidth: '90vw',
    maxHeight: '90vh',
    width: 'auto',
    height: 'auto'
  };

  return (
    <>
      {/* Modal Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        {/* Modal Content */}
        <div 
          className="bg-white rounded-lg shadow-xl overflow-hidden"
          style={modalStyle}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-medium text-gray-900">Document Preview</h3>
              <span className="text-sm text-gray-500">
                {document.name} • {formatFileSize(document.file_size)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {/* Download Button */}
              {onDownload && (
                <button
                  onClick={() => onDownload(document.id)}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Download"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
              )}
              {/* Share Button */}
              {onShare && (
                <button
                  onClick={() => onShare(document)}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Share"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                </button>
              )}
              {/* Close Button */}
              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-auto" style={{ minHeight: '400px', maxHeight: 'calc(90vh - 100px)' }}>
            {renderPreviewContent()}
          </div>
        </div>
      </div>

      {/* Password Dialog */}
      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Enter Decryption Password</h3>
              <button
                onClick={() => setShowPasswordDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                This document is encrypted with zero-knowledge encryption. Please enter your password to decrypt and preview it.
              </p>
              
              <form onSubmit={handlePasswordSubmit}>
                <div className="mb-4">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your decryption password"
                    disabled={state.isDecrypting}
                    autoFocus
                  />
                </div>

                <div className="text-xs text-gray-500 mb-4">
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
    </>
  );
};

export default DocumentPreview;