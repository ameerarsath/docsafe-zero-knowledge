/**
 * Trash Management Page
 * 
 * Allows users to view, recover, or permanently delete individual items from trash.
 */

import React, { useState, useEffect } from 'react';
import { RequireAuth } from '../components/auth/ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import { 
  Trash2, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  FileText, 
  Folder,
  Calendar,
  HardDrive,
  ArrowLeft
} from 'lucide-react';
import { documentsApi } from '../services/api/documents';
import { trashApi } from '../services/api/trash';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

interface TrashItem {
  id: number;
  name: string;
  document_type: 'document' | 'folder';
  file_size?: number;
  updated_at: string;
  parent_id?: number;
  mime_type?: string;
  file_extension?: string;
  is_deleted: boolean;
}

export default function TrashPage() {
  return (
    <RequireAuth>
      <AppLayout title="Trash" subtitle="Manage deleted documents and folders">
        <TrashContent />
      </AppLayout>
    </RequireAuth>
  );
}

// Helper function to extract error messages from various error types
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    // Handle API error objects
    const errorObj = error as any;
    if (errorObj.detail) return errorObj.detail;
    if (errorObj.message) return errorObj.message;
    if (errorObj.error?.detail) return errorObj.error.detail;
    if (errorObj.error?.message) return errorObj.error.message;
    // Try to stringify if it has meaningful content
    try {
      const stringified = JSON.stringify(error);
      if (stringified !== '{}') {
        return `API Error: ${stringified}`;
      }
    } catch (e) {
      // Ignore JSON stringify errors
    }
  }
  return 'An unknown error occurred';
};

function TrashContent() {
  const [trashItems, setTrashItems] = useState<TrashItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isOperating, setIsOperating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const loadTrashItems = async () => {
    try {
      setIsLoading(true);
      // Get deleted documents from dedicated trash endpoint
      const response = await documentsApi.listTrashItems({
        size: 100, // Maximum allowed by backend
        sort_by: 'updated_at',
        sort_order: 'desc'
      });
      setTrashItems(response.documents);
    } catch (error) {
      console.error('Error loading trash items:', error);
      const errorMessage = getErrorMessage(error);
      setMessage({
        type: 'error',
        text: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrashItems();
  }, []);

  // Handle URL parameter actions
  useEffect(() => {
    const action = searchParams.get('action');
    if (action && trashItems.length > 0 && !isLoading) {
      try {
        if (action === 'empty') {
          handleEmptyTrash();
        } else if (action === 'recover-all') {
          handleRecoverAll();
        }
        // Clear the action parameter from URL
        navigate('/trash', { replace: true });
      } catch (error) {
        console.error('Error handling URL action:', error);
        setMessage({
          type: 'error',
          text: 'Failed to execute action from menu'
        });
      }
    }
  }, [trashItems, searchParams, isLoading]);

  const handleEmptyTrash = async () => {
    if (trashItems.length === 0) return;
    
    if (!confirm(`Are you sure you want to permanently delete all ${trashItems.length} items in trash? This action cannot be undone.`)) {
      return;
    }

    setIsOperating(true);
    setMessage(null);

    try {
      const result = await trashApi.emptyTrash();
      setMessage({ 
        type: 'success', 
        text: `Successfully deleted ${result.deleted_count} items permanently` 
      });
      loadTrashItems();
    } catch (error) {
      console.error('Error emptying trash:', error);
      setMessage({ 
        type: 'error', 
        text: getErrorMessage(error) || 'Failed to empty trash'
      });
    } finally {
      setIsOperating(false);
    }
  };

  const handleRecoverAll = async () => {
    if (trashItems.length === 0) return;

    if (!confirm(`Are you sure you want to recover all ${trashItems.length} items from trash?`)) {
      return;
    }

    setIsOperating(true);
    setMessage(null);

    try {
      const result = await trashApi.recoverAll();
      setMessage({ 
        type: 'success', 
        text: `Successfully recovered ${result.recovered_count} items from trash` 
      });
      loadTrashItems();
    } catch (error) {
      console.error('Error recovering items:', error);
      setMessage({ 
        type: 'error', 
        text: getErrorMessage(error) || 'Failed to recover items'
      });
    } finally {
      setIsOperating(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.size === trashItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(trashItems.map(item => item.id)));
    }
  };

  const handleSelectItem = (id: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleRecoverSelected = async () => {
    if (selectedItems.size === 0) return;

    if (!confirm(`Are you sure you want to recover ${selectedItems.size} selected items?`)) {
      return;
    }

    setIsOperating(true);
    setMessage(null);

    try {
      // We'll need to add individual recover endpoint
      let recoveredCount = 0;
      for (const itemId of selectedItems) {
        await documentsApi.recoverDocument(itemId);
        recoveredCount++;
      }
      
      setMessage({ 
        type: 'success', 
        text: `Successfully recovered ${recoveredCount} items` 
      });
      setSelectedItems(new Set());
      loadTrashItems();
    } catch (error) {
      console.error('Error recovering selected items:', error);
      setMessage({ 
        type: 'error', 
        text: getErrorMessage(error) || 'Failed to recover items'
      });
    } finally {
      setIsOperating(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;

    if (!confirm(`Are you sure you want to permanently delete ${selectedItems.size} selected items? This action cannot be undone.`)) {
      return;
    }

    setIsOperating(true);
    setMessage(null);

    try {
      // We'll need to add individual permanent delete endpoint
      let deletedCount = 0;
      for (const itemId of selectedItems) {
        await documentsApi.permanentlyDeleteDocument(itemId);
        deletedCount++;
      }
      
      setMessage({ 
        type: 'success', 
        text: `Permanently deleted ${deletedCount} items` 
      });
      setSelectedItems(new Set());
      loadTrashItems();
    } catch (error) {
      console.error('Error deleting selected items:', error);
      setMessage({ 
        type: 'error', 
        text: getErrorMessage(error) || 'Failed to delete items'
      });
    } finally {
      setIsOperating(false);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '—';
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    } else if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${bytes} B`;
  };

  const formatDeletedDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return 'Today';
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-6 h-6 bg-gray-200 rounded"></div>
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="w-16 h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            to="/dashboard"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Link>
        </div>
        <div className="text-sm text-gray-500">
          {trashItems.length} items in trash
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-md flex items-center ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Action Bar */}
      {trashItems.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedItems.size > 0 && selectedItems.size === trashItems.length}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {selectedItems.size === 0 
                    ? 'Select all' 
                    : `${selectedItems.size} selected`
                  }
                </span>
              </label>
            </div>
            
            {selectedItems.size > 0 && (
              <div className="flex space-x-2">
                <button
                  onClick={handleRecoverSelected}
                  disabled={isOperating}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isOperating ? (
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-1" />
                  )}
                  Recover Selected
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={isOperating}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isOperating ? (
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-1" />
                  )}
                  Delete Forever
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Trash Items List */}
      <div className="bg-white rounded-xl shadow-sm">
        {trashItems.length === 0 ? (
          <div className="p-12 text-center">
            <Trash2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Trash is empty</h3>
            <p className="text-gray-500">No deleted files or folders to display.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {trashItems.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(item.id)}
                    onChange={() => handleSelectItem(item.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  
                  <div className="flex-shrink-0">
                    {item.document_type === 'folder' ? (
                      <Folder className="w-8 h-8 text-yellow-500" />
                    ) : (
                      <FileText className="w-8 h-8 text-blue-500" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </p>
                      {item.file_extension && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {item.file_extension.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        Deleted {formatDeletedDate(item.updated_at)}
                      </div>
                      {item.file_size && (
                        <div className="flex items-center">
                          <HardDrive className="w-3 h-3 mr-1" />
                          {formatFileSize(item.file_size)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedItems(new Set([item.id]));
                        handleRecoverSelected();
                      }}
                      disabled={isOperating}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-1 focus:ring-green-500 disabled:opacity-50"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Recover
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to permanently delete "${item.name}"? This action cannot be undone.`)) {
                          setSelectedItems(new Set([item.id]));
                          handleDeleteSelected();
                        }
                      }}
                      disabled={isOperating}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}