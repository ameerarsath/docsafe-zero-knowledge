/**
 * Hook for managing document shares
 * Fetches and caches share information for documents
 */

import { useState, useEffect, useCallback } from 'react';
import { ShareService, DocumentShare } from '../services/api/shares';

interface DocumentSharesState {
  sharesByDocument: Map<number, DocumentShare[]>;
  isLoading: boolean;
  error: string | null;
}

export function useDocumentShares(documentIds: number[]) {
  const [state, setState] = useState<DocumentSharesState>({
    sharesByDocument: new Map(),
    isLoading: false,
    error: null
  });

  // Track in-flight requests to prevent duplicates
  const [loadingDocuments, setLoadingDocuments] = useState<Set<number>>(new Set());

  /**
   * Load shares for a specific document
   */
  const loadDocumentShares = useCallback(async (documentId: number) => {
    // Prevent concurrent requests for the same document
    if (loadingDocuments.has(documentId)) {
      return;
    }

    setLoadingDocuments(prev => new Set([...prev, documentId]));

    try {
      const response = await ShareService.getDocumentShares(documentId);
      setState(prev => ({
        ...prev,
        sharesByDocument: new Map(prev.sharesByDocument.set(documentId, response.shares)),
        error: null
      }));
    } catch (error: any) {
      // Rate limited console logging already handled in ShareService

      // Check if this is a timeout or permission error (these are non-critical)
      const isTimeoutError = error?.message?.includes('timeout') ||
                           error?.message?.includes('exceeded') ||
                           error?.code === 'ECONNABORTED';
      const isPermissionError = error?.message?.includes('403') ||
                              error?.message?.includes('404') ||
                              error?.message?.includes('Insufficient permissions');

      // For timeout/permission errors, silently set empty shares
      // For other errors, we still set empty shares but could log differently
      setState(prev => ({
        ...prev,
        sharesByDocument: new Map(prev.sharesByDocument.set(documentId, [])),
        error: isTimeoutError ? null : prev.error // Don't set error state for timeouts
      }));
    } finally {
      // Clear loading state for this document
      setLoadingDocuments(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  }, [loadingDocuments]);

  /**
   * Load shares for multiple documents
   */
  const loadShares = useCallback(async (docIds: number[]) => {
    if (docIds.length === 0) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Load shares for each document in parallel
      await Promise.allSettled(
        docIds.map(documentId => loadDocumentShares(documentId))
      );
    } catch (error) {
      console.error('Failed to load document shares:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load shares'
      }));
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [loadDocumentShares]);

  /**
   * Get shares for a specific document
   */
  const getDocumentShares = useCallback((documentId: number): DocumentShare[] => {
    return state.sharesByDocument.get(documentId) || [];
  }, [state.sharesByDocument]);

  /**
   * Check if a document has active shares
   */
  const hasActiveShares = useCallback((documentId: number): boolean => {
    const shares = getDocumentShares(documentId);
    return shares.some(share => share.isActive && !ShareService.isShareExpired(share.expiresAt));
  }, [getDocumentShares]);

  /**
   * Get active share count for a document
   */
  const getActiveShareCount = useCallback((documentId: number): number => {
    const shares = getDocumentShares(documentId);
    return shares.filter(share => share.isActive && !ShareService.isShareExpired(share.expiresAt)).length;
  }, [getDocumentShares]);

  /**
   * Refresh shares for a document
   */
  const refreshDocumentShares = useCallback(async (documentId: number) => {
    // Clear the loaded flag so we can reload
    setLoadedDocuments(prev => {
      const newSet = new Set(prev);
      newSet.delete(documentId);
      return newSet;
    });
    await loadDocumentShares(documentId);
  }, [loadDocumentShares]);

  /**
   * Clear shares cache
   */
  const clearCache = useCallback(() => {
    setState(prev => ({
      ...prev,
      sharesByDocument: new Map(),
      error: null
    }));
    setLoadedDocuments(new Set());
    setLoadingDocuments(new Set());
  }, []);

  // Track loaded documents to prevent infinite re-requests
  const [loadedDocuments, setLoadedDocuments] = useState<Set<number>>(new Set());

  // Load shares when document IDs change
  useEffect(() => {
    if (documentIds.length > 0) {
      // Only load shares for documents we haven't attempted to load yet
      const documentsToLoad = documentIds.filter(id => !loadedDocuments.has(id));
      if (documentsToLoad.length > 0) {
        // Mark documents as being loaded
        setLoadedDocuments(prev => new Set([...prev, ...documentsToLoad]));
        loadShares(documentsToLoad);
      }
    }
  }, [documentIds, loadShares, loadedDocuments]);

  return {
    sharesByDocument: state.sharesByDocument,
    isLoading: state.isLoading,
    error: state.error,
    getDocumentShares,
    hasActiveShares,
    getActiveShareCount,
    refreshDocumentShares,
    clearCache
  };
}

export default useDocumentShares;