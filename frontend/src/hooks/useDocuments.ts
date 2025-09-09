/**
 * React hook for document management operations in SecureVault.
 * 
 * This hook provides a complete document management interface including:
 * - Document upload and download
 * - Folder management and navigation
 * - Document search and filtering
 * - Permissions and sharing
 * - Bulk operations
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import useAuthStore from '../stores/authStore';
import { documentsApi } from '../services/api/documents';

// Types
export interface Document {
  id: number;
  name: string;
  description?: string;
  document_type: 'document' | 'folder';
  mime_type?: string;
  file_size?: number;
  file_hash_sha256?: string;
  storage_path?: string;
  parent_id?: number | null;
  owner_id: number;
  created_by: number;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  tags: string[];
  doc_metadata: Record<string, any>;
  
  // Encryption metadata
  encryption_key_id?: string;
  encryption_iv?: string;
  encryption_auth_tag?: string;
  encrypted_dek?: string;
  is_encrypted?: boolean;
  
  // Computed fields
  path?: string;
  depth?: number;
  children?: Document[];
  permissions?: DocumentPermission[];
  shares?: DocumentShare[];
}

export interface DocumentPermission {
  id: number;
  document_id: number;
  user_id: number;
  permission_type: 'read' | 'write' | 'admin';
  granted: boolean;
  granted_by: number;
  granted_at: string;
  expires_at?: string;
}

export interface DocumentShare {
  id: number;
  document_id: number;
  share_token: string;
  share_name: string;
  share_type: 'internal' | 'external' | 'public';
  permissions: string[];
  expires_at?: string;
  created_by: number;
  created_at: string;
  access_count: number;
  last_accessed_at?: string;
}

export interface DocumentListParams {
  parent_id?: number | null;
  document_type?: 'document' | 'folder' | 'all';
  search?: string;
  tags?: string[];
  sort_by?: 'name' | 'created_at' | 'updated_at' | 'file_size';
  sort_order?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
  include_deleted?: boolean;
}

export interface DocumentUploadParams {
  name: string;
  description?: string;
  parent_id?: number | null;
  tags?: string[];
  doc_metadata?: Record<string, any>;
  file: File;
  encryption_key_id: string;
  encryption_iv: string;
  encryption_auth_tag: string;
}

export interface FolderCreateParams {
  name: string;
  description?: string;
  parent_id?: number | null;
  tags?: string[];
}

export interface DocumentsState {
  documents: Document[];
  currentFolder: Document | null;
  breadcrumb: Document[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedTags: string[];
  selectedDocuments: Set<number>;
  viewMode: 'grid' | 'list';
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface DocumentsActions {
  // Navigation
  navigateToFolder: (folderId: number | null) => Promise<void>;
  navigateUp: () => Promise<void>;
  refreshDocuments: () => Promise<void>;
  
  // Document operations
  uploadDocument: (params: DocumentUploadParams, onProgress?: (progress: number) => void) => Promise<Document>;
  downloadDocument: (documentId: number, password?: string) => Promise<void>;
  deleteDocument: (documentId: number) => Promise<void>;
  restoreDocument: (documentId: number) => Promise<void>;
  renameDocument: (documentId: number, newName: string) => Promise<void>;
  moveDocument: (documentId: number, targetFolderId: number | null) => Promise<void>;
  copyDocument: (documentId: number, targetFolderId: number | null, newName?: string) => Promise<void>;
  
  // Folder operations
  createFolder: (params: FolderCreateParams) => Promise<Document>;
  deleteFolder: (folderId: number) => Promise<void>;
  
  // Search and filtering
  searchDocuments: (query: string) => Promise<void>;
  filterByTags: (tags: string[]) => Promise<void>;
  toggleTag: (tag: string) => void;
  clearTagFilters: () => void;
  setSortOrder: (sortBy: string, sortOrder: 'asc' | 'desc') => Promise<void>;
  
  // Selection and bulk operations
  selectDocument: (documentId: number) => void;
  selectAllDocuments: () => void;
  clearSelection: () => void;
  bulkDelete: (documentIds: number[]) => Promise<void>;
  bulkMove: (documentIds: number[], targetFolderId: number | null) => Promise<void>;
  
  // View management
  setViewMode: (mode: 'grid' | 'list') => void;
  
  // State management
  clearError: () => void;
  reset: () => void;
}

export interface UseDocumentsReturn extends DocumentsState, DocumentsActions {
  hasSelection: boolean;
}

/**
 * Custom hook for document management
 */
export function useDocuments(): UseDocumentsReturn {
  const user = useAuthStore((state) => state.user);
  
  const [state, setState] = useState<DocumentsState>({
    documents: [],
    currentFolder: null,
    breadcrumb: [],
    totalCount: 0,
    isLoading: false,
    error: null,
    searchQuery: '',
    selectedTags: [],
    selectedDocuments: new Set(),
    viewMode: 'list',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<DocumentsState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Handle errors consistently
   */
  const handleError = useCallback((error: any, fallbackMessage: string) => {
    // Handle documents error silently
    const errorMessage = error instanceof Error ? error.message : fallbackMessage;
    setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
    throw error;
  }, []);

  /**
   * Load documents for current folder
   */
  const loadDocuments = useCallback(async (params: DocumentListParams = {}) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const listParams = {
        parent_id: params.parent_id !== undefined ? params.parent_id : (state.currentFolder?.id || null),
        sort_by: (params.sort_by || state.sortBy) as 'name' | 'created_at' | 'updated_at' | 'file_size',
        sort_order: params.sort_order || state.sortOrder,
        search: params.search || state.searchQuery || undefined,
        tags: params.tags || (state.selectedTags?.length > 0 ? state.selectedTags : undefined),
        ...params
      };

      const response = await documentsApi.listDocuments(listParams);
      
      setState(prev => ({
        ...prev,
        documents: response.documents || [],
        totalCount: response.total || 0,
        isLoading: false
      }));
    } catch (error) {
      handleError(error, 'Failed to load documents');
    }
  }, [handleError]);

  /**
   * Build breadcrumb trail
   */
  const buildBreadcrumb = useCallback(async (folderId: number | null): Promise<Document[]> => {
    if (!folderId) {
      return [];
    }

    try {
      const pathResponse = await documentsApi.getDocumentPath(folderId);
      // The API returns the complete path including the current folder
      return pathResponse.path || [];
    } catch (error) {
      // Handle breadcrumb error silently
      return [];
    }
  }, []);

  /**
   * Navigate to folder
   */
  const navigateToFolder = useCallback(async (folderId: number | null) => {
    updateState({ isLoading: true, error: null, selectedDocuments: new Set() });

    try {
      let currentFolder: Document | null = null;
      let breadcrumb: Document[] = [];

      if (folderId) {
        currentFolder = await documentsApi.getDocument(folderId);
        breadcrumb = await buildBreadcrumb(folderId);
      }

      updateState({ currentFolder, breadcrumb });
      await loadDocuments({ parent_id: folderId });
    } catch (error) {
      handleError(error, 'Failed to navigate to folder');
    }
  }, [buildBreadcrumb, loadDocuments]);

  /**
   * Navigate up one level
   */
  const navigateUp = useCallback(async () => {
    if (state.currentFolder?.parent_id !== undefined) {
      await navigateToFolder(state.currentFolder.parent_id);
    }
  }, [state.currentFolder?.parent_id, navigateToFolder]);

  /**
   * Refresh current documents
   */
  const refreshDocuments = useCallback(async () => {
    await loadDocuments();
  }, [loadDocuments]);

  /**
   * Upload document
   */
  const uploadDocument = useCallback(async (
    params: DocumentUploadParams,
    onProgress?: (progress: number) => void
  ): Promise<Document> => {
    try {
      const formData = new FormData();
      formData.append('file', params.file);
      formData.append('name', params.name);
      formData.append('description', params.description || '');
      formData.append('parent_id', params.parent_id?.toString() || '');
      formData.append('tags', JSON.stringify(params.tags || []));
      formData.append('doc_metadata', JSON.stringify(params.doc_metadata || {}));
      formData.append('encryption_key_id', params.encryption_key_id);
      formData.append('encryption_iv', params.encryption_iv);
      formData.append('encryption_auth_tag', params.encryption_auth_tag);
      formData.append('file_size', params.file.size.toString());
      formData.append('mime_type', params.file.type);

      const document = await documentsApi.uploadDocument(formData, onProgress);
      
      // Refresh documents if uploaded to current folder
      if (params.parent_id === state.currentFolder?.id) {
        await refreshDocuments();
      }
      
      return document;
    } catch (error) {
      handleError(error, 'Failed to upload document');
      throw error;
    }
  }, [state.currentFolder?.id, refreshDocuments, handleError]);

  /**
   * Download document
   */
  const downloadDocument = useCallback(async (documentId: number, password?: string) => {
    try {
      await documentsApi.downloadDocument(documentId, password);
    } catch (error) {
      handleError(error, 'Failed to download document');
    }
  }, [handleError]);

  /**
   * Delete document
   */
  const deleteDocument = useCallback(async (documentId: number) => {
    try {
      await documentsApi.deleteDocument(documentId);
      await refreshDocuments();
    } catch (error) {
      handleError(error, 'Failed to delete document');
    }
  }, [refreshDocuments, handleError]);

  /**
   * Restore document
   */
  const restoreDocument = useCallback(async (documentId: number) => {
    try {
      await documentsApi.restoreDocument(documentId);
      await refreshDocuments();
    } catch (error) {
      handleError(error, 'Failed to restore document');
    }
  }, [refreshDocuments, handleError]);

  /**
   * Rename document
   */
  const renameDocument = useCallback(async (documentId: number, newName: string) => {
    try {
      await documentsApi.updateDocument(documentId, { name: newName });
      await refreshDocuments();
    } catch (error) {
      handleError(error, 'Failed to rename document');
    }
  }, [refreshDocuments, handleError]);

  /**
   * Move document
   */
  const moveDocument = useCallback(async (documentId: number, targetFolderId: number | null) => {
    try {
      await documentsApi.moveDocuments({
        document_ids: [documentId],
        target_folder_id: targetFolderId,
        operation: 'move'
      });
      await refreshDocuments();
    } catch (error) {
      handleError(error, 'Failed to move document');
    }
  }, [refreshDocuments, handleError]);

  /**
   * Copy document
   */
  const copyDocument = useCallback(async (
    documentId: number, 
    targetFolderId: number | null, 
    newName?: string
  ) => {
    try {
      await documentsApi.copyDocuments({
        document_ids: [documentId],
        target_folder_id: targetFolderId,
        operation: 'copy',
        conflict_resolution: 'rename'
      });
      await refreshDocuments();
    } catch (error) {
      handleError(error, 'Failed to copy document');
    }
  }, [refreshDocuments, handleError]);

  /**
   * Create folder
   */
  const createFolder = useCallback(async (params: FolderCreateParams): Promise<Document> => {
    try {
      const folder = await documentsApi.createDocument({
        name: params.name,
        description: params.description || '',
        document_type: 'folder',
        parent_id: params.parent_id,
        tags: params.tags || []
      });

      // Refresh documents if created in current folder
      if (params.parent_id === state.currentFolder?.id) {
        await refreshDocuments();
      }

      return folder;
    } catch (error) {
      handleError(error, 'Failed to create folder');
      throw error;
    }
  }, [state.currentFolder?.id, refreshDocuments, handleError]);

  /**
   * Delete folder
   */
  const deleteFolder = useCallback(async (folderId: number) => {
    try {
      await documentsApi.deleteDocument(folderId);
      
      // Navigate up if we deleted the current folder
      if (folderId === state.currentFolder?.id) {
        await navigateUp();
      } else {
        await refreshDocuments();
      }
    } catch (error) {
      handleError(error, 'Failed to delete folder');
    }
  }, [state.currentFolder?.id, navigateUp, refreshDocuments, handleError]);

  /**
   * Search documents
   */
  const searchDocuments = useCallback(async (query: string) => {
    updateState({ searchQuery: query });
    await loadDocuments({ search: query });
  }, [loadDocuments, updateState]);

  /**
   * Filter by tags
   */
  const filterByTags = useCallback(async (tags: string[]) => {
    await loadDocuments({ tags });
  }, [loadDocuments]);

  /**
   * Set sort order
   */
  const setSortOrder = useCallback(async (sortBy: 'name' | 'created_at' | 'updated_at' | 'file_size', sortOrder: 'asc' | 'desc') => {
    updateState({ sortBy, sortOrder });
    await loadDocuments({ sort_by: sortBy, sort_order: sortOrder });
  }, [loadDocuments, updateState]);

  /**
   * Select document (toggle selection)
   */
  const selectDocument = useCallback((documentId: number) => {
    const newSelection = new Set(state.selectedDocuments);
    
    if (newSelection.has(documentId)) {
      // Unselect if already selected
      newSelection.delete(documentId);
    } else {
      // Select if not selected
      newSelection.add(documentId);
    }
    
    updateState({
      selectedDocuments: newSelection
    });
  }, [state.selectedDocuments, updateState]);

  /**
   * Select all documents (toggle between select all / deselect all)
   */
  const selectAllDocuments = useCallback(() => {
    const allIds = new Set(state.documents.map(doc => doc.id));
    const currentSelection = state.selectedDocuments;
    
    // If all documents are currently selected, deselect all
    // Otherwise, select all documents
    const allSelected = allIds.size > 0 && Array.from(allIds).every(id => currentSelection.has(id));
    
    updateState({ 
      selectedDocuments: allSelected ? new Set() : allIds 
    });
  }, [state.documents, state.selectedDocuments, updateState]);

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    updateState({ selectedDocuments: new Set() });
  }, [updateState]);

  /**
   * Bulk delete
   */
  const bulkDelete = useCallback(async (documentIds: number[]) => {
    try {
      await Promise.all(documentIds.map(id => documentsApi.deleteDocument(id)));
      updateState({ selectedDocuments: new Set() });
      await refreshDocuments();
    } catch (error) {
      handleError(error, 'Failed to delete documents');
    }
  }, [refreshDocuments, updateState, handleError]);

  /**
   * Bulk move
   */
  const bulkMove = useCallback(async (documentIds: number[], targetFolderId: number | null) => {
    try {
      await documentsApi.moveDocuments({
        document_ids: documentIds,
        target_folder_id: targetFolderId,
        operation: 'move'
      });
      updateState({ selectedDocuments: new Set() });
      await refreshDocuments();
    } catch (error) {
      handleError(error, 'Failed to move documents');
    }
  }, [refreshDocuments, updateState, handleError]);

  /**
   * Set view mode
   */
  const setViewMode = useCallback((mode: 'grid' | 'list') => {
    updateState({ viewMode: mode });
  }, [updateState]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  /**
   * Reset state
   */
  /**
   * Toggle tag filter
   */
  const toggleTag = useCallback((tag: string) => {
    setState(prev => {
      const selectedTags = prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter(t => t !== tag)
        : [...prev.selectedTags, tag];
      
      return {
        ...prev,
        selectedTags
      };
    });
  }, []);

  /**
   * Clear all tag filters
   */
  const clearTagFilters = useCallback(() => {
    updateState({ selectedTags: [] });
  }, [updateState]);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState({
      documents: [],
      currentFolder: null,
      breadcrumb: [],
      totalCount: 0,
      isLoading: false,
      error: null,
      searchQuery: '',
      selectedTags: [],
      selectedDocuments: new Set(),
      viewMode: 'list',
      sortBy: 'name',
      sortOrder: 'asc'
    });
  }, []);

  // Initialize by loading root documents
  useEffect(() => {
    if (user) {
      // Initialize state first
      setState(prev => ({ 
        ...prev,
        currentFolder: null, 
        breadcrumb: [], 
        isLoading: true, 
        error: null,
        selectedDocuments: new Set() 
      }));
      
      // Load root documents directly
      loadDocuments({ parent_id: null });
    }
  }, [user?.id, loadDocuments]); // Include loadDocuments since it's a stable callback

  // Computed values
  const selectedCount = state.selectedDocuments?.size || 0;
  const hasSelection = selectedCount > 0;
  const documentsLength = state.documents?.length || 0;
  const isAllSelected = selectedCount === documentsLength && documentsLength > 0;

  return {
    // State
    ...state,
    
    // Computed
    hasSelection,
    
    // Actions
    navigateToFolder,
    navigateUp,
    refreshDocuments,
    uploadDocument,
    downloadDocument,
    deleteDocument,
    restoreDocument,
    renameDocument,
    moveDocument,
    copyDocument,
    createFolder,
    deleteFolder,
    searchDocuments,
    filterByTags,
    toggleTag,
    clearTagFilters,
    setSortOrder,
    selectDocument,
    selectAllDocuments,
    clearSelection,
    bulkDelete,
    bulkMove,
    setViewMode,
    clearError,
    reset
  };
}