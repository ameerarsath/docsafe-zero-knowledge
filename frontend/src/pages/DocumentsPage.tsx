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

import React, { useState, useCallback } from 'react';
import { useDocuments, Document } from '../hooks/useDocuments';
import { useDocumentShares } from '../hooks/useDocumentShares';
import {
  DocumentUpload,
  DocumentPreview,
  DocumentMoveDialog,
  DocumentShareDialog,
  DocumentVersionHistory,
  FolderManagementDialog
} from '../components/documents';
import { ShareIndicator } from '../components/documents/ShareIndicator';
import { RequireAuth } from '../components/auth/ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
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
  // Add error boundary for useDocuments hook
  const documentsHookResult = (() => {
    try {
      return useDocuments();
    } catch (error) {
      console.error('Error in useDocuments hook:', error);
      return {
        documents: [],
        currentFolder: null,
        breadcrumb: [],
        totalCount: 0,
        isLoading: false,
        error: 'Failed to initialize documents. Please refresh the page.',
        searchQuery: '',
        selectedDocuments: new Set(),
        viewMode: 'grid' as const,
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
    setSortOrder,
    selectDocument,
    selectAllDocuments,
    clearSelection,
    bulkDelete,
    setViewMode,
    clearError
  } = documentsHookResult;

  // Get document IDs for documents (not folders)
  const documentIds = documents
    .filter(doc => doc.document_type === 'document')
    .map(doc => doc.id);

  // Load share information for documents
  const {
    getDocumentShares,
    hasActiveShares,
    getActiveShareCount
  } = useDocumentShares(documentIds);

  // Local state
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [searchInput, setSearchInput] = useState(searchQuery);
  
  // Dialog states
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [moveDialog, setMoveDialog] = useState<{ isOpen: boolean; documents: Document[]; operation: 'move' | 'copy' }>({
    isOpen: false,
    documents: [],
    operation: 'move'
  });
  const [shareDocument, setShareDocument] = useState<Document | null>(null);
  const [versionHistoryDocument, setVersionHistoryDocument] = useState<Document | null>(null);
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
   * Handle search submission
   */
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
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
        console.error('Failed to create folder:', error);
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
          
          {breadcrumb && breadcrumb.length > 0 && breadcrumb.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <button
                onClick={() => navigateToFolder(folder.id)}
                className="text-blue-600 hover:text-blue-800 transition-colors"
              >
                {folder.name}
              </button>
            </React.Fragment>
          ))}
          
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

        {/* Search and Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    searchDocuments('');
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
                <Move className="w-4 h-4 text-indigo-500" />
                <span>Move</span>
              </button>
              <button
                onClick={handleBulkCopy}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors flex items-center space-x-1"
              >
                <Copy className="w-4 h-4 text-orange-500" />
                <span>Copy</span>
              </button>
              <button
                onClick={() => bulkDelete(Array.from(selectedDocuments) as number[])}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center space-x-1"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
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

        {/* Documents Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {documents && documents.length > 0 && documents.map((doc) => (
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
                  <div className="relative">
                    {getFileIcon(doc)}
                    {/* Share indicator */}
                    {doc.document_type === 'document' && hasActiveShares(doc.id) && (
                      <div className="absolute -top-1 -right-1">
                        <ShareIndicator
                          shares={getDocumentShares(doc.id)}
                          size="sm"
                          showCount={getActiveShareCount(doc.id) > 1}
                        />
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-medium text-gray-900 text-center truncate w-full">
                    {doc.name}
                  </div>
                  {doc.document_type === 'document' && (
                    <div className="text-xs text-gray-500">
                      {formatFileSize(doc.file_size)}
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // For grid view, position menu below and slightly to the left of button
                        const rect = e.currentTarget.getBoundingClientRect();
                        const adjustedEvent = {
                          ...e,
                          clientX: rect.left + rect.width / 2,
                          clientY: rect.bottom + 4, // 4px below the button
                        };
                        handleContextMenu(adjustedEvent, doc);
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
                      onChange={(e) => {
                        if (e.target.checked) {
                          selectAllDocuments();
                        } else {
                          clearSelection();
                        }
                      }}
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
                {documents && documents.length > 0 && documents.map((doc) => (
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
                        <div className="relative">
                          {getFileIcon(doc)}
                          {/* Share indicator for list view */}
                          {doc.document_type === 'document' && hasActiveShares(doc.id) && (
                            <div className="absolute -top-1 -right-1">
                              <ShareIndicator
                                shares={getDocumentShares(doc.id)}
                                size="sm"
                                showCount={false}
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              if (doc.document_type === 'folder') {
                                navigateToFolder(doc.id);
                              } else {
                                handlePreview(doc);
                              }
                            }}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 text-left"
                          >
                            {doc.name}
                          </button>
                          {/* Share indicator in name column for better visibility */}
                          {doc.document_type === 'document' && hasActiveShares(doc.id) && (
                            <ShareIndicator
                              shares={getDocumentShares(doc.id)}
                              size="sm"
                              showCount={getActiveShareCount(doc.id) > 1}
                              className="ml-2"
                            />
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
                              <Eye className="w-4 h-4 text-blue-500" />
                            </button>
                            <button
                              onClick={() => downloadDocument(doc.id)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Download"
                            >
                              <Download className="w-4 h-4 text-green-500" />
                            </button>
                            <button
                              onClick={() => handleShare(doc)}
                              className="text-green-600 hover:text-green-800"
                              title="Share"
                            >
                              <Share2 className="w-4 h-4 text-purple-500" />
                            </button>
                            <button
                              onClick={() => handleVersionHistory(doc)}
                              className="text-purple-600 hover:text-purple-800"
                              title="Version History"
                            >
                              <History className="w-4 h-4 text-cyan-500" />
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
                          onClick={(e) => {
                            e.stopPropagation();
                            const rect = e.currentTarget.getBoundingClientRect();
                            const fakeEvent = {
                              clientX: rect.left + rect.width / 2,
                              clientY: rect.bottom + 4, // 4px below the button
                              preventDefault: () => {}
                            } as React.MouseEvent;
                            handleContextMenu(fakeEvent, doc);
                          }}
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
        )}

        {/* Empty State */}
        {!isLoading && documents.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery ? 'Try adjusting your search terms' : 'Upload your first document to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Files
              </button>
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
            className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50"
            style={{
              left: `${Math.min(contextMenu.x, window.innerWidth - 220)}px`,
              top: `${Math.min(contextMenu.y, window.innerHeight - 350)}px`,
              width: '200px',
              maxWidth: '90vw',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
          >
            {/* Menu Header */}
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Document Actions
              </p>
            </div>
            {contextMenu.document.document_type === 'document' ? (
              <>
                <button
                  onClick={() => handlePreview(contextMenu.document!)}
                  className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center space-x-3 transition-colors duration-150"
                >
                  <Eye className="w-4 h-4 text-blue-500" />
                  <span>Preview</span>
                </button>
                <button
                  onClick={() => downloadDocument(contextMenu.document!.id)}
                  className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center space-x-3 transition-colors duration-150"
                >
                  <Download className="w-4 h-4 text-green-500" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => handleShare(contextMenu.document!)}
                  className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center space-x-3 transition-colors duration-150"
                >
                  <Share2 className="w-4 h-4 text-purple-500" />
                  <span>Share</span>
                </button>
                <button
                  onClick={() => handleVersionHistory(contextMenu.document!)}
                  className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center space-x-3 transition-colors duration-150"
                >
                  <History className="w-4 h-4 text-cyan-500" />
                  <span>Version History</span>
                </button>
                <div className="border-t border-gray-100 my-1" />
              </>
            ) : (
              <>
                <button
                  onClick={() => navigateToFolder(contextMenu.document!.id)}
                  className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center space-x-3 transition-colors duration-150"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Open</span>
                </button>
                <button
                  onClick={() => handleFolderOperation(contextMenu.document!, 'edit')}
                  className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center space-x-3 transition-colors duration-150"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleFolderOperation(contextMenu.document!, 'permissions')}
                  className="w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 flex items-center space-x-3 transition-colors duration-150"
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
              <Move className="w-4 h-4 text-indigo-500" />
              <span>Move</span>
            </button>
            <button
              onClick={() => handleCopy([contextMenu.document!])}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
            >
              <Copy className="w-4 h-4 text-orange-500" />
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
              <Trash2 className="w-4 h-4 text-red-500" />
              <span>Delete</span>
            </button>
          </div>
        </>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <DocumentUpload
              parentFolderId={currentFolder?.id || null}
              onUploadComplete={(documents) => {
                setShowUpload(false);
                refreshDocuments();
              }}
              onClose={() => setShowUpload(false)}
            />
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
          customSize={{
            maxWidth: '90vw',
            maxHeight: '90vh',
            width: 'auto',
            height: 'auto'
          }}
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