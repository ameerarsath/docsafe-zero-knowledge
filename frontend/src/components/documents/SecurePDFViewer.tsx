/**
 * Secure PDF Viewer Component
 *
 * A secure PDF viewer that uses direct HTTP streaming instead of blob URLs
 * to avoid Chrome's security restrictions on blob URLs in external shares.
 */

import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Download, Loader2, Maximize2, Minimize2 } from 'lucide-react';

interface SecurePDFViewerProps {
  shareToken: string;
  password?: string;
  fileName: string;
  className?: string;
  onError?: (error: Error) => void;
}

export const SecurePDFViewer: React.FC<SecurePDFViewerProps> = ({
  shareToken,
  password,
  fileName,
  className = '',
  onError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build the streaming URL
  const streamUrl = `http://localhost:8000/share/${shareToken}/stream${password ? `?password=${encodeURIComponent(password)}` : ''}`;

  // Build the download URL
  const downloadUrl = `http://localhost:8000/share/${shareToken}/stream?download=true${password ? `&password=${encodeURIComponent(password)}` : ''}`;

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    // Preload the PDF to check if it's accessible
    const checkPdfAccessibility = async () => {
      try {
        const response = await fetch(streamUrl, {
          method: 'HEAD',
          mode: 'cors',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType !== 'application/pdf') {
          throw new Error('The shared file is not a PDF');
        }

        setIsLoading(false);
      } catch (err) {
        const error = err as Error;
        setError(error.message);
        setIsLoading(false);
        onError?.(error);
      }
    };

    checkPdfAccessibility();
  }, [streamUrl, onError]);

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
    setError('Failed to load PDF. The file may be corrupted or access denied.');
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] bg-gray-50 ${className}`}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] bg-gray-50 ${className}`}>
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Display PDF</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </button>
          </div>
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
              title="Download PDF"
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

      {/* PDF iframe */}
      <iframe
        ref={iframeRef}
        src={streamUrl}
        className="w-full h-full border-0"
        style={{
          height: isFullscreen ? '100vh' : '600px',
          marginTop: '0'
        }}
        title={fileName}
        onError={handleIframeError}
        sandbox="allow-same-origin allow-scripts allow-forms"
        allow="fullscreen"
      />
    </div>
  );
};

export default SecurePDFViewer;