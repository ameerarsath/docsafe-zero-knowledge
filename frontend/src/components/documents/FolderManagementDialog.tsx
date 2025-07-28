/**
 * Folder Management Dialog Component for SecureVault
 * 
 * Features:
 * - Create, rename, delete folders
 * - Folder permission management
 * - Folder template selection
 * - Bulk folder operations
 * - Folder metadata editing
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  X, 
  FolderPlus, 
  Edit3, 
  Trash2, 
  Shield, 
  Users, 
  Tag,
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader2,
  Settings,
  Copy,
  Star,
  Lock
} from 'lucide-react';
import { Document } from '../../hooks/useDocuments';
import { documentsApi } from '../../services/api/documents';
import TemplateSelectionDialog from '../ui/TemplateSelectionDialog';

interface FolderManagementDialogProps {
  folder?: Document | null; // null for new folder creation
  parentFolderId?: number | null;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  mode: 'create' | 'edit' | 'permissions' | 'delete';
  className?: string;
}

interface FolderTemplate {
  id: string;
  name: string;
  description: string;
  structure: {
    name: string;
    type: 'folder' | 'document';
    children?: any[];
  }[];
  tags: string[];
  defaultPermissions: {
    user_id: number;
    permission_type: 'read' | 'write' | 'admin';
  }[];
}

interface FolderPermission {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  permission_type: 'read' | 'write' | 'admin';
  granted_by: number;
  granted_at: string;
  expires_at?: string;
}

interface FolderFormData {
  name: string;
  description: string;
  tags: string[];
  template_id?: string;
  is_sensitive: boolean;
  retention_policy?: number; // days
  auto_archive?: boolean;
  inherit_permissions: boolean;
  auto_encrypt: boolean;
  share_type?: string;
  access_level?: string;
  metadata?: {
    department?: string;
    project_code?: string;
    retention_days?: number | null;
    [key: string]: any;
  };
}

interface FolderManagementState {
  formData: FolderFormData;
  permissions: FolderPermission[];
  templates: FolderTemplate[];
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  successMessage: string | null;
  activeTab: 'general' | 'permissions' | 'advanced';
  newTag: string;
  selectedUsers: number[];
  showTemplateSelection: boolean;
  appliedTemplate: any | null;
  createdFolderId: number | null;
}

export const FolderManagementDialog: React.FC<FolderManagementDialogProps> = ({
  folder,
  parentFolderId = null,
  isOpen,
  onClose,
  onComplete,
  mode,
  className = ''
}) => {
  const [state, setState] = useState<FolderManagementState>({
    formData: {
      name: '',
      description: '',
      tags: [],
      is_sensitive: false,
      inherit_permissions: true,
      auto_encrypt: false,
      share_type: 'private',
      access_level: 'standard',
      metadata: {}
    },
    permissions: [],
    templates: [],
    isLoading: false,
    isProcessing: false,
    error: null,
    successMessage: null,
    activeTab: 'general',
    newTag: '',
    selectedUsers: [],
    showTemplateSelection: false,
    appliedTemplate: null,
    createdFolderId: null
  });

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<FolderManagementState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Update form data helper
   */
  const updateFormData = useCallback((updates: Partial<FolderFormData>) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, ...updates }
    }));
  }, []);

  /**
   * Load folder templates
   */
  const loadTemplates = useCallback(async () => {
    try {
      // Mock templates - replace with actual API call
      const mockTemplates: FolderTemplate[] = [
        {
          id: 'project',
          name: 'Project Folder',
          description: 'Standard project structure with docs, assets, and reports',
          structure: [
            { name: 'Documents', type: 'folder' },
            { name: 'Assets', type: 'folder' },
            { name: 'Reports', type: 'folder' },
            { name: 'Meeting Notes', type: 'folder' }
          ],
          tags: ['project', 'workspace'],
          defaultPermissions: []
        },
        {
          id: 'client',
          name: 'Client Folder',
          description: 'Client-specific folder with contracts, communications, and deliverables',
          structure: [
            { name: 'Contracts', type: 'folder' },
            { name: 'Communications', type: 'folder' },
            { name: 'Deliverables', type: 'folder' },
            { name: 'Invoices', type: 'folder' }
          ],
          tags: ['client', 'business'],
          defaultPermissions: []
        },
        {
          id: 'department',
          name: 'Department Folder',
          description: 'Departmental structure with policies, procedures, and shared resources',
          structure: [
            { name: 'Policies', type: 'folder' },
            { name: 'Procedures', type: 'folder' },
            { name: 'Shared Resources', type: 'folder' },
            { name: 'Team Documents', type: 'folder' }
          ],
          tags: ['department', 'internal'],
          defaultPermissions: []
        }
      ];

      updateState({ templates: mockTemplates });
    } catch (error) {
      // Failed to load templates
    }
  }, [updateState]);

  /**
   * Load folder permissions
   */
  const loadPermissions = useCallback(async () => {
    if (!folder || mode === 'create') return;

    updateState({ isLoading: true });

    try {
      // Load actual permissions from API
      const permissions = await documentsApi.getDocumentPermissions(folder.id);
      
      // Convert DocumentPermission to FolderPermission format
      const folderPermissions: FolderPermission[] = permissions.map(perm => ({
        id: perm.id,
        user_id: perm.user_id,
        user_name: perm.user_name || `User ${perm.user_id}`,
        user_email: perm.user_email || 'No email available',
        permission_type: perm.permission_type,
        granted_by: perm.granted_by,
        granted_at: perm.granted_at,
        expires_at: perm.expires_at
      }));

      updateState({ permissions: folderPermissions, isLoading: false });
    } catch (error) {
      // Failed to load permissions, using empty list
      // Don't show error for permissions that might not exist yet
      updateState({ permissions: [], isLoading: false });
    }
  }, [folder, mode, updateState]);

  /**
   * Add tag
   */
  const addTag = useCallback(() => {
    if (state.newTag.trim() && !state.formData.tags.includes(state.newTag.trim())) {
      updateFormData({
        tags: [...state.formData.tags, state.newTag.trim()]
      });
      updateState({ newTag: '' });
    }
  }, [state.newTag, state.formData.tags, updateFormData, updateState]);

  /**
   * Remove tag
   */
  const removeTag = useCallback((tagToRemove: string) => {
    updateFormData({
      tags: state.formData.tags.filter(tag => tag !== tagToRemove)
    });
  }, [state.formData.tags, updateFormData]);

  /**
   * Handle template application result
   */
  const handleTemplateApplied = useCallback((result: any) => {
    updateState({ 
      appliedTemplate: result,
      showTemplateSelection: false,
      successMessage: `Template applied successfully! Created ${result.created_folders.length} folders.`
    });
    
    // Close dialog and refresh
    setTimeout(() => {
      onComplete();
    }, 1500);
  }, [onComplete, updateState]);

  /**
   * Handle folder creation with template application
   */
  const createFolderWithTemplate = useCallback(async () => {
    if (!state.formData.name.trim()) {
      updateState({ error: 'Folder name is required' });
      return;
    }

    updateState({ isProcessing: true, error: null });

    try {
      // First, create the folder with the user's custom name
      const createParams: any = {
        name: state.formData.name.trim(),
        document_type: 'folder'
      };
      
      // Add optional fields if they have values
      if (state.formData.description && state.formData.description.trim()) {
        createParams.description = state.formData.description.trim();
      }
      
      if (state.formData.tags && state.formData.tags.length > 0) {
        createParams.tags = state.formData.tags;
      }
      
      // Add parent_id if creating a subfolder
      if (parentFolderId !== null && parentFolderId !== undefined && !isNaN(parentFolderId) && parentFolderId > 0) {
        createParams.parent_id = parentFolderId;
      }
      
      // Create the folder first
      const createdFolder = await documentsApi.createDocument(createParams);
      
      // Then show template selection dialog, passing the created folder's ID as targetFolderId
      updateState({ 
        createdFolderId: createdFolder.id,
        showTemplateSelection: true,
        isProcessing: false 
      });
      
    } catch (error) {
      let errorMessage = 'Failed to create folder';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      updateState({ 
        error: errorMessage,
        isProcessing: false 
      });
    }
  }, [state.formData, parentFolderId, updateState]);


  /**
   * Submit form
   */
  const submitForm = useCallback(async () => {
    if (!state.formData.name.trim()) {
      updateState({ error: 'Folder name is required' });
      return;
    }

    updateState({ isProcessing: true, error: null });

    try {
      if (mode === 'create') {
        // Create new folder
        const createParams: any = {
          name: state.formData.name.trim(),
          document_type: 'folder'
        };
        
        // Only add optional fields if they have values
        if (state.formData.description && state.formData.description.trim()) {
          createParams.description = state.formData.description.trim();
        }
        
        if (state.formData.tags && state.formData.tags.length > 0) {
          createParams.tags = state.formData.tags;
        }
        
        // Only include parent_id if we have a valid parent folder
        if (parentFolderId !== null && parentFolderId !== undefined && !isNaN(parentFolderId) && parentFolderId > 0) {
          createParams.parent_id = parentFolderId;
        }
        
        await documentsApi.createDocument(createParams);
        updateState({ successMessage: 'Folder created successfully!' });
      } else if (mode === 'edit' && folder) {
        // Update existing folder
        await documentsApi.updateDocument(folder.id, {
          name: state.formData.name.trim(),
          description: state.formData.description,
          tags: state.formData.tags
        });
        updateState({ successMessage: 'Folder updated successfully!' });
      } else if (mode === 'delete' && folder) {
        // Delete folder
        await documentsApi.deleteDocument(folder.id);
        updateState({ successMessage: 'Folder deleted successfully!' });
      }

      setTimeout(() => {
        onComplete();
      }, 1000);

    } catch (error) {
      // Folder operation failed
      
      let errorMessage = 'Operation failed';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Handle specific backend errors
        if (errorMessage.includes('cannot access local variable')) {
          errorMessage = 'Backend error: Please check server logs. This appears to be a backend variable scoping issue.';
        }
      }
      
      updateState({ 
        error: errorMessage,
        isProcessing: false 
      });
    }
  }, [mode, folder, parentFolderId, state.formData, onComplete, updateState]);

  /**
   * Get dialog title and description
   */
  const dialogInfo = useMemo(() => {
    switch (mode) {
      case 'create':
        return {
          title: 'Create New Folder',
          description: 'Create a new folder to organize your documents',
          icon: <FolderPlus className="w-5 h-5 text-blue-600" />,
          buttonText: 'Create Folder'
        };
      case 'edit':
        return {
          title: 'Edit Folder',
          description: 'Modify folder settings and properties',
          icon: <Edit3 className="w-5 h-5 text-blue-600" />,
          buttonText: 'Save Changes'
        };
      case 'permissions':
        return {
          title: 'Folder Permissions',
          description: 'Manage access permissions for this folder',
          icon: <Shield className="w-5 h-5 text-blue-600" />,
          buttonText: 'Save Permissions'
        };
      case 'delete':
        return {
          title: 'Delete Folder',
          description: 'Permanently delete this folder and all its contents',
          icon: <Trash2 className="w-5 h-5 text-red-600" />,
          buttonText: 'Delete Folder'
        };
      default:
        return {
          title: 'Folder Management',
          description: '',
          icon: <Settings className="w-5 h-5 text-blue-600" />,
          buttonText: 'Save'
        };
    }
  }, [mode]);

  // Initialize form data when folder changes
  useEffect(() => {
    if (folder && (mode === 'edit' || mode === 'permissions' || mode === 'delete')) {
      updateState({
        formData: {
          name: folder.name,
          description: folder.description || '',
          tags: folder.tags || [],
          is_sensitive: (folder as any).is_sensitive || false,
          inherit_permissions: true,
          auto_encrypt: false,
          share_type: 'private',
          access_level: 'standard',
          metadata: folder.doc_metadata || {}
        }
      });
    } else if (mode === 'create') {
      updateState({
        formData: {
          name: '',
          description: '',
          tags: [],
          is_sensitive: false,
          inherit_permissions: true,
          auto_encrypt: false,
          share_type: 'private',
          access_level: 'standard',
          metadata: {}
        }
      });
    }
  }, [folder, mode, isOpen]); // Added isOpen to trigger when dialog opens

  // Load data when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadPermissions();
    }
  }, [isOpen, loadTemplates, loadPermissions]);

  // Clear messages after timeout
  useEffect(() => {
    if (state.successMessage || state.error) {
      const timer = setTimeout(() => {
        updateState({ successMessage: null, error: null });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.successMessage, state.error, updateState]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              {dialogInfo.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {dialogInfo.title}
              </h3>
              {dialogInfo.description && (
                <p className="text-sm text-gray-500">
                  {dialogInfo.description}
                </p>
              )}
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

        {/* Messages */}
        {(state.error || state.successMessage) && (
          <div className="p-4 border-b border-gray-200">
            {state.error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700">{state.error}</span>
              </div>
            )}
            {state.successMessage && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-700">{state.successMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {mode === 'delete' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Delete "{folder?.name}"?
              </h4>
              <p className="text-gray-600 mb-4">
                This action cannot be undone. All contents of this folder will be permanently deleted.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <strong>Warning:</strong> This will delete the folder and all its subfolders and documents.
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tabs for edit/permissions mode */}
              {(mode === 'edit' || mode === 'permissions') && (
                <div className="flex border-b border-gray-200 -mx-6 px-6">
                  <button
                    onClick={() => updateState({ activeTab: 'general' })}
                    className={`py-2 px-4 text-sm font-medium transition-colors ${
                      state.activeTab === 'general'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    General
                  </button>
                  <button
                    onClick={() => updateState({ activeTab: 'permissions' })}
                    className={`py-2 px-4 text-sm font-medium transition-colors ${
                      state.activeTab === 'permissions'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Permissions
                  </button>
                  <button
                    onClick={() => updateState({ activeTab: 'advanced' })}
                    className={`py-2 px-4 text-sm font-medium transition-colors ${
                      state.activeTab === 'advanced'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Advanced
                  </button>
                </div>
              )}

              {/* General Tab */}
              {(mode === 'create' || state.activeTab === 'general') && (
                <div className="space-y-4">
                  {/* Folder Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Folder Name *
                    </label>
                    <input
                      type="text"
                      value={state.formData.name}
                      onChange={(e) => updateFormData({ name: e.target.value })}
                      placeholder="Enter folder name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={state.isProcessing}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={state.formData.description}
                      onChange={(e) => updateFormData({ description: e.target.value })}
                      placeholder="Optional description"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={state.isProcessing}
                    />
                  </div>

                  {/* Project Templates (for create mode only) */}
                  {mode === 'create' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Project Template
                      </label>
                      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm text-gray-600">
                              Use a project template to create an organized folder structure with predefined tags and permissions.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={createFolderWithTemplate}
                          className="w-full mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                          disabled={state.isProcessing || !state.formData.name.trim()}
                        >
                          <Star className="w-4 h-4 mr-2" />
                          {state.isProcessing ? 'Creating Folder...' : 'Create Folder & Apply Template'}
                        </button>
                        {state.appliedTemplate && (
                          <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center">
                              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                              <span className="text-sm text-green-800">
                                Template will create {state.appliedTemplate.created_folders?.length || 0} folders
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {state.formData.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={state.newTag}
                        onChange={(e) => updateState({ newTag: e.target.value })}
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                        placeholder="Add tag"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        onClick={addTag}
                        disabled={!state.newTag.trim()}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Permissions Tab */}
              {state.activeTab === 'permissions' && (
                <div className="space-y-4">
                  {state.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-gray-600">Loading permissions...</span>
                    </div>
                  ) : (
                    <>
                      {/* Current Permissions */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                          <Users className="w-4 h-4 mr-2" />
                          Current Permissions
                        </h4>
                        
                        {state.permissions.length > 0 ? (
                          <div className="space-y-2">
                            {state.permissions.map((permission) => (
                              <div key={permission.id} className="flex items-center justify-between bg-white p-3 rounded border">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-medium text-blue-600">
                                      {permission.user_name?.charAt(0) || 'U'}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {permission.user_name || `User ${permission.user_id}`}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {permission.user_email || 'No email available'}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    permission.permission_type === 'admin' 
                                      ? 'bg-red-100 text-red-700'
                                      : permission.permission_type === 'write'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-green-100 text-green-700'
                                  }`}>
                                    {permission.permission_type.charAt(0).toUpperCase() + permission.permission_type.slice(1)}
                                  </span>
                                  <button className="text-gray-400 hover:text-red-600 transition-colors">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No explicit permissions set. Inheriting from parent folder or defaults.</p>
                        )}
                      </div>

                      {/* Add New Permission */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Add Permission</h4>
                        <p className="text-xs text-gray-600 mb-3">
                          Grant specific users access to this folder. Use User ID numbers until user search is implemented.
                        </p>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              User ID
                            </label>
                            <input
                              type="number"
                              placeholder="Enter user ID"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Permission Level
                            </label>
                            <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                              <option value="read">Read Only</option>
                              <option value="write">Read & Write</option>
                              <option value="admin">Full Access</option>
                            </select>
                          </div>
                          <div className="flex items-center space-x-3">
                            <label className="flex items-center text-xs text-gray-700">
                              <input type="checkbox" className="mr-2" />
                              Inheritable to subfolders
                            </label>
                          </div>
                          <button className="w-full bg-blue-600 text-white px-3 py-2 text-sm rounded-md hover:bg-blue-700 transition-colors">
                            Add Permission
                          </button>
                        </div>
                      </div>

                      {/* Permission Inheritance */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Permission Inheritance</h4>
                        <p className="text-xs text-gray-600 mb-3">
                          Apply this folder's permissions to all subfolders and documents.
                        </p>
                        <div className="flex items-center space-x-3">
                          <button className="bg-gray-100 text-gray-700 px-3 py-2 text-sm rounded-md hover:bg-gray-200 transition-colors">
                            Apply to Subfolders
                          </button>
                          <label className="flex items-center text-xs text-gray-700">
                            <input type="checkbox" className="mr-2" />
                            Overwrite existing permissions
                          </label>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Advanced Tab */}
              {state.activeTab === 'advanced' && (
                <div className="space-y-4">
                  {/* Folder Metadata */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Folder Information
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="text-gray-600">Created:</label>
                        <p className="text-gray-900 font-medium">
                          {folder ? new Date(folder.created_at).toLocaleDateString() : 'New folder'}
                        </p>
                      </div>
                      <div>
                        <label className="text-gray-600">Modified:</label>
                        <p className="text-gray-900 font-medium">
                          {folder ? new Date(folder.updated_at).toLocaleDateString() : 'New folder'}
                        </p>
                      </div>
                      <div>
                        <label className="text-gray-600">Owner:</label>
                        <p className="text-gray-900 font-medium">
                          {folder ? `User ${folder.owner_id}` : 'Current user'}
                        </p>
                      </div>
                      <div>
                        <label className="text-gray-600">ID:</label>
                        <p className="text-gray-900 font-medium">
                          {folder?.id || 'TBD'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Folder Options */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Folder Options</h4>
                    <div className="space-y-3">
                      <label className="flex items-center text-sm">
                        <input 
                          type="checkbox" 
                          checked={state.formData.is_sensitive}
                          onChange={(e) => updateFormData({ is_sensitive: e.target.checked })}
                          className="mr-3 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span className="text-gray-900 font-medium">Mark as Sensitive</span>
                          <p className="text-xs text-gray-500">Requires additional security measures for access</p>
                        </div>
                      </label>
                      
                      <label className="flex items-center text-sm">
                        <input 
                          type="checkbox" 
                          checked={state.formData.inherit_permissions}
                          onChange={(e) => updateFormData({ inherit_permissions: e.target.checked })}
                          className="mr-3 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span className="text-gray-900 font-medium">Inherit Parent Permissions</span>
                          <p className="text-xs text-gray-500">Automatically inherit permissions from parent folder</p>
                        </div>
                      </label>

                      <label className="flex items-center text-sm">
                        <input 
                          type="checkbox" 
                          checked={state.formData.auto_encrypt}
                          onChange={(e) => updateFormData({ auto_encrypt: e.target.checked })}
                          className="mr-3 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span className="text-gray-900 font-medium">Auto-encrypt Contents</span>
                          <p className="text-xs text-gray-500">Automatically encrypt all files uploaded to this folder</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Sharing Settings */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Sharing & Access</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Default Share Type
                        </label>
                        <select 
                          value={state.formData.share_type || 'private'}
                          onChange={(e) => updateFormData({ share_type: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="private">Private (Owner only)</option>
                          <option value="internal">Internal (Organization)</option>
                          <option value="team">Team Access</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Access Level
                        </label>
                        <select 
                          value={state.formData.access_level || 'standard'}
                          onChange={(e) => updateFormData({ access_level: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="standard">Standard Access</option>
                          <option value="restricted">Restricted Access</option>
                          <option value="confidential">Confidential</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Custom Metadata */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Custom Metadata</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Department
                        </label>
                        <input
                          type="text"
                          value={state.formData.metadata?.department || ''}
                          onChange={(e) => updateFormData({ 
                            metadata: { 
                              ...state.formData.metadata, 
                              department: e.target.value 
                            }
                          })}
                          placeholder="e.g., Finance, Legal, HR"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Project Code
                        </label>
                        <input
                          type="text"
                          value={state.formData.metadata?.project_code || ''}
                          onChange={(e) => updateFormData({ 
                            metadata: { 
                              ...state.formData.metadata, 
                              project_code: e.target.value 
                            }
                          })}
                          placeholder="e.g., PROJ-2025-001"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Retention Period (days)
                        </label>
                        <input
                          type="number"
                          value={state.formData.metadata?.retention_days || ''}
                          onChange={(e) => updateFormData({ 
                            metadata: { 
                              ...state.formData.metadata, 
                              retention_days: parseInt(e.target.value) || null
                            }
                          })}
                          placeholder="e.g., 365, 2555 (7 years)"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  {folder && (
                    <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                      <h4 className="text-sm font-medium text-red-900 mb-3 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Danger Zone
                      </h4>
                      <div className="space-y-2">
                        <button className="w-full bg-red-600 text-white px-3 py-2 text-sm rounded-md hover:bg-red-700 transition-colors">
                          Archive Folder
                        </button>
                        <button className="w-full bg-red-700 text-white px-3 py-2 text-sm rounded-md hover:bg-red-800 transition-colors">
                          Permanently Delete
                        </button>
                      </div>
                      <p className="text-xs text-red-700 mt-2">
                        These actions cannot be undone. All contents will be affected.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {mode === 'create' && parentFolderId && `Creating in current folder`}
            {mode === 'edit' && folder && `Editing: ${folder.name}`}
            {mode === 'delete' && folder && `Deleting: ${folder.name}`}
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
              onClick={submitForm}
              disabled={state.isProcessing || (mode !== 'delete' && !state.formData.name.trim())}
              className={`px-4 py-2 text-sm rounded-lg disabled:opacity-50 transition-colors flex items-center space-x-2 ${
                mode === 'delete'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {state.isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{dialogInfo.buttonText}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Template Selection Dialog */}
      <TemplateSelectionDialog
        isOpen={state.showTemplateSelection}
        onClose={() => updateState({ showTemplateSelection: false, createdFolderId: null })}
        onTemplateApplied={handleTemplateApplied}
        parentFolderId={parentFolderId}
        targetFolderId={state.createdFolderId}
      />
    </div>
  );
};

export default FolderManagementDialog;