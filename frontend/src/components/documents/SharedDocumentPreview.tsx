/**
 * Shared Document Preview Component
 * Specialized component for previewing shared documents using the shares API
 * Supports client-side decryption and proper iframe security for zero-knowledge encryption
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  Eye,
  AlertCircle,
  Loader2,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useEncryption } from '../../hooks/useEncryption';
import { getDocumentPreview } from '../../services/documentPreview';
import { base64ToUint8Array, deriveKey, uint8ArrayToBase64, decryptFile } from '../../utils/encryption';
import { SecurePDFViewer } from './SecurePDFViewer';
import { UniversalFileViewer } from './UniversalFileViewer';

interface SharedDocumentPreviewProps {
  shareToken: string;
  document: {
    id: number;
    name: string;
    mime_type: string;
    file_size: number;
  };
  isOpen: boolean;
  onClose: () => void;
  onDownload?: () => void;
  className?: string;
  sharePassword?: string;
  permissions?: string[]; // Array of permissions: ['read', 'download', 'comment']
}

interface PreviewState {
  isLoading: boolean;
  error: string | null;
  previewUrl: string | null;
  zoom: number;
  isFullscreen: boolean;
  isDecrypting: boolean;
  needsPassword: boolean;
  decryptedBlob: Blob | null;
  pluginResult: any | null;
  isGeneratingPreview: boolean;
  useStreaming: boolean;
}

export const SharedDocumentPreview: React.FC<SharedDocumentPreviewProps> = ({
  shareToken,
  document,
  isOpen,
  onClose,
  onDownload,
  className = '',
  sharePassword,
  permissions = []
}) => {
  const [state, setState] = useState<PreviewState>({
    isLoading: false,
    error: null,
    previewUrl: null,
    zoom: 100,
    isFullscreen: false,
    isDecrypting: false,
    needsPassword: false,
    decryptedBlob: null,
    pluginResult: null,
    isGeneratingPreview: false,
    useStreaming: false
  });

  // Use encryption hook for zero-knowledge decryption, but don't load user keys
  const { decryptDownloadedFile, keys } = useEncryption({ loadKeysOnMount: false });

  const updateState = useCallback((updates: Partial<PreviewState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Detect if we should use streaming approach (for external shares)
  useEffect(() => {
    // Use streaming if this is an external share (no user keys loaded)
    const shouldUseStreaming = !keys && sharePassword;
    updateState({ useStreaming: shouldUseStreaming });
  }, [keys, sharePassword, updateState]);

  const loadPreview = useCallback(async () => {
    if (!shareToken) {
      updateState({ error: 'Preview not available - invalid share token', isLoading: false });
      return;
    }

    updateState({ isLoading: true, error: null, isDecrypting: false, isGeneratingPreview: false });

    try {
      console.log('📄 Fetching shared document from preview endpoint...');
      const apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl) {
        updateState({ error: 'API URL is not configured. Please check your environment variables.', isLoading: false });
        return;
      }

      const previewUrl = `${apiUrl}/api/v1/shares/${shareToken}/preview${sharePassword ? `?password=${encodeURIComponent(sharePassword)}` : ''}`;
      const response = await fetch(previewUrl);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch preview' }));
        console.error("DEBUG: Raw error data from backend:", errorData);

        let errorMessage = 'An unknown error occurred while fetching the preview.';
        if (typeof errorData === 'object' && errorData !== null) {
            errorMessage = 
                errorData.message || 
                (typeof errorData.detail === 'string' ? errorData.detail : null) ||
                (typeof errorData.detail === 'object' && errorData.detail !== null ? errorData.detail.message : null) ||
                JSON.stringify(errorData);
        }
        throw new Error(errorMessage);
      }

      const requiresDecryption = response.headers.get('X-Requires-Decryption') === 'true';
      const isDecrypted = response.headers.get('X-Decrypted') === 'true';
      let documentBlob = await response.blob();

      if (isDecrypted) {
        // Server already decrypted the content for us
        console.log('📄 Server provided decrypted content');

        // Get the MIME type from the response if available, otherwise use document MIME type
        const responseMimeType = response.headers.get('Content-Type') || document.mime_type;
        console.log(`📄 Using MIME type: ${responseMimeType}`);

        // Create a new blob with the correct MIME type
        const arrayBuffer = await documentBlob.arrayBuffer();
        documentBlob = new Blob([arrayBuffer], { type: responseMimeType });

        // Validate that we have proper content
        if (arrayBuffer.byteLength === 0) {
          throw new Error('Decrypted content is empty');
        }

        console.log(`📄 Decrypted blob size: ${documentBlob.size} bytes, type: ${documentBlob.type}`);
      } else if (requiresDecryption) {
        // Client-side decryption required
        if (!sharePassword) {
          updateState({ error: 'This document is encrypted. Please enter the password.', needsPassword: true, isLoading: false });
          return;
        }

        console.log('🔑 Decrypting document on client-side with share password...');
        updateState({ isDecrypting: true });

        const salt = response.headers.get('X-Encryption-Salt');
        const iv = response.headers.get('X-Encryption-IV');
        const iterations = parseInt(response.headers.get('X-Encryption-Iterations') || '500000', 10);

        if (!salt || !iv) {
          throw new Error('Missing encryption metadata in response headers.');
        }

        // Use direct AES-GCM decryption first for client-side decryption
        try {
          const key = await deriveKey({
            password: sharePassword,
            salt: base64ToUint8Array(salt),
            iterations: iterations,
          });

          const encryptedArray = new Uint8Array(await documentBlob.arrayBuffer());

          console.log(`🔑 Encrypted data received: ${encryptedArray.length} bytes`);
          console.log(`🔑 Using IV length: ${base64ToUint8Array(iv).length * 8} bits`);

          let decrypted: File | null = null;

          // Try different encryption formats based on the data size and structure
          if (encryptedArray.length >= 28) {  // Minimum for IV + some data + auth tag
            // Method 1: Standard AES-GCM format (IV + ciphertext + auth tag)
            try {
              console.log('🔑 Trying standard AES-GCM format...');
              const ivBytes = base64ToUint8Array(iv);
              const authTagSize = 16;

              if (encryptedArray.length >= ivBytes.length + authTagSize) {
                // Format: IV (from header) + ciphertext + auth tag (last 16 bytes)
                const ciphertext = encryptedArray.slice(0, -authTagSize);
                const authTag = encryptedArray.slice(-authTagSize);

                console.log(`🔑 Ciphertext: ${ciphertext.length} bytes, Auth tag: ${authTag.length} bytes`);

                decrypted = await decryptFile(
                  {
                    ciphertext: uint8ArrayToBase64(ciphertext),
                    iv: iv,
                    authTag: uint8ArrayToBase64(authTag),
                    key: key,
                  },
                  document.name,
                  document.mime_type
                );

                if (decrypted) {
                  console.log('✅ Standard AES-GCM format decryption successful!');
                }
              }
            } catch (format1Error) {
              console.log('❌ Standard AES-GCM format failed:', format1Error.message);
            }

            // Method 2: Combined IV + ciphertext + auth tag format
            if (!decrypted) {
              try {
                console.log('🔑 Trying combined IV + ciphertext + auth tag format...');
                const ivBytes = base64ToUint8Array(iv);
                const authTagSize = 16;

                if (encryptedArray.length >= ivBytes.length + authTagSize) {
                  // Extract IV from the beginning of the data
                  const dataIv = encryptedArray.slice(0, ivBytes.length);
                  const ciphertext = encryptedArray.slice(ivBytes.length, -authTagSize);
                  const authTag = encryptedArray.slice(-authTagSize);

                  console.log(`🔑 Data IV: ${dataIv.length} bytes, Ciphertext: ${ciphertext.length} bytes, Auth tag: ${authTag.length} bytes`);

                  // Use the data IV instead of the header IV
                  decrypted = await decryptFile(
                    {
                      ciphertext: uint8ArrayToBase64(ciphertext),
                      iv: uint8ArrayToBase64(dataIv),
                      authTag: uint8ArrayToBase64(authTag),
                      key: key,
                    },
                    document.name,
                    document.mime_type
                  );

                  if (decrypted) {
                    console.log('✅ Combined format decryption successful!');
                  }
                }
              } catch (format2Error) {
                console.log('❌ Combined format failed:', format2Error.message);
              }
            }
          }

          if (!decrypted) {
            throw new Error(`Unable to decrypt document. Tried multiple encryption formats but none succeeded. Data size: ${encryptedArray.length} bytes.`);
          }

          if (!decrypted) {
            throw new Error('Decryption failed. The password may be incorrect.');
          }

          // Basic validation - check if decrypted content looks reasonable
          const decryptedBuffer = await decrypted.arrayBuffer();
          const view = new Uint8Array(decryptedBuffer);

          // For PDFs, check PDF signature
          if (document.mime_type === 'application/pdf' && view.length > 4) {
            const pdfSig = String.fromCharCode(view[0]) + String.fromCharCode(view[1]) + String.fromCharCode(view[2]) + String.fromCharCode(view[3]);
            if (pdfSig !== '%PDF') {
              throw new Error('Decryption succeeded but output is not a valid PDF file.');
            }
          }

          // For DOCX, check ZIP signature
          if (document.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && view.length > 1) {
            if (view[0] !== 0x50 || view[1] !== 0x4B) {
              throw new Error('Decryption succeeded but output is not a valid DOCX (ZIP) file.');
            }
          }

          // Use the decrypted file's type which should match the original document MIME type
          const finalMimeType = decrypted.type || document.mime_type;
          console.log(`📄 Client-side decrypted blob size: ${decryptedBuffer.byteLength} bytes, type: ${finalMimeType}`);
          documentBlob = new Blob([decryptedBuffer], { type: finalMimeType });
        } catch (error: any) {
          updateState({ error: error.message, isLoading: false, isDecrypting: false });
          return;
        }
      }

      // If it's a PDF, we can display it directly
      if (documentBlob.type === 'application/pdf') {
        console.log('📄 PDF detected, creating direct blob URL for preview...');
        const pdfUrl = URL.createObjectURL(documentBlob);
        updateState({
          previewUrl: pdfUrl,
          isLoading: false,
          isGeneratingPreview: false,
        });
        return; // Skip the plugin system for PDFs
      }

      console.log('🖼️ Generating document preview...');
      updateState({ isDecrypting: false, isGeneratingPreview: true });

      const previewResult = await getDocumentPreview(documentBlob, document.name, document.mime_type);

      if (previewResult.type === 'success') {
        updateState({
          pluginResult: previewResult,
          previewUrl: previewResult.format === 'html' ? URL.createObjectURL(new Blob([previewResult.content], { type: 'text/html' })) : previewResult.content,
          isLoading: false,
          isGeneratingPreview: false,
        });
      } else {
        throw new Error(previewResult.error || 'Failed to generate preview.');
      }

    } catch (error: any) {
      console.error('❌ Shared document preview failed:', error);
      updateState({
        error: error.message || 'Failed to load preview. Please try again.',
        isLoading: false,
        isDecrypting: false,
        isGeneratingPreview: false,
      });
    }
  }, [shareToken, document, sharePassword, permissions, updateState, getDocumentPreview]);

  useEffect(() => {
    if (isOpen) {
      loadPreview();
    }

    return () => {
      // Clean up object URL when component unmounts
      if (state.previewUrl && state.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(state.previewUrl);
      }
    };
  }, [isOpen, loadPreview]);

  const handleZoomIn = useCallback(() => {
    updateState({ zoom: Math.min(state.zoom + 25, 300) });
  }, [state.zoom, updateState]);

  const handleZoomOut = useCallback(() => {
    updateState({ zoom: Math.max(state.zoom - 25, 25) });
  }, [state.zoom, updateState]);

  const toggleFullscreen = useCallback(() => {
    updateState({ isFullscreen: !state.isFullscreen });
  }, [state.isFullscreen, updateState]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${className}`}>
      <div className={`bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col ${
        state.isFullscreen ? 'fixed inset-4' : 'mx-4'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Eye className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {document.name}
              </h3>
              <p className="text-sm text-gray-500">
                {document.mime_type} • {(document.file_size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {state.previewUrl && document.mime_type?.startsWith('image/') && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 px-2">
                  {state.zoom}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </>
            )}

            {state.previewUrl && (
              <button
                onClick={toggleFullscreen}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title={state.isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {state.isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}

            {onDownload && (
              <button
                onClick={onDownload}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                title="Download"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-50">
          {/* Streaming Viewer for External Shares */}
          {state.useStreaming && !state.isLoading && !state.error && (
            <div className="h-full">
              {document.mime_type === 'application/pdf' ? (
                <SecurePDFViewer
                  shareToken={shareToken}
                  password={sharePassword}
                  fileName={document.name}
                  onError={(error) => updateState({ error: error.message })}
                />
              ) : (
                <UniversalFileViewer
                  shareToken={shareToken}
                  password={sharePassword}
                  document={{
                    id: document.id,
                    name: document.name,
                    mime_type: document.mime_type,
                    size: document.file_size
                  }}
                />
              )}
            </div>
          )}

          {/* Traditional Viewer for Internal Shares */}
          {!state.useStreaming && (state.isLoading || state.isDecrypting || state.isGeneratingPreview) && !state.pluginResult && (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
                <p className="text-gray-600">
                  {state.isDecrypting ? 'Decrypting shared document...' :
                   state.isGeneratingPreview ? 'Generating preview...' :
                   'Loading preview...'}
                </p>
                {state.isDecrypting && (
                  <p className="text-gray-500 text-sm mt-2">
                    Please wait while we process the encrypted document
                  </p>
                )}
              </div>
            </div>
          )}

          {state.error && (
            <div className="flex items-center justify-center h-96">
              <div className="text-center max-w-md">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Preview Not Available</h3>
                <p className="text-gray-600 mb-4">{state.error}</p>

                {/* Show document info instead of preview */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                  <h4 className="font-semibold text-gray-900 mb-2">{document.name}</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Type:</strong> {document.mime_type}</p>
                    <p><strong>Size:</strong> {(document.file_size / 1024).toFixed(1)} KB</p>
                    <p><strong>Format:</strong> {document.name.split('.').pop()?.toUpperCase() || 'Unknown'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={loadPreview}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Try Preview Again
                  </button>
                  {onDownload && (
                    <button
                      onClick={onDownload}
                      className="block w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Download Document
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Plugin Result Display - Priority Rendering */}
          {state.pluginResult && (
            <div className="flex-1 overflow-auto">
              {state.pluginResult.type === 'success' ? (
                <div className="w-full h-full">
                  {state.pluginResult.format === 'html' ? (
                    <div
                      dangerouslySetInnerHTML={{ __html: state.pluginResult.content }}
                      className="w-full h-full"
                    />
                  ) : state.pluginResult.format === 'image' ? (
                    <div className="flex items-center justify-center min-h-96 p-4">
                      <div
                        style={{
                          transform: `scale(${state.zoom / 100})`,
                          transition: 'transform 0.2s ease'
                        }}
                      >
                        <img
                          src={state.pluginResult.dataUrl || `data:image/png;base64,${state.pluginResult.content}`}
                          alt={document.name}
                          className="max-w-full max-h-96 object-contain border border-gray-200 rounded-lg shadow-sm"
                          onError={() => {
                            updateState({ error: 'Failed to display plugin-generated image' });
                          }}
                        />
                      </div>
                    </div>
                  ) : state.pluginResult.format === 'text' ? (
                    <div className="p-6">
                      <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
                        <pre className="whitespace-pre-wrap">{state.pluginResult.content}</pre>
                      </div>
                    </div>
                  ) : null}
                  {state.pluginResult.metadata?.processingTime && (
                    <div className="text-xs text-gray-400 p-2 border-t">
                      Plugin: {state.pluginResult.metadata.pluginName} •
                      Processed in {state.pluginResult.metadata.processingTime}
                      {state.pluginResult.metadata.isSharedDocument && ' • Shared Document'}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center min-h-64 p-6">
                  <div className="text-center max-w-2xl">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h3 className="text-xl font-semibold mb-3 text-orange-600">
                      Plugin Preview Failed
                    </h3>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 text-left">
                      <p className="text-orange-800 font-medium mb-4">
                        {state.pluginResult.error || 'Failed to generate preview'}
                      </p>
                      {state.pluginResult.content && (
                        <div dangerouslySetInnerHTML={{ __html: state.pluginResult.content }} />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fallback to URL-based preview when no plugin result */}
          {!state.pluginResult && state.previewUrl && !state.isLoading && !state.error && (
            <div className="flex items-center justify-center min-h-96">
              {document.mime_type?.startsWith('image/') ? (
                // Image preview with zoom controls
                <div className="p-4">
                  <img
                    src={state.previewUrl}
                    alt={document.name}
                    className="max-w-full max-h-full object-contain border border-gray-200 rounded-lg shadow-sm"
                    style={{
                      transform: `scale(${state.zoom / 100})`,
                      transformOrigin: 'center',
                      transition: 'transform 0.2s ease'
                    }}
                    onLoad={() => console.log('✅ Image loaded successfully')}
                    onError={(e) => {
                      console.error('❌ Image failed to load:', e);
                      updateState({ error: 'Failed to display image' });
                    }}
                  />
                </div>
              ) : (
                // Document preview with proper iframe security
                <div className="w-full h-full">
                  <iframe
                    src={state.previewUrl}
                    className="w-full h-96 border border-gray-200 rounded-lg"
                    title={`Preview of ${document.name}`}
                    sandbox="allow-scripts allow-same-origin allow-forms"
                    onLoad={() => console.log('✅ Document preview loaded successfully')}
                    onError={(e) => {
                      console.error('❌ Document preview failed to load:', e);
                      updateState({ error: 'Failed to display document preview' });
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharedDocumentPreview;