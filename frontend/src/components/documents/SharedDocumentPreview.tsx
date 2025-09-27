/**
 * Shared Document Preview Component
 * Specialized component for previewing shared documents using the shares API
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
}

interface PreviewState {
  isLoading: boolean;
  error: string | null;
  previewUrl: string | null;
  zoom: number;
  isFullscreen: boolean;
}

export const SharedDocumentPreview: React.FC<SharedDocumentPreviewProps> = ({
  shareToken,
  document,
  isOpen,
  onClose,
  onDownload,
  className = '',
  sharePassword
}) => {
  const [state, setState] = useState<PreviewState>({
    isLoading: false,
    error: null,
    previewUrl: null,
    zoom: 100,
    isFullscreen: false
  });

  const updateState = useCallback((updates: Partial<PreviewState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const loadPreview = useCallback(async () => {
    if (!shareToken) {
      updateState({
        error: 'Preview not available - invalid share token',
        isLoading: false
      });
      return;
    }

    updateState({ isLoading: true, error: null });

    try {
      console.log('📄 Loading shared document preview:', { shareToken, fileName: document.name, mimeType: document.mime_type });

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8002'}/api/v1/shares/${shareToken}/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: sharePassword || null
        })
      });

      console.log('📊 Preview response status:', response.status);
      console.log('📊 Preview response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const contentType = response.headers.get('content-type');

        if (contentType?.startsWith('image/')) {
          // Handle image files
          const imageBlob = await response.blob();
          console.log('✅ Received image blob:', { size: imageBlob.size, type: imageBlob.type });

          const objectUrl = URL.createObjectURL(imageBlob);
          updateState({
            previewUrl: objectUrl,
            isLoading: false,
            error: null
          });

          // Clean up object URL after component unmounts
          return () => URL.revokeObjectURL(objectUrl);
        } else if (contentType?.includes('text/html') || contentType?.includes('application/json')) {
          // Handle processed document content (HTML preview from backend)
          const textContent = await response.text();
          console.log('✅ Received document preview content');

          updateState({
            previewUrl: `data:text/html;charset=utf-8,${encodeURIComponent(textContent)}`,
            isLoading: false,
            error: null
          });
        } else {
          // Handle other content types
          const blob = await response.blob();
          const objectUrl = URL.createObjectURL(blob);

          updateState({
            previewUrl: objectUrl,
            isLoading: false,
            error: null
          });

          return () => URL.revokeObjectURL(objectUrl);
        }
      } else {
        // Got error response - handle structured error format like SharedDocumentPage
        const errorData = await response.json();
        console.error('❌ Preview failed:', errorData);

        // Enhanced error message extraction to handle structured responses
        let errorMessage = 'Failed to load image preview';

        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (typeof errorData === 'object' && errorData !== null) {
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.detail) {
            // Handle nested detail objects like our API error format
            if (typeof errorData.detail === 'object' && errorData.detail.message) {
              errorMessage = errorData.detail.message;
            } else if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail;
            }
          }
        }

        updateState({
          error: errorMessage,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('❌ Preview request failed:', error);
      updateState({
        error: 'Failed to load preview. Please try downloading the file.',
        isLoading: false
      });
    }
  }, [shareToken, document, sharePassword, updateState]);

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
          {state.isLoading && (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
                <p className="text-gray-600">Loading preview...</p>
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

          {state.previewUrl && !state.isLoading && !state.error && (
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
                // Document preview (HTML content from backend processing)
                <div className="w-full h-full">
                  <iframe
                    src={state.previewUrl}
                    className="w-full h-96 border border-gray-200 rounded-lg"
                    title={`Preview of ${document.name}`}
                    sandbox="allow-same-origin"
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