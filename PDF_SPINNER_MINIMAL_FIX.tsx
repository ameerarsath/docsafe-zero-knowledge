/**
 * MINIMAL PDF SPINNER FIX - Only the essential changes needed
 */

// Add this to your DocumentPreview component:

// 1. Add event listener for PDF load success
useEffect(() => {
  const handlePdfLoad = () => {
    updateState({ isLoading: false, isGeneratingPreview: false, isDecrypting: false });
  };

  const handlePdfError = () => {
    updateState({ 
      isLoading: false, 
      isGeneratingPreview: false, 
      isDecrypting: false,
      error: 'PDF failed to load' 
    });
  };

  // Listen for PDF render events
  document.addEventListener('pdfRenderSuccess', handlePdfLoad);
  document.addEventListener('pdfRenderError', handlePdfError);

  return () => {
    document.removeEventListener('pdfRenderSuccess', handlePdfLoad);
    document.removeEventListener('pdfRenderError', handlePdfError);
  };
}, [updateState]);

// 2. Clear loading state when plugin result is available
useEffect(() => {
  if (state.pluginResult) {
    updateState({ isLoading: false, isGeneratingPreview: false, isDecrypting: false });
  }
}, [state.pluginResult]);

// 3. Add timeout fallback to prevent infinite loading
useEffect(() => {
  if (state.isLoading || state.isGeneratingPreview) {
    const timeout = setTimeout(() => {
      updateState({ isLoading: false, isGeneratingPreview: false, isDecrypting: false });
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }
}, [state.isLoading, state.isGeneratingPreview]);