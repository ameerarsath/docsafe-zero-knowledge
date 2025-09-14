/**
 * Simple PDF Viewer - Emergency Fallback
 * 
 * Uses object embed approach with complete control over sizing
 * No PDF.js, no workers, no external dependencies
 */

import React, { useState, useCallback } from 'react';
import { 
  Download,
  Maximize2,
  Minimize2,
  AlertCircle,
  Eye
} from 'lucide-react';

interface SimplePDFViewerProps {
  fileUrl: string;
  fileName: string;
  customSize?: {
    width?: string | number;
    height?: string | number;
    maxWidth?: string | number;
    maxHeight?: string | number;
  };
  onDownload?: () => void;
  className?: string;
}

export const SimplePDFViewer: React.FC<SimplePDFViewerProps> = ({
  fileUrl,
  fileName,
  customSize,
  onDownload,
  className = ''
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  const containerStyle: React.CSSProperties = {
    width: customSize?.width || '100%',
    height: customSize?.height || '600px',
    maxWidth: customSize?.maxWidth || '100%',
    maxHeight: customSize?.maxHeight || '90vh',
    ...(isFullscreen && {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
      maxHeight: '100vh',
      zIndex: 9999,
      backgroundColor: 'white'
    })
  };

  return (
    <div 
      className={`flex flex-col bg-gray-50 border border-gray-200 rounded-lg overflow-hidden ${className}`}
      style={containerStyle}
    >
      {/* Simple Header */}
      <div className="flex items-center justify-between p-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Eye className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 truncate max-w-xs">
              {fileName}
            </h3>
            <p className="text-xs text-gray-500">Simple PDF Viewer</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-600 hover:text-gray-800 rounded hover:bg-gray-100"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          
          {onDownload && (
            <button
              onClick={onDownload}
              className="p-2 text-gray-600 hover:text-gray-800 rounded hover:bg-gray-100"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* PDF Content */}
      <div className="flex-1 bg-white p-2">
        {!hasError ? (
          <object
            data={fileUrl}
            type="application/pdf"
            className="w-full h-full border border-gray-300 rounded"
            style={{
              minHeight: '400px'
            }}
            onError={() => setHasError(true)}
          >
            <embed
              src={fileUrl}
              type="application/pdf"
              className="w-full h-full border border-gray-300 rounded"
              style={{
                minHeight: '400px'
              }}
            />
            
            {/* Fallback if neither object nor embed work */}
            <div className="flex flex-col items-center justify-center h-full min-h-96 p-8">
              <div className="text-center max-w-md">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">PDF Preview</h3>
                <p className="text-gray-600 mb-4">
                  Your browser doesn't support PDF embedding. Please download the file to view it.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>File:</strong> {fileName}
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>Type:</strong> PDF Document
                  </p>
                </div>
                {onDownload && (
                  <button
                    onClick={onDownload}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </button>
                )}
              </div>
            </div>
          </object>
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-96 p-8">
            <AlertCircle className="w-12 h-12 text-orange-500 mb-4" />
            <h3 className="text-lg font-semibold text-orange-600 mb-2">PDF Display Issue</h3>
            <p className="text-orange-700 text-center mb-4">
              Unable to display the PDF in this browser.
            </p>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-orange-800">
                <strong>File:</strong> {fileName}
              </p>
              <p className="text-sm text-orange-800">
                This might be due to browser security settings or PDF format issues.
              </p>
            </div>
            {onDownload && (
              <button
                onClick={onDownload}
                className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </button>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-gray-200 px-3 py-2 text-xs text-gray-500 flex justify-between items-center flex-shrink-0">
        <span>📄 {fileName}</span>
        <span>Simple PDF Viewer • No Dependencies</span>
      </div>
    </div>
  );
};

export default SimplePDFViewer;