/**
 * External Share Viewer Component
 *
 * Handles preview and download for all file types in external shares
 * with special support for CSV files using the CSV preview plugin.
 */

import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Download, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { CSVPreviewPlugin } from '../../services/documentPreview/plugins/csvPlugin';

interface ExternalShareViewerProps {
  shareToken: string;
  password?: string;
  fileName: string;
  mimeType: string;
  className?: string;
  onError?: (error: Error) => void;
}

interface PreviewResult {
  type: 'success' | 'error';
  format: 'html' | 'text' | 'pdf' | 'image';
  content?: string;
  error?: string;
  metadata?: {
    title: string;
    creator: string;
  };
}

export const ExternalShareViewer: React.FC<ExternalShareViewerProps> = ({
  shareToken,
  password,
  fileName,
  mimeType,
  className = '',
  onError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const baseUrl = 'http://localhost:8000';
  const streamUrl = `${baseUrl}/share/${shareToken}/stream${password ? `?password=${encodeURIComponent(password)}` : ''}`;
  const downloadUrl = `${baseUrl}/share/${shareToken}/stream?download=true${password ? `&password=${encodeURIComponent(password)}` : ''}`;

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setPreviewData(null);

    const loadFileContent = async () => {
      try {
        // Check if file is accessible
        const response = await fetch(streamUrl, {
          method: 'GET',
          mode: 'cors',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Handle different file types
        if (mimeType === 'text/csv' || fileName.toLowerCase().endsWith('.csv')) {
          // For CSV files, use the CSV preview plugin
          const blob = await response.blob();
          const csvPlugin = new CSVPreviewPlugin();
          const result = await csvPlugin.preview(blob, fileName, mimeType);
          setPreviewData(result);
        } else {
          // For other files, set up direct viewing
          setPreviewData({
            type: 'success',
            format: mimeType === 'application/pdf' ? 'pdf' :
                   mimeType.startsWith('image/') ? 'image' : 'text',
            content: streamUrl
          });
        }

        setIsLoading(false);
      } catch (err) {
        const error = err as Error;
        setError(error.message);
        setIsLoading(false);
        onError?.(error);
      }
    };

    loadFileContent();
  }, [streamUrl, fileName, mimeType, onError]);

  const handleDownload = () => {
    window.open(downloadUrl, '_blank');
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleIframeError = () => {
    setError('Failed to load file. The file may be corrupted or access denied.');
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] bg-gray-50 ${className}`}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">Loading file...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] bg-gray-50 ${className}`}>
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Display File</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Download File
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] bg-gray-50 ${className}`}>
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600">Preview not available</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative bg-white ${className}`}>
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-white text-sm font-medium truncate max-w-xs">
              {fileName}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="p-2 text-white hover:bg-white/20 rounded-md transition-colors"
              title="Download File"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 text-white hover:bg-white/20 rounded-md transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="pt-16">
        {previewData.type === 'success' && previewData.format === 'html' && previewData.content && (
          // For CSV files - render the HTML from the CSV plugin
          <div
            className="w-full"
            style={{ height: isFullscreen ? 'calc(100vh - 80px)' : '600px' }}
            dangerouslySetInnerHTML={{ __html: previewData.content }}
          />
        )}

        {previewData.type === 'success' && previewData.format === 'pdf' && previewData.content && (
          // For PDF files
          <iframe
            ref={iframeRef}
            src={previewData.content}
            className="w-full border-0"
            style={{
              height: isFullscreen ? 'calc(100vh - 80px)' : '600px'
            }}
            title={fileName}
            onError={handleIframeError}
            sandbox="allow-same-origin allow-scripts allow-forms"
            allow="fullscreen"
          />
        )}

        {previewData.type === 'success' && previewData.format === 'image' && previewData.content && (
          // For image files
          <div className="flex items-center justify-center bg-gray-50 p-4" style={{ height: isFullscreen ? 'calc(100vh - 80px)' : '600px' }}>
            <img
              src={previewData.content}
              alt={fileName}
              className="max-w-full max-h-full object-contain"
              onError={handleIframeError}
            />
          </div>
        )}

        {previewData.type === 'success' && previewData.format === 'text' && previewData.content && (
          // For text files (non-CSV)
          <iframe
            ref={iframeRef}
            src={previewData.content}
            className="w-full border-0 font-mono text-sm"
            style={{
              height: isFullscreen ? 'calc(100vh - 80px)' : '600px'
            }}
            title={fileName}
            onError={handleIframeError}
            sandbox="allow-same-origin"
          />
        )}

        {previewData.type === 'error' && (
          <div className="flex items-center justify-center min-h-[400px] bg-gray-50">
            <div className="text-center max-w-md">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Preview Error</h3>
              <p className="text-gray-600 mb-4">{previewData.error}</p>
              <button
                onClick={handleDownload}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Download File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExternalShareViewer;