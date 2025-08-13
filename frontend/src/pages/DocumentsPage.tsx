/**
 * Documents Page Component for SecureVault
 * 
 * Main page for document management with:
 * - File browser with folder navigation
 * - Document upload and download
 * - Document preview and version history
 * - Move/copy operations and sharing
 * - Search and filtering
 * - Bulk operations
 * - Grid and list view modes
 * - Enhanced folder management
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useDocuments, Document } from '../hooks/useDocuments';
import { 
  DocumentUpload,
  DocumentPreview,
  DocumentMoveDialog,
  DocumentShareDialog,
  DocumentVersionHistory,
  FolderManagementDialog
} from '../components/documents';
import EncryptedDocumentUpload from '../components/documents/EncryptedDocumentUpload';
import { RequireAuth } from '../components/auth/ProtectedRoute';
import TagsDisplay, { TagFilter } from '../components/ui/TagsDisplay';
import AppLayout from '../components/layout/AppLayout';
import EnhancedSearch from '../components/search/EnhancedSearch';
import { DocumentSearchParams, documentsApi } from '../services/api/documents';
import { useAuth } from '../contexts/AuthContext';
import {
  FileText,
  FolderOpen,
  Upload,
  Search,
  Grid,
  List,
  Download,
  Trash2,
  MoreHorizontal,
  ChevronRight,
  Home,
  Plus,
  Filter,
  SortAsc,
  SortDesc,
  RefreshCw,
  X,
  Eye,
  Share2,
  Move,
  Copy,
  History,
  Edit3,
  Settings
} from 'lucide-react';

export default function DocumentsPage() {
  return (
    <RequireAuth>
      <AppLayout>
        <DocumentsContent />
      </AppLayout>
    </RequireAuth>
  );
}

function DocumentsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const canSearchAdvanced = user?.role && ['super_admin', 'admin', 'manager'].includes(user.role);
  const canSearchAll = user?.role && ['super_admin', 'admin', 'manager', 'user', 'viewer'].includes(user.role);
  
  // Add error boundary for useDocuments hook
  const documentsHookResult = (() => {
    try {
      return useDocuments();
    } catch (error) {
      // Handle useDocuments hook error silently
      return {
        documents: [],
        currentFolder: null,
        breadcrumb: [],
        totalCount: 0,
        isLoading: false,
        error: 'Failed to initialize documents. Please refresh the page.',
        searchQuery: '',
        selectedTags: [],
        selectedDocuments: new Set(),
        viewMode: 'list' as const,
        sortBy: 'name',
        sortOrder: 'asc' as const,
        hasSelection: false,
        navigateToFolder: () => Promise.resolve(),
        navigateUp: () => Promise.resolve(),
        refreshDocuments: () => Promise.resolve(),
        uploadDocument: () => Promise.reject('Not available'),
        downloadDocument: () => Promise.resolve(),
        deleteDocument: () => Promise.resolve(),
        createFolder: () => Promise.reject('Not available'),
        searchDocuments: () => Promise.resolve(),
        toggleTag: () => {},
        clearTagFilters: () => {},
        setSortOrder: () => Promise.resolve(),
        selectDocument: () => {},
        selectAllDocuments: () => {},
        clearSelection: () => {},
        bulkDelete: () => Promise.resolve(),
        setViewMode: () => {},
        clearError: () => {}
      };
    }
  })();
  
  const {
    documents,
    currentFolder,
    breadcrumb,
    totalCount,
    isLoading,
    error,
    searchQuery,
    selectedTags,
    selectedDocuments,
    viewMode,
    sortBy,
    sortOrder,
    hasSelection,
    navigateToFolder,
    navigateUp,
    refreshDocuments,
    uploadDocument,
    downloadDocument,
    deleteDocument,
    createFolder,
    searchDocuments,
    toggleTag,
    clearTagFilters,
    setSortOrder,
    selectDocument,
    selectAllDocuments,
    clearSelection,
    bulkDelete,
    setViewMode,
    clearError
  } = documentsHookResult;

  // Local state
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [enhancedSearchResults, setEnhancedSearchResults] = useState<Document[]>([]);
  const [isEnhancedSearch, setIsEnhancedSearch] = useState(false);
  const [enhancedSearchLoading, setEnhancedSearchLoading] = useState(false);
  
  // Get current documents to display (either search results or regular documents)
  const displayDocuments = isEnhancedSearch && enhancedSearchResults.length > 0 ? enhancedSearchResults : documents;
  const displayLoading = isEnhancedSearch ? enhancedSearchLoading : isLoading;
  
  // Dialog states
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [moveDialog, setMoveDialog] = useState<{ isOpen: boolean; documents: Document[]; operation: 'move' | 'copy' }>({
    isOpen: false,
    documents: [],
    operation: 'move'
  });
  const [shareDocument, setShareDocument] = useState<Document | null>(null);
  const [versionHistoryDocument, setVersionHistoryDocument] = useState<Document | null>(null);

  // Handle escape key to close modals
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showUpload) {
          console.log('⌨️ Escape pressed - closing upload modal');
          setShowUpload(false);
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showUpload]);
  const [folderDialog, setFolderDialog] = useState<{
    isOpen: boolean;
    folder?: Document | null;
    mode: 'create' | 'edit' | 'permissions' | 'delete';
  }>({
    isOpen: false,
    folder: null,
    mode: 'create'
  });
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    document: Document | null;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    document: null
  });

  /**
   * Handle enhanced search
   */
  const handleEnhancedSearch = useCallback(async (params: DocumentSearchParams) => {
    console.log('🔍 Starting enhanced search with params:', params);
    setEnhancedSearchLoading(true);
    setIsEnhancedSearch(true);
    
    try {
      console.log('📡 Calling searchDocumentsAdvanced API...');
      const response = await documentsApi.searchDocumentsAdvanced(params);
      console.log('✅ Enhanced search response:', response);
      setEnhancedSearchResults(response.documents);
    } catch (error) {
      console.error('❌ Enhanced search failed:', error);
      // Set empty results on error but keep enhanced search mode on to show the error
      setEnhancedSearchResults([]);
    } finally {
      setEnhancedSearchLoading(false);
    }
  }, []);

  /**
   * Handle clear enhanced search
   */
  const handleClearEnhancedSearch = useCallback(() => {
    setEnhancedSearchResults([]);
    setIsEnhancedSearch(false);
    setSearchInput('');
    searchDocuments('');
  }, [searchDocuments]);

  /**
   * Handle search submission (legacy simple search)
   */
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setIsEnhancedSearch(false);
    searchDocuments(searchInput);
  }, [searchInput, searchDocuments]);

  /**
   * Handle folder creation
   */
  const handleCreateFolder = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      try {
        await createFolder({
          name: newFolderName.trim(),
          parent_id: currentFolder?.id || null
        });
        setNewFolderName('');
        setShowCreateFolder(false);
      } catch (error) {
        // Handle folder creation error silently
      }
    }
  }, [newFolderName, currentFolder?.id, createFolder]);

  /**
   * Handle context menu
   */
  const handleContextMenu = useCallback((e: React.MouseEvent, document: Document) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      document
    });
  }, []);

  /**
   * Close context menu
   */
  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  }, []);

  /**
   * Handle document preview
   */
  const handlePreview = useCallback((document: Document) => {
    setPreviewDocument(document);
    closeContextMenu();
  }, [closeContextMenu]);

  /**
   * Handle document share
   */
  const handleShare = useCallback((document: Document) => {
    setShareDocument(document);
    closeContextMenu();
  }, [closeContextMenu]);

  /**
   * Handle version history
   */
  const handleVersionHistory = useCallback((document: Document) => {
    setVersionHistoryDocument(document);
    closeContextMenu();
  }, [closeContextMenu]);

  /**
   * Handle move operation
   */
  const handleMove = useCallback((documents: Document[]) => {
    setMoveDialog({
      isOpen: true,
      documents,
      operation: 'move'
    });
    closeContextMenu();
  }, [closeContextMenu]);

  /**
   * Handle copy operation
   */
  const handleCopy = useCallback((documents: Document[]) => {
    setMoveDialog({
      isOpen: true,
      documents,
      operation: 'copy'
    });
    closeContextMenu();
  }, [closeContextMenu]);

  /**
   * Handle folder operations
   */
  const handleFolderOperation = useCallback((folder: Document | null, mode: 'create' | 'edit' | 'permissions' | 'delete') => {
    setFolderDialog({
      isOpen: true,
      folder,
      mode
    });
    closeContextMenu();
  }, [closeContextMenu]);

  /**
   * Handle bulk move/copy from selection
   */
  const handleBulkMove = useCallback(() => {
    const selectedDocs = documents.filter(doc => selectedDocuments.has(doc.id));
    handleMove(selectedDocs);
  }, [documents, selectedDocuments, handleMove]);

  const handleBulkCopy = useCallback(() => {
    const selectedDocs = documents.filter(doc => selectedDocuments.has(doc.id));
    handleCopy(selectedDocs);
  }, [documents, selectedDocuments, handleCopy]);

  /**
   * Format file size
   */
  const formatFileSize = useCallback((bytes?: number) => {
    if (!bytes) return '-';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  /**
   * Format date
   */
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  /**
   * Get file icon
   */
  const getFileIcon = useCallback((doc: any) => {
    if (doc.document_type === 'folder') {
      return <FolderOpen className="w-5 h-5 text-blue-500" />;
    }
    return <FileText className="w-5 h-5 text-gray-500" />;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Content */}
      <div className="h-full">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm">
          <button
            onClick={() => navigateToFolder(null)}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Home className="w-4 h-4 mr-1" />
            Root
          </button>
          
          {breadcrumb && breadcrumb.length > 0 && breadcrumb.map((folder, index) => {
            // Check if this is the last item (current folder)
            const isCurrentFolder = index === breadcrumb.length - 1;
            
            return (
              <React.Fragment key={folder.id}>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                {isCurrentFolder ? (
                  // Current folder - not clickable
                  <span className="text-gray-900 font-medium">
                    {folder.name}
                  </span>
                ) : (
                  // Parent folders - clickable
                  <button
                    onClick={() => navigateToFolder(folder.id)}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {folder.name}
                  </button>
                )}
              </React.Fragment>
            );
          })}
          
          {/* Item count */}
          <span className="text-gray-500 ml-4">
            {totalCount} item{totalCount !== 1 ? 's' : ''}
          </span>
        </nav>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleFolderOperation(null, 'create')}
            className="inline-flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" />
            New Folder
          </button>
          
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Files
          </button>
        </div>
      </div>

        {/* Unified Search Interface */}
        <div className="mb-6">
          <EnhancedSearch
            onSearch={handleEnhancedSearch}
            onClear={handleClearEnhancedSearch}
            initialQuery={searchQuery}
            isAdmin={isAdmin}
            canSearchAdvanced={canSearchAdvanced}
            canSearchAll={canSearchAll}
            className="mb-4"
          />
        </div>

        {/* Search and Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Quick Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Quick search (or use advanced search above)..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    searchDocuments('');
                    handleClearEnhancedSearch();
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            {/* Sort */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortOrder(field, order as 'asc' | 'desc');
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
              <option value="created_at-desc">Newest</option>
              <option value="created_at-asc">Oldest</option>
              <option value="file_size-desc">Largest</option>
              <option value="file_size-asc">Smallest</option>
            </select>

            {/* View Mode */}
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={refreshDocuments}
              disabled={isLoading}
              className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Selection Actions */}
        {hasSelection && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
            <div className="text-sm text-blue-800">
              {selectedDocuments.size} item{selectedDocuments.size !== 1 ? 's' : ''} selected
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBulkMove}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center space-x-1"
              >
                <Move className="w-4 h-4" />
                <span>Move</span>
              </button>
              <button
                onClick={handleBulkCopy}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors flex items-center space-x-1"
              >
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </button>
              <button
                onClick={() => bulkDelete(Array.from(selectedDocuments) as number[])}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center space-x-1"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Tag Filter */}
        <TagFilter
          selectedTags={selectedTags}
          onTagToggle={toggleTag}
          onClearAll={clearTagFilters}
        />

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
            <div className="text-sm text-red-800">{error}</div>
            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search Results Status */}
        {(isEnhancedSearch || searchQuery) && (
          <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-700">
                {isEnhancedSearch ? (
                  <>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                      Advanced Search
                    </span>
                    Found {enhancedSearchResults.length} result{enhancedSearchResults.length !== 1 ? 's' : ''}
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                      Quick Search
                    </span>
                    Found {documents.length} result{documents.length !== 1 ? 's' : ''} for "{searchQuery}"
                  </>
                )}
              </div>
              <button
                onClick={() => {
                  handleClearEnhancedSearch();
                  setSearchInput('');
                  searchDocuments('');
                }}
                className="text-xs text-slate-500 hover:text-slate-700 font-medium"
              >
                Clear all
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {displayLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">
              {isEnhancedSearch ? 'Searching documents...' : 'Loading documents...'}
            </p>
          </div>
        )}

        {/* Documents Grid/List */}
        {!displayLoading && (
          viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {displayDocuments && displayDocuments.length > 0 && displayDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`relative group p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer ${
                  selectedDocuments && selectedDocuments.has(doc.id) ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'
                }`}
                onClick={() => {
                  if (doc.document_type === 'folder') {
                    navigateToFolder(doc.id);
                  } else {
                    selectDocument(doc.id);
                  }
                }}
                onContextMenu={(e) => handleContextMenu(e, doc)}
              >
                <div className="flex flex-col items-center space-y-2">
                  {getFileIcon(doc)}
                  <div className="text-sm font-medium text-gray-900 text-center truncate w-full">
                    {doc.name}
                  </div>
                  {doc.document_type === 'document' && (
                    <div className="text-xs text-gray-500">
                      {formatFileSize(doc.file_size)}
                    </div>
                  )}
                  {doc.tags && doc.tags.length > 0 && (
                    <div className="mt-1">
                      <TagsDisplay
                        tags={doc.tags}
                        onTagClick={toggleTag}
                        maxVisible={2}
                        size="sm"
                        className="justify-center"
                      />
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContextMenu(e, doc);
                      }}
                      className="p-1 bg-white shadow-sm border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectedDocuments.size > 0 && selectedDocuments.size === displayDocuments.length}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate = selectedDocuments.size > 0 && selectedDocuments.size < displayDocuments.length;
                        }
                      }}
                      onChange={() => selectAllDocuments()}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Modified
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayDocuments && displayDocuments.length > 0 && displayDocuments.map((doc) => (
                  <tr 
                    key={doc.id} 
                    className="hover:bg-gray-50"
                    onContextMenu={(e) => handleContextMenu(e, doc)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedDocuments && selectedDocuments.has(doc.id)}
                        onChange={() => selectDocument(doc.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        {getFileIcon(doc)}
                        <div className="flex flex-col">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('🖱️ Document name clicked:', doc.name);
                              if (doc.document_type === 'folder') {
                                navigateToFolder(doc.id);
                              } else {
                                handlePreview(doc);
                              }
                            }}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 text-left relative z-10"
                            style={{ pointerEvents: 'auto' }}
                          >
                            {doc.name}
                          </button>
                          {doc.tags && doc.tags.length > 0 && (
                            <div className="mt-1">
                              <TagsDisplay
                                tags={doc.tags}
                                onTagClick={toggleTag}
                                maxVisible={3}
                                size="sm"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {doc.document_type === 'folder' ? '-' : formatFileSize(doc.file_size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(doc.updated_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        {doc.document_type === 'document' && (
                          <>
                            <button
                              onClick={() => handlePreview(doc)}
                              className="text-gray-600 hover:text-gray-800"
                              title="Preview"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => downloadDocument(doc.id)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Download"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleShare(doc)}
                              className="text-green-600 hover:text-green-800"
                              title="Share"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleVersionHistory(doc)}
                              className="text-purple-600 hover:text-purple-800"
                              title="Version History"
                            >
                              <History className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {doc.document_type === 'folder' && (
                          <button
                            onClick={() => handleFolderOperation(doc, 'edit')}
                            className="text-gray-600 hover:text-gray-800"
                            title="Edit Folder"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleContextMenu({ clientX: 0, clientY: 0, preventDefault: () => {} } as any, doc)}
                          className="text-gray-600 hover:text-gray-800"
                          title="More Actions"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
        )}

        {/* Empty State */}
        {!displayLoading && displayDocuments.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              {(isEnhancedSearch || searchQuery) ? (
                <Search className="w-8 h-8 text-gray-400" />
              ) : (
                <FileText className="w-8 h-8 text-gray-400" />
              )}
            </div>
            
            {(isEnhancedSearch || searchQuery) ? (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {isEnhancedSearch 
                    ? 'No documents match your search criteria. Try adjusting your filters or search terms.'
                    : `No documents found for "${searchQuery}". Try different keywords or use advanced search for more options.`
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => {
                      handleClearEnhancedSearch();
                      setSearchInput('');
                      searchDocuments('');
                    }}
                    className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear Search
                  </button>
                  <button
                    onClick={() => setShowUpload(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload New File
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Get started by uploading your first document. You can drag and drop files or use the upload button.
                </p>
                <button
                  onClick={() => setShowUpload(true)}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base font-medium"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Upload Your First Document
                </button>
              </>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500">Loading documents...</p>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.isOpen && contextMenu.document && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={closeContextMenu}
          />
          <div
            className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[55] min-w-48"
            style={{
              left: `${Math.min(contextMenu.x, window.innerWidth - 200)}px`,
              top: `${Math.min(contextMenu.y, window.innerHeight - 300)}px`
            }}
          >
            {contextMenu.document.document_type === 'document' ? (
              <>
                <button
                  onClick={() => handlePreview(contextMenu.document!)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview</span>
                </button>
                <button
                  onClick={() => downloadDocument(contextMenu.document!.id)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => handleShare(contextMenu.document!)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </button>
                <button
                  onClick={() => handleVersionHistory(contextMenu.document!)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <History className="w-4 h-4" />
                  <span>Version History</span>
                </button>
                <div className="border-t border-gray-100 my-1" />
              </>
            ) : (
              <>
                <button
                  onClick={() => navigateToFolder(contextMenu.document!.id)}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Open</span>
                </button>
                <button
                  onClick={() => handleFolderOperation(contextMenu.document!, 'edit')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleFolderOperation(contextMenu.document!, 'permissions')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>Permissions</span>
                </button>
                <div className="border-t border-gray-100 my-1" />
              </>
            )}
            <button
              onClick={() => handleMove([contextMenu.document!])}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
            >
              <Move className="w-4 h-4" />
              <span>Move</span>
            </button>
            <button
              onClick={() => handleCopy([contextMenu.document!])}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
            >
              <Copy className="w-4 h-4" />
              <span>Copy</span>
            </button>
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={() => {
                if (contextMenu.document!.document_type === 'folder') {
                  handleFolderOperation(contextMenu.document!, 'delete');
                } else {
                  deleteDocument(contextMenu.document!.id);
                  closeContextMenu();
                }
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
          </div>
        </>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4"
          onClick={(e) => {
            // Close modal if clicking on backdrop
            if (e.target === e.currentTarget) {
              console.log('🖱️ Clicking outside modal, closing upload modal');
              setShowUpload(false);
            }
          }}
          onKeyDown={(e) => {
            // Close modal on Escape key
            if (e.key === 'Escape') {
              console.log('⌨️ Escape key pressed, closing upload modal');
              setShowUpload(false);
            }
          }}
          tabIndex={0}
        >
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white rounded-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Upload Documents</h2>
                <button
                  onClick={() => setShowUpload(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <EncryptedDocumentUpload
                onAllUploadsComplete={async () => {
                  console.log('📁 All uploads completed, refreshing document list...');
                  // Add a small delay to show the success state
                  setTimeout(async () => {
                    try {
                      await refreshDocuments();
                      console.log('✅ Document list refreshed successfully');
                    } catch (error) {
                      console.error('❌ Failed to refresh document list:', error);
                    }
                    setShowUpload(false);
                    console.log('🔒 Upload modal closed');
                  }, 500); // Brief delay to show success before closing
                }}
                onError={() => {
                  console.log('❌ Upload error occurred, keeping modal open for retry');
                  // Keep modal open but ensure no blocking overlays from child components
                }}
                onCancel={() => {
                  console.log('🚫 Upload cancelled by user');
                  setShowUpload(false);
                }}
                maxFileSize={100}
                allowedTypes={[
                  'application/pdf',
                  'image/*',
                  'text/*',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'application/vnd.ms-excel',
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                ]}
                autoResetAfterUpload={true}
                parentFolderId={currentFolder?.id || null}
              />
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDocument && (
        <DocumentPreview
          document={previewDocument}
          isOpen={true}
          onClose={() => setPreviewDocument(null)}
          onDownload={(documentId) => downloadDocument(documentId)}
          onShare={(document) => setShareDocument(document)}
        />
      )}

      {/* Move/Copy Dialog */}
      <DocumentMoveDialog
        documents={moveDialog.documents}
        operation={moveDialog.operation}
        isOpen={moveDialog.isOpen}
        onClose={() => setMoveDialog(prev => ({ ...prev, isOpen: false }))}
        onComplete={() => {
          setMoveDialog(prev => ({ ...prev, isOpen: false }));
          refreshDocuments();
        }}
        currentFolderId={currentFolder?.id || null}
      />

      {/* Share Dialog */}
      {shareDocument && (
        <DocumentShareDialog
          document={shareDocument}
          isOpen={true}
          onClose={() => setShareDocument(null)}
        />
      )}

      {/* Version History Dialog */}
      {versionHistoryDocument && (
        <DocumentVersionHistory
          document={versionHistoryDocument}
          isOpen={true}
          onClose={() => setVersionHistoryDocument(null)}
          onDownload={(documentId, versionId) => downloadDocument(documentId)}
        />
      )}

      {/* Folder Management Dialog */}
      <FolderManagementDialog
        folder={folderDialog.folder}
        parentFolderId={currentFolder?.id || null}
        isOpen={folderDialog.isOpen}
        onClose={() => setFolderDialog(prev => ({ ...prev, isOpen: false }))}
        onComplete={() => {
          setFolderDialog(prev => ({ ...prev, isOpen: false }));
          refreshDocuments();
        }}
        mode={folderDialog.mode}
      />
    </div>
  );
}