/**
 * Document Move/Copy Dialog Component for SecureVault
 * 
 * Features:
 * - Move or copy documents to different folders
 * - Folder tree navigation
 * - Batch operations support
 * - Conflict resolution options
 * - Progress tracking
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  X, 
  FolderOpen, 
  Folder, 
  ChevronRight, 
  ChevronDown, 
  Home,
  Move,
  Copy,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { Document } from '../../hooks/useDocuments';
import { documentsApi } from '../../services/api/documents';

interface DocumentMoveDialogProps {
  documents: Document[];
  operation: 'move' | 'copy';
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  currentFolderId?: number | null;
  className?: string;
}

interface FolderNode {
  id: number | null;
  name: string;
  parent_id: number | null;
  children: FolderNode[];
  isExpanded: boolean;
  isLoading: boolean;
}

interface MoveDialogState {
  selectedFolderId: number | null;
  folderTree: FolderNode[];
  isLoading: boolean;
  error: string | null;
  isProcessing: boolean;
  conflictResolution: 'skip' | 'replace' | 'rename';
}

export const DocumentMoveDialog: React.FC<DocumentMoveDialogProps> = ({
  documents,
  operation,
  isOpen,
  onClose,
  onComplete,
  currentFolderId = null,
  className = ''
}) => {
  const [state, setState] = useState<MoveDialogState>({
    selectedFolderId: null,
    folderTree: [],
    isLoading: false,
    error: null,
    isProcessing: false,
    conflictResolution: 'rename'
  });

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<MoveDialogState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Build folder tree structure
   */
  const buildFolderTree = useCallback(async (): Promise<FolderNode[]> => {
    try {
      // Get all folders using the new method
      const folders = await documentsApi.getFolders();
      
      // Create root node
      const rootNode: FolderNode = {
        id: null,
        name: 'Root',
        parent_id: null,
        children: [],
        isExpanded: true,
        isLoading: false
      };

      // Build tree structure
      const folderMap = new Map<number | null, FolderNode>();
      folderMap.set(null, rootNode);

      // Create nodes for all folders
      folders.forEach(folder => {
        const node: FolderNode = {
          id: folder.id,
          name: folder.name,
          parent_id: folder.parent_id,
          children: [],
          isExpanded: false,
          isLoading: false
        };
        folderMap.set(folder.id, node);
      });

      // Build parent-child relationships
      folders.forEach(folder => {
        const node = folderMap.get(folder.id);
        const parent = folderMap.get(folder.parent_id);
        
        if (node && parent) {
          parent.children.push(node);
        }
      });

      // Sort children by name
      const sortChildren = (node: FolderNode) => {
        node.children.sort((a, b) => a.name.localeCompare(b.name));
        node.children.forEach(sortChildren);
      };
      sortChildren(rootNode);

      return [rootNode];
    } catch (error) {
      // Failed to build folder tree
      throw error;
    }
  }, []);

  /**
   * Load folder tree
   */
  const loadFolderTree = useCallback(async () => {
    updateState({ isLoading: true, error: null });

    try {
      const tree = await buildFolderTree();
      updateState({ folderTree: tree, isLoading: false });
    } catch (error) {
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to load folders',
        isLoading: false 
      });
    }
  }, [buildFolderTree, updateState]);

  /**
   * Toggle folder expansion
   */
  const toggleFolder = useCallback((folderId: number | null) => {
    const updateTree = (nodes: FolderNode[]): FolderNode[] => {
      return nodes.map(node => {
        if (node.id === folderId) {
          return { ...node, isExpanded: !node.isExpanded };
        }
        return {
          ...node,
          children: updateTree(node.children)
        };
      });
    };

    updateState({ folderTree: updateTree(state.folderTree) });
  }, [state.folderTree, updateState]);

  /**
   * Select folder
   */
  const selectFolder = useCallback((folderId: number | null) => {
    // Don't allow selecting current folder for moves
    if (operation === 'move' && folderId === currentFolderId) {
      return;
    }

    // Don't allow selecting a folder that's being moved (prevents moving into itself)
    const movingFolderIds = documents
      .filter(doc => doc.document_type === 'folder')
      .map(doc => doc.id);
    
    if (operation === 'move' && folderId && movingFolderIds.includes(folderId)) {
      return;
    }

    updateState({ selectedFolderId: folderId });
  }, [operation, currentFolderId, documents, updateState]);

  /**
   * Perform move/copy operation
   */
  const performOperation = useCallback(async () => {
    if (documents.length === 0) return;

    updateState({ isProcessing: true, error: null });

    try {
      const documentIds = documents.map(doc => doc.id);

      if (operation === 'move') {
        await documentsApi.moveDocuments({
          document_ids: documentIds,
          target_folder_id: state.selectedFolderId,
          operation: 'move',
          conflict_resolution: state.conflictResolution
        });
      } else {
        await documentsApi.copyDocuments({
          document_ids: documentIds,
          target_folder_id: state.selectedFolderId,
          operation: 'copy',
          conflict_resolution: state.conflictResolution
        });
      }

      onComplete();
    } catch (error) {
      updateState({ 
        error: error instanceof Error ? error.message : `Failed to ${operation} documents`,
        isProcessing: false 
      });
    }
  }, [documents, operation, state.selectedFolderId, state.conflictResolution, onComplete, updateState]);

  /**
   * Render folder tree node
   */
  const renderFolderNode = useCallback((node: FolderNode, depth: number = 0): React.ReactNode => {
    const isSelected = node.id === state.selectedFolderId;
    const isDisabled = (operation === 'move' && node.id === currentFolderId) ||
                       (operation === 'move' && documents.some(doc => doc.id === node.id));
    
    return (
      <div key={node.id || 'root'}>
        <div
          className={`
            flex items-center py-2 px-3 cursor-pointer rounded-lg transition-colors
            ${isSelected ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-50'}
            ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => !isDisabled && selectFolder(node.id)}
        >
          {node.children.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.id);
              }}
              className="mr-1 p-0.5 hover:bg-gray-200 rounded"
            >
              {node.isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          
          {node.id === null ? (
            <Home className="w-4 h-4 mr-2 text-blue-500" />
          ) : node.children.length > 0 ? (
            node.isExpanded ? (
              <FolderOpen className="w-4 h-4 mr-2 text-blue-500" />
            ) : (
              <Folder className="w-4 h-4 mr-2 text-blue-500" />
            )
          ) : (
            <Folder className="w-4 h-4 mr-2 text-gray-400" />
          )}

          <span className={`text-sm ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>
            {node.name}
          </span>

          {isSelected && (
            <CheckCircle className="w-4 h-4 ml-auto text-blue-600" />
          )}
        </div>

        {node.isExpanded && node.children.map(child => 
          renderFolderNode(child, depth + 1)
        )}
      </div>
    );
  }, [state.selectedFolderId, operation, currentFolderId, documents, selectFolder, toggleFolder]);

  /**
   * Get operation title and description
   */
  const operationInfo = useMemo(() => {
    const count = documents.length;
    const itemType = count === 1 ? 'item' : 'items';
    
    if (operation === 'move') {
      return {
        title: `Move ${count} ${itemType}`,
        description: `Select the destination folder to move ${count} ${itemType} to.`,
        icon: <Move className="w-5 h-5 text-blue-600" />,
        buttonText: `Move ${count} ${itemType}`
      };
    } else {
      return {
        title: `Copy ${count} ${itemType}`,
        description: `Select the destination folder to copy ${count} ${itemType} to.`,
        icon: <Copy className="w-5 h-5 text-blue-600" />,
        buttonText: `Copy ${count} ${itemType}`
      };
    }
  }, [documents.length, operation]);

  /**
   * Get selected folder display name
   */
  const selectedFolderName = useMemo(() => {
    if (state.selectedFolderId === null) return 'Root';
    
    const findFolder = (nodes: FolderNode[]): string | null => {
      for (const node of nodes) {
        if (node.id === state.selectedFolderId) return node.name;
        const childResult = findFolder(node.children);
        if (childResult) return childResult;
      }
      return null;
    };

    return findFolder(state.folderTree) || 'Unknown folder';
  }, [state.selectedFolderId, state.folderTree]);

  // Load folder tree when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadFolderTree();
    }
  }, [isOpen, loadFolderTree]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      updateState({
        selectedFolderId: null,
        folderTree: [],
        error: null,
        isProcessing: false
      });
    }
  }, [isOpen, updateState]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              {operationInfo.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {operationInfo.title}
              </h3>
              <p className="text-sm text-gray-500">
                {operationInfo.description}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={state.isProcessing}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-6">
          {state.error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">{state.error}</span>
            </div>
          )}

          {/* Document list */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              {operation === 'move' ? 'Moving:' : 'Copying:'}
            </h4>
            <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
              {documents.map(doc => (
                <div key={doc.id} className="text-sm text-gray-700 py-1">
                  {doc.document_type === 'folder' ? '📁' : '📄'} {doc.name}
                </div>
              ))}
            </div>
          </div>

          {/* Folder tree */}
          <div className="flex-1 overflow-hidden">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Select destination folder:
            </h4>
            
            {state.isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-2 max-h-64 overflow-y-auto">
                {state.folderTree.map(node => renderFolderNode(node))}
              </div>
            )}
          </div>

          {/* Conflict resolution */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              If files with the same name exist:
            </h4>
            <div className="space-y-2">
              {[
                { value: 'rename', label: 'Create new files with different names' },
                { value: 'skip', label: 'Skip files that already exist' },
                { value: 'replace', label: 'Replace existing files' }
              ].map(option => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    name="conflictResolution"
                    value={option.value}
                    checked={state.conflictResolution === option.value}
                    onChange={(e) => updateState({ conflictResolution: e.target.value as any })}
                    className="mr-2 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {state.selectedFolderId !== null ? (
              <>Destination: <span className="font-medium">{selectedFolderName}</span></>
            ) : (
              'Select a destination folder'
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={state.isProcessing}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={performOperation}
              disabled={state.selectedFolderId === null || state.isProcessing}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
            >
              {state.isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{operationInfo.buttonText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentMoveDialog;