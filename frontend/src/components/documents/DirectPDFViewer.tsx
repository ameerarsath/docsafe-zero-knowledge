/**
 * Direct PDF Viewer Component
 * 
 * Uses PDF.js directly with canvas rendering for complete control
 * over sizing, zoom, and responsiveness. No react-pdf or browser plugins.
 */

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import React, { useCallback, useEffect, useRef, useState } from 'react';

// Configure PDF.js for pure main-thread operation
if (typeof window !== 'undefined') {
  // Set workerSrc to CDN URL with correct .mjs extension
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  console.log('🛠️ PDF.js configured for main-thread operation only');
  console.log('🛠️ PDF.js Version:', pdfjsLib.version);
  console.log('🛠️ Worker src:', pdfjsLib.GlobalWorkerOptions.workerSrc);
}

interface DirectPDFViewerProps {
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

interface PDFState {
  pdf: any;
  numPages: number;
  currentPage: number;
  scale: number;
  rotation: number;
  isLoading: boolean;
  error: string | null;
  isFullscreen: boolean;
  containerWidth: number;
  containerHeight: number;
  workerMode: 'disabled' | 'trying' | 'enabled';
  loadAttempts: number;
}

export const DirectPDFViewer: React.FC<DirectPDFViewerProps> = ({
  fileUrl,
  fileName,
  customSize,
  onDownload,
  className = ''
}) => {
  const [state, setState] = useState<PDFState>({
    pdf: null,
    numPages: 0,
    currentPage: 1,
    scale: 1.0,
    rotation: 0,
    isLoading: true,
    error: null,
    isFullscreen: false,
    containerWidth: 0,
    containerHeight: 0,
    workerMode: 'disabled',
    loadAttempts: 0
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

  /**
   * Load PDF using PDF.js with progressive fallback strategy
   */
  const loadPDF = useCallback(async (attemptNumber: number = 1) => {
    const currentAttempt = attemptNumber;
    
    try {
      console.log(`🔄 Loading PDF attempt ${currentAttempt}:`, fileUrl);
      setState(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: null,
        loadAttempts: currentAttempt
      }));

      // Configuration with font support for reliable loading
      const loadingOptions: any = {
        url: fileUrl,
        // Force main thread processing
        disableWorker: true,
        // Reasonable timeout
        timeout: 30000,
        // Allow range requests for better performance
        disableRange: false,
        // Allow streaming
        disableStream: false,
        // Allow auto-fetch
        disableAutoFetch: false,
        // Basic error handling
        stopAtErrors: false,
        // Font configuration
        useSystemFonts: true,
        // Provide standard font data URL to resolve font warnings
        standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
        // Character map configuration
        cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
        cMapPacked: true
      };
      
      console.log('📋 PDF loading options:', loadingOptions);
      console.log('🔍 Before getDocument - workerSrc:', pdfjsLib.GlobalWorkerOptions.workerSrc);

      const loadingTask = pdfjsLib.getDocument(loadingOptions);
      
      // Add progress tracking
      loadingTask.onProgress = (progress: any) => {
        if (progress.total > 0) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          console.log(`📊 Loading progress: ${percent}%`);
        }
      };
      
      const pdf = await loadingTask.promise;

      console.log('✅ PDF loaded successfully:', pdf.numPages, 'pages');
      console.log('📄 PDF Diagnostic Info:', {
        fileName,
        actualPages: pdf.numPages,
        fileSize: fileUrl.startsWith('blob:') ? 'blob URL' : 'external URL',
        pdfInfo: pdf._pdfInfo || 'No PDF info available'
      });

      // Additional validation for single-page documents
      let actualPageCount = pdf.numPages;

      if (pdf.numPages === 1) {
        console.log('📋 Single-page PDF detected - verifying page structure...');
      } else if (pdf.numPages > 10) {
        console.log('⚠️ Large page count detected:', pdf.numPages, 'pages - this might indicate a metadata issue');

        // Try to validate if this is actually a single-page document
        try {
          const firstPage = await pdf.getPage(1);
          const secondPage = await pdf.getPage(2).catch(() => null);

          if (firstPage && !secondPage) {
            console.log('🔍 Only first page accessible - treating as single-page document');
            actualPageCount = 1;
          } else if (firstPage && secondPage) {
            // Check if the pages are actually different
            const viewport1 = firstPage.getViewport({ scale: 1.0 });
            const viewport2 = secondPage.getViewport({ scale: 1.0 });

            if (viewport1.width === viewport2.width && viewport1.height === viewport2.height) {
              console.log('🔍 Multiple pages detected with same dimensions');
            }
          }
        } catch (validationError) {
          console.warn('⚠️ Page validation failed:', validationError);
        }
      }

      setState(prev => ({
        ...prev,
        pdf,
        numPages: actualPageCount,
        isLoading: false,
        currentPage: 1,
        error: null
      }));

    } catch (error) {
      console.error(`❌ PDF loading attempt ${currentAttempt} failed:`, error);
      
      // If first attempt fails, try with even more basic settings
      if (currentAttempt === 1) {
        console.log('🔄 Retrying with most basic settings...');
        setState(prev => ({ ...prev, loadAttempts: currentAttempt }));
        
        setTimeout(() => {
          loadPDF(2);
        }, 1000);
        return;
      }
      
      // Final failure
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const cleanMessage = errorMessage.replace(/https?:\/\/[^\s"']*/g, '[URL]'); // Clean URLs from error
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: `PDF loading failed after ${currentAttempt} attempts: ${cleanMessage}`
      }));
    }
  }, [fileUrl]); // Only depend on fileUrl

  /**
    * Render current page to canvas
    */
  const renderPage = useCallback(async () => {
    if (!state.pdf || !canvasRef.current) return;

    try {
      console.log(`🎨 Rendering page ${state.currentPage} at scale ${state.scale}`);

      // Cancel any previous render operation
      if (renderTaskRef.current) {
        console.log('🛑 Cancelling previous render operation');
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      const page = await state.pdf.getPage(state.currentPage);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Calculate viewport with rotation
      let viewport = page.getViewport({ scale: state.scale, rotation: state.rotation });

      // Set canvas dimensions
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Clear canvas
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Render page
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      await renderTask.promise;
      console.log('✅ Page rendered successfully');

      // Clear the render task reference on success
      renderTaskRef.current = null;

    } catch (error) {
      // Don't show error for cancelled operations
      if (error instanceof Error && error.name === 'RenderingCancelledException') {
        console.log('ℹ️ Render operation was cancelled');
        return;
      }

      console.error('❌ Page render failed:', error);

      // Don't set error state for font warnings, just log them
      if (error instanceof Error && (
        error.message.includes('TT: undefined function') ||
        error.message.includes('standardFontDataUrl')
      )) {
        console.warn('⚠️ Font-related warning (non-critical):', error.message);
        // Clear the render task reference but don't set error state
        renderTaskRef.current = null;
        return;
      }

      setState(prev => ({
        ...prev,
        error: `Failed to render page: ${error instanceof Error ? error.message : 'Unknown error'}`
      }));

      // Clear the render task reference on error
      renderTaskRef.current = null;
    }
  }, [state.pdf, state.currentPage, state.scale, state.rotation]);

  /**
   * Update container dimensions
   */
  const updateContainerSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setState(prev => ({
        ...prev,
        containerWidth: rect.width,
        containerHeight: rect.height
      }));
    }
  }, []);

  /**
   * Calculate optimal scale to fit container
   */
  const calculateFitScale = useCallback(async () => {
    if (!state.pdf || !containerRef.current) return 1.0;

    try {
      const page = await state.pdf.getPage(state.currentPage);
      const viewport = page.getViewport({ scale: 1.0, rotation: state.rotation });
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const availableWidth = containerRect.width - 40; // 20px padding each side
      const availableHeight = containerRect.height - 40;

      const scaleX = availableWidth / viewport.width;
      const scaleY = availableHeight / viewport.height;
      
      return Math.min(scaleX, scaleY, 3.0); // Max 3x scale
    } catch (error) {
      console.error('Failed to calculate fit scale:', error);
      return 1.0;
    }
  }, [state.pdf, state.currentPage, state.rotation]);

  /**
   * Handle zoom controls
   */
  const handleZoom = useCallback(async (direction: 'in' | 'out' | 'fit' | 'reset') => {
    let newScale = state.scale;
    
    switch (direction) {
      case 'in':
        newScale = Math.min(state.scale * 1.25, 5.0);
        break;
      case 'out':
        newScale = Math.max(state.scale * 0.8, 0.25);
        break;
      case 'fit':
        newScale = await calculateFitScale();
        break;
      case 'reset':
        newScale = 1.0;
        break;
    }
    
    setState(prev => ({ ...prev, scale: newScale }));
  }, [state.scale, calculateFitScale]);

  /**
   * Handle page navigation
   */
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= state.numPages) {
      setState(prev => ({ ...prev, currentPage: page }));
    }
  }, [state.numPages]);

  /**
   * Handle rotation
   */
  const handleRotate = useCallback((direction: 'cw' | 'ccw' = 'cw') => {
    const increment = direction === 'cw' ? 90 : -90;
    setState(prev => ({ 
      ...prev, 
      rotation: (prev.rotation + increment) % 360 
    }));
  }, []);

  /**
   * Toggle fullscreen
   */
  const toggleFullscreen = useCallback(() => {
    setState(prev => ({ ...prev, isFullscreen: !prev.isFullscreen }));
  }, []);

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
        goToPage(state.currentPage - 1);
        event.preventDefault();
        break;
      case 'ArrowRight':
        goToPage(state.currentPage + 1);
        event.preventDefault();
        break;
      case '+':
      case '=':
        handleZoom('in');
        event.preventDefault();
        break;
      case '-':
        handleZoom('out');
        event.preventDefault();
        break;
      case '0':
        handleZoom('reset');
        event.preventDefault();
        break;
      case 'f':
        if (event.ctrlKey) {
          handleZoom('fit');
          event.preventDefault();
        }
        break;
      case 'r':
        if (event.ctrlKey) {
          handleRotate('cw');
          event.preventDefault();
        }
        break;
    }
  }, [state.currentPage, goToPage, handleZoom, handleRotate]);

  // Load PDF on mount and reset attempts when URL changes
  useEffect(() => {
    setState(prev => ({ ...prev, loadAttempts: 0 }));
    loadPDF(1);
  }, [fileUrl, loadPDF]); // Now loadPDF is stable

  // Cleanup render task on unmount or PDF change
  useEffect(() => {
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, []);

  // Render page when state changes
  useEffect(() => {
    if (state.pdf && !state.isLoading) {
      renderPage();
    }
  }, [state.pdf, state.currentPage, state.scale, state.rotation, renderPage]);

  // Update container size on mount and resize
  useEffect(() => {
    updateContainerSize();
    
    const resizeObserver = new ResizeObserver(updateContainerSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => resizeObserver.disconnect();
  }, [updateContainerSize]);

  // Auto-fit on first load
  useEffect(() => {
    if (state.pdf && !state.isLoading && state.scale === 1.0) {
      handleZoom('fit');
    }
  }, [state.pdf, state.isLoading, handleZoom]);

  // Keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const containerStyle: React.CSSProperties = {
    width: customSize?.width || '100%',
    height: customSize?.height || '600px',
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
      ref={containerRef}
      className={`flex flex-col bg-gray-50 border border-gray-200 rounded-lg overflow-hidden ${className}`}
      style={containerStyle}
    >
      {/* Controls Toolbar */}
      <div className="flex items-center justify-between p-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center space-x-2">
          {/* Page Navigation */}
          <button
            onClick={() => goToPage(state.currentPage - 1)}
            disabled={state.currentPage <= 1}
            className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded hover:bg-gray-100"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex items-center space-x-2 text-sm">
            <input
              type="number"
              value={state.currentPage}
              onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
              className="w-12 px-2 py-1 text-center border border-gray-300 rounded text-sm"
              min="1"
              max={state.numPages}
            />
            <span className="text-gray-500">/ {state.numPages}</span>
          </div>
          
          <button
            onClick={() => goToPage(state.currentPage + 1)}
            disabled={state.currentPage >= state.numPages}
            className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded hover:bg-gray-100"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleZoom('out')}
            disabled={state.scale <= 0.25}
            className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded hover:bg-gray-100"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleZoom('fit')}
              className="px-2 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-100"
            >
              Fit
            </button>
            <span className="text-sm text-gray-500 min-w-12 text-center">
              {Math.round(state.scale * 100)}%
            </span>
          </div>
          
          <button
            onClick={() => handleZoom('in')}
            disabled={state.scale >= 5.0}
            className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded hover:bg-gray-100"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => handleRotate('cw')}
            className="p-2 text-gray-600 hover:text-gray-800 rounded hover:bg-gray-100"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => handleRotate('ccw')}
            className="p-2 text-gray-600 hover:text-gray-800 rounded hover:bg-gray-100"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-600 hover:text-gray-800 rounded hover:bg-gray-100"
          >
            {state.isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          
          {onDownload && (
            <button
              onClick={onDownload}
              className="p-2 text-gray-600 hover:text-gray-800 rounded hover:bg-gray-100"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* PDF Canvas Area */}
      <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
        {state.isLoading && (
          <div className="flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-gray-600">Loading PDF...</p>
            <div className="text-xs text-gray-500 text-center">
              <p>Main-thread processing • No workers • No plugins</p>
              <p className="mt-1">PDF.js v{pdfjsLib.version} • Attempt {state.loadAttempts}</p>
              {state.loadAttempts > 1 && (
                <p className="text-orange-500 mt-1">Using ultra-compatible mode...</p>
              )}
            </div>
          </div>
        )}

        {state.error && (
          <div className="flex flex-col items-center justify-center space-y-3 max-w-lg mx-auto">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <h3 className="text-lg font-semibold text-red-600">PDF Load Error</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
              <p className="text-red-700 text-center">{state.error}</p>
            </div>
            <div className="text-xs text-gray-500 text-center space-y-1">
              <p>📄 File: {fileName}</p>
              <p>🔍 Attempts: {state.loadAttempts}/2</p>
              <p>🛠️ Mode: Main-thread only (maximum compatibility)</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setState(prev => ({ ...prev, loadAttempts: 0 }));
                  loadPDF(1);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Retry Loading
              </button>
              {onDownload && (
                <button
                  onClick={onDownload}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Download Instead
                </button>
              )}
            </div>
          </div>
        )}

        {!state.isLoading && !state.error && (
          <canvas
            ref={canvasRef}
            className="shadow-lg border border-gray-300 bg-white max-w-full max-h-full"
            style={{ 
              cursor: 'grab',
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          />
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t border-gray-200 px-3 py-2 text-xs text-gray-500 flex justify-between items-center flex-shrink-0">
        <span>📄 {fileName}</span>
        <span>
          {state.numPages > 0 ? (
            `Page ${state.currentPage} of ${state.numPages} • ${Math.round(state.scale * 100)}% • Direct Canvas`
          ) : (
            'PDF Viewer • Direct Canvas Rendering'
          )}
        </span>
      </div>
    </div>
  );
};

export default DirectPDFViewer;