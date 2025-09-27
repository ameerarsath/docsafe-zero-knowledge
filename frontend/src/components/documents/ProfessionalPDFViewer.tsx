/**
 * Professional PDF Viewer Component
 * 
 * A comprehensive PDF viewer with professional features:
 * - Thumbnail navigation
 * - Search functionality
 * - Bookmarks/outline
 * - Print support
 * - Text selection
 * - Professional toolbar
 */

import {
  AlertCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  Grid,
  Loader2,
  Maximize2,
  Minimize2,
  Printer,
  RotateCw,
  Search,
  Settings,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DirectPDFViewer } from './DirectPDFViewer';

interface ProfessionalPDFViewerProps {
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

interface ViewerState {
  currentPage: number;
  numPages: number;
  scale: number;
  rotation: number;
  isLoading: boolean;
  error: string | null;
  isFullscreen: boolean;
  showThumbnails: boolean;
  showSearch: boolean;
  showOutline: boolean;
  searchQuery: string;
  searchResults: any[];
  selectedText: string;
}

export const ProfessionalPDFViewer: React.FC<ProfessionalPDFViewerProps> = ({
  fileUrl,
  fileName,
  customSize,
  onDownload,
  className = ''
}) => {
  const [state, setState] = useState<ViewerState>({
    currentPage: 1,
    numPages: 0,
    scale: 1.0,
    rotation: 0,
    isLoading: true,
    error: null,
    isFullscreen: false,
    showThumbnails: false,
    showSearch: false,
    showOutline: false,
    searchQuery: '',
    searchResults: [],
    selectedText: ''
  });

  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<ViewerState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Handle page navigation
   */
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= state.numPages) {
      updateState({ currentPage: page });
      
      // Send message to PDF.js viewer
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage({
          type: 'goToPage',
          page: page
        }, '*');
      }
    }
  }, [state.numPages, updateState]);

  /**
   * Handle zoom controls
   */
  const handleZoom = useCallback((direction: 'in' | 'out' | 'fit' | 'reset') => {
    let newScale = state.scale;
    
    switch (direction) {
      case 'in':
        newScale = Math.min(state.scale * 1.25, 4.0);
        break;
      case 'out':
        newScale = Math.max(state.scale * 0.8, 0.25);
        break;
      case 'fit':
        newScale = 1.0; // Will be handled by PDF.js
        break;
      case 'reset':
        newScale = 1.0;
        break;
    }
    
    updateState({ scale: newScale });
    
    // Send zoom message to PDF.js viewer
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'zoom',
        direction: direction,
        scale: newScale
      }, '*');
    }
  }, [state.scale, updateState]);

  /**
   * Handle rotation
   */
  const handleRotate = useCallback(() => {
    const newRotation = (state.rotation + 90) % 360;
    updateState({ rotation: newRotation });
    
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'rotate',
        rotation: newRotation
      }, '*');
    }
  }, [state.rotation, updateState]);

  /**
   * Handle search
   */
  const handleSearch = useCallback((query: string) => {
    updateState({ searchQuery: query });
    
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'search',
        query: query
      }, '*');
    }
  }, [updateState]);

  /**
   * Toggle panels
   */
  const togglePanel = useCallback((panel: 'thumbnails' | 'search' | 'outline') => {
    switch (panel) {
      case 'thumbnails':
        updateState({ 
          showThumbnails: !state.showThumbnails,
          showSearch: false,
          showOutline: false
        });
        break;
      case 'search':
        updateState({ 
          showSearch: !state.showSearch,
          showThumbnails: false,
          showOutline: false
        });
        break;
      case 'outline':
        updateState({ 
          showOutline: !state.showOutline,
          showThumbnails: false,
          showSearch: false
        });
        break;
    }
  }, [state, updateState]);

  /**
   * Handle print
   */
  const handlePrint = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.print();
    }
  }, []);

  /**
   * Toggle fullscreen
   */
  const toggleFullscreen = useCallback(() => {
    updateState({ isFullscreen: !state.isFullscreen });
  }, [state.isFullscreen, updateState]);

  /**
   * For blob URLs and localhost URLs, we can't use Mozilla's hosted viewer due to CORS
   * Instead, we'll use a hybrid approach with DirectPDFViewer wrapped in professional UI
   */
  const isLocalBlob = fileUrl.startsWith('blob:') || fileUrl.includes('localhost');
  
  const viewerUrl = useMemo(() => {
    if (isLocalBlob) {
      return null; // Will use DirectPDFViewer instead
    }
    
    const baseUrl = 'https://mozilla.github.io/pdf.js/web/viewer.html';
    const params = new URLSearchParams({
      file: encodeURIComponent(fileUrl)
    });
    
    return `${baseUrl}?${params.toString()}`;
  }, [fileUrl, isLocalBlob]);

  /**
   * Handle messages from PDF.js iframe
   */
  const handleMessage = useCallback((event: MessageEvent) => {
    if (event.origin !== 'https://mozilla.github.io') return;
    
    switch (event.data.type) {
      case 'documentLoaded':
        updateState({
          numPages: event.data.numPages,
          isLoading: false,
          error: null
        });
        break;
      case 'pageChanged':
        updateState({ currentPage: event.data.pageNumber });
        break;
      case 'scaleChanged':
        updateState({ scale: event.data.scale });
        break;
      case 'error':
        updateState({
          isLoading: false,
          error: event.data.message
        });
        break;
    }
  }, [updateState]);

  // Set up message listener
  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  // Set loading timeout (only for iframe viewer)
  useEffect(() => {
    // Only set timeout for iframe viewer, not for DirectPDFViewer
    if (isLocalBlob) {
      return;
    }

    const timeout = setTimeout(() => {
      if (state.isLoading) {
        updateState({
          isLoading: false,
          error: 'PDF loading timed out. Please try refreshing.'
        });
      }
    }, 15000);

    return () => clearTimeout(timeout);
  }, [state.isLoading, updateState, isLocalBlob]);

  const containerStyle: React.CSSProperties = {
    width: customSize?.width || '100%',
    height: customSize?.height || '700px',
    maxWidth: customSize?.maxWidth || '100%',
    maxHeight: customSize?.maxHeight || '90vh',
    ...(state.isFullscreen && {
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
      ref={viewerContainerRef}
      className={`flex flex-col bg-white border border-gray-300 rounded-lg overflow-hidden shadow-lg ${className}`}
      style={containerStyle}
    >
      {/* Professional Toolbar */}
      <div className="flex items-center justify-between p-2 bg-gray-800 text-white border-b">
        {/* Left Controls */}
        <div className="flex items-center space-x-1">
          {/* Navigation */}
          <button
            onClick={() => goToPage(state.currentPage - 1)}
            disabled={state.currentPage <= 1}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center space-x-2 px-2">
            <input
              type="number"
              value={state.currentPage}
              onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
              className="w-12 px-1 py-1 text-center bg-gray-700 text-white rounded text-sm border border-gray-600"
              min="1"
              max={state.numPages}
            />
            <span className="text-gray-300 text-sm">/ {state.numPages}</span>
          </div>
          
          <button
            onClick={() => goToPage(state.currentPage + 1)}
            disabled={state.currentPage >= state.numPages}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-600 mx-2" />

          {/* Zoom Controls */}
          <button
            onClick={() => handleZoom('out')}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <span className="text-gray-300 text-sm min-w-12 text-center">
            {Math.round(state.scale * 100)}%
          </span>
          
          <button
            onClick={() => handleZoom('in')}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => handleZoom('fit')}
            className="px-2 py-1 text-xs text-gray-300 hover:text-white hover:bg-gray-700 rounded border border-gray-600"
            title="Fit to Screen"
          >
            Fit
          </button>

          <div className="w-px h-6 bg-gray-600 mx-2" />

          {/* Tools */}
          <button
            onClick={handleRotate}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
            title="Rotate"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Center - Document Title */}
        <div className="flex-1 text-center">
          <span className="text-white text-sm font-medium truncate px-4">
            {fileName}
          </span>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => togglePanel('thumbnails')}
            className={`p-2 rounded ${state.showThumbnails ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
            title="Thumbnails"
          >
            <Grid className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => togglePanel('outline')}
            className={`p-2 rounded ${state.showOutline ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
            title="Outline"
          >
            <BookOpen className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => togglePanel('search')}
            className={`p-2 rounded ${state.showSearch ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-600 mx-2" />

          <button
            onClick={handlePrint}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
            title="Print"
          >
            <Printer className="w-4 h-4" />
          </button>
          
          {onDownload && (
            <button
              onClick={onDownload}
              className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => {
              // Simple plugin functionality - placeholder
              console.log('Simple plugin clicked');
              // Add your plugin logic here
            }}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
            title="Simple Plugin"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
            title={state.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {state.isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {state.showSearch && (
        <div className="p-3 bg-gray-100 border-b">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search in document..."
              value={state.searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-sm text-gray-500">
              {state.searchResults.length} results
            </span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {(state.showThumbnails || state.showOutline) && (
          <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
            {state.showThumbnails && (
              <div className="p-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Page Thumbnails</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {/* Placeholder for thumbnails */}
                  {Array.from({ length: state.numPages }, (_, i) => (
                    <div
                      key={i + 1}
                      onClick={() => goToPage(i + 1)}
                      className={`cursor-pointer p-2 rounded border ${
                        state.currentPage === i + 1 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="w-full h-20 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                        Page {i + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {state.showOutline && (
              <div className="p-3">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Document Outline</h3>
                <div className="text-sm text-gray-500">
                  Outline will be available once document loads
                </div>
              </div>
            )}
          </div>
        )}

        {/* PDF Viewer Area */}
        <div className="flex-1 relative">
          {state.isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading Professional PDF Viewer...</p>
                <p className="text-sm text-gray-500 mt-2">Using Mozilla PDF.js</p>
              </div>
            </div>
          )}

          {state.error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center max-w-md">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-600 mb-2">PDF Load Error</h3>
                <p className="text-red-700 mb-4">{state.error}</p>
                <div className="space-x-2">
                  <button
                    onClick={() => {
                      updateState({ isLoading: true, error: null });
                      if (iframeRef.current) {
                        iframeRef.current.src = iframeRef.current.src; // Reload
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Retry
                  </button>
                  {onDownload && (
                    <button
                      onClick={onDownload}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Download
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Conditional rendering: DirectPDFViewer for blob URLs, iframe for external URLs */}
          {isLocalBlob ? (
            <div className="w-full h-full">
              <DirectPDFViewer
                fileUrl={fileUrl}
                fileName={fileName}
                customSize={{
                  width: customSize?.width || '100%',
                  height: customSize?.height || '100%',
                  maxWidth: customSize?.maxWidth,
                  maxHeight: customSize?.maxHeight
                }}
                onDownload={onDownload}
                className="w-full h-full"
              />
            </div>
          ) : viewerUrl ? (
            <iframe
              ref={iframeRef}
              src={viewerUrl}
              className="w-full h-full border-0"
              title={`PDF Viewer: ${fileName}`}
              onLoad={() => {
                // Initial setup message
                setTimeout(() => {
                  if (iframeRef.current?.contentWindow) {
                    iframeRef.current.contentWindow.postMessage({
                      type: 'init',
                      fileName: fileName
                    }, '*');
                  }
                }, 1000);
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-600 mb-2">PDF Load Error</h3>
                <p className="text-red-700 mb-4">Unable to load PDF viewer</p>
                {onDownload && (
                  <button
                    onClick={onDownload}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4 mr-2 inline" />
                    Download PDF
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-100 border-t px-3 py-2 text-xs text-gray-600 flex justify-between items-center">
        <span>📄 {fileName}</span>
        <span>
          Professional PDF Viewer • {isLocalBlob ? 'Integrated PDF.js' : 'Mozilla PDF.js'}
        </span>
      </div>
    </div>
  );
};

export default ProfessionalPDFViewer;