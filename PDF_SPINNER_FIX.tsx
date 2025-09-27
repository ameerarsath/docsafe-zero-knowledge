/**
 * MINIMAL PDF SPINNER FIX
 * 
 * Key changes to hide loading spinner when PDF renders:
 */

import React, { useState, useEffect, useCallback } from 'react';

interface PreviewState {
  isLoading: boolean;
  isDecrypting: boolean;
  isGeneratingPreview: boolean;
  pluginResult: any | null;
  error: string | null;
}

export const PDFPreviewFix = () => {
  const [state, setState] = useState<PreviewState>({
    isLoading: false,
    isDecrypting: false,
    isGeneratingPreview: false,
    pluginResult: null,
    error: null
  });

  const updateState = useCallback((updates: Partial<PreviewState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // KEY FIX 1: Clear loading states immediately when plugin result is available
  useEffect(() => {
    if (state.pluginResult) {
      updateState({ 
        isGeneratingPreview: false, 
        isLoading: false, 
        isDecrypting: false 
      });
    }
  }, [state.pluginResult, updateState]);

  // KEY FIX 2: Listen for PDF render success events
  useEffect(() => {
    const handlePdfRenderSuccess = () => {
      console.log('🎯 PDF rendered - hiding spinner');
      updateState({
        isGeneratingPreview: false,
        isLoading: false,
        isDecrypting: false,
        error: null
      });
    };

    const handlePdfRenderError = (event: CustomEvent) => {
      updateState({
        isGeneratingPreview: false,
        isLoading: false,
        isDecrypting: false,
        error: `PDF preview failed: ${event.detail?.error || 'Unknown error'}`
      });
    };

    // Use globalThis.document to avoid variable shadowing
    globalThis.document.addEventListener('pdfRenderSuccess', handlePdfRenderSuccess);
    globalThis.document.addEventListener('pdfRenderError', handlePdfRenderError);

    return () => {
      globalThis.document.removeEventListener('pdfRenderSuccess', handlePdfRenderSuccess);
      globalThis.document.removeEventListener('pdfRenderError', handlePdfRenderError);
    };
  }, [updateState]);

  const renderContent = () => {
    // KEY FIX 3: Hide spinner immediately if we have plugin content
    if (state.pluginResult && (state.isDecrypting || state.isGeneratingPreview || state.isLoading)) {
      updateState({ isDecrypting: false, isGeneratingPreview: false, isLoading: false });
    }

    // Show loading spinner only when actually loading
    if (state.isDecrypting || state.isGeneratingPreview || state.isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="ml-2">Loading PDF...</span>
        </div>
      );
    }

    // Show error if load failed
    if (state.error) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-2">❌</div>
            <p className="text-red-600">{state.error}</p>
          </div>
        </div>
      );
    }

    // Show PDF content when available
    if (state.pluginResult) {
      return (
        <div 
          dangerouslySetInnerHTML={{ __html: state.pluginResult.content }}
          className="w-full h-full"
        />
      );
    }

    return <div>No content</div>;
  };

  return (
    <div className="pdf-preview-container">
      {renderContent()}
    </div>
  );
};

/**
 * SUMMARY OF KEY FIXES:
 * 
 * 1. Clear loading states when pluginResult is available
 * 2. Listen for pdfRenderSuccess/pdfRenderError events
 * 3. Use globalThis.document to avoid variable shadowing
 * 4. Separate error handling from loading states
 * 5. Hide spinner immediately when content is ready
 */