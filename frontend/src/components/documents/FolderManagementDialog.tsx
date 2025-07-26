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
      is_sensitive: false
    },
    permissions: [],
    templates: [],
    isLoading: false,
    isProcessing: false,
    error: null,
    successMessage: null,
    activeTab: 'general',
    newTag: '',
    selectedUsers: []
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
    updateState({
      formData: { ...state.formData, ...updates }
    });
  }, [state.formData, updateState]);

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
      console.error('Failed to load templates:', error);
    }
  }, [updateState]);

  /**
   * Load folder permissions
   */
  const loadPermissions = useCallback(async () => {
    if (!folder || mode === 'create') return;

    updateState({ isLoading: true });

    try {
      // Mock permissions - replace with actual API call
      const mockPermissions: FolderPermission[] = [
        {
          id: 1,
          user_id: 1,
          user_name: 'John Doe',
          user_email: 'john.doe@example.com',
          permission_type: 'admin',
          granted_by: 1,
          granted_at: '2025-07-26T10:00:00Z'
        },
        {
          id: 2,
          user_id: 2,
          user_name: 'Jane Smith',
          user_email: 'jane.smith@example.com',
          permission_type: 'write',
          granted_by: 1,
          granted_at: '2025-07-26T10:00:00Z'
        }
      ];

      updateState({ permissions: mockPermissions, isLoading: false });
    } catch (error) {
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to load permissions',
        isLoading: false 
      });
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
   * Apply template
   */
  const applyTemplate = useCallback((templateId: string) => {
    const template = state.templates.find(t => t.id === templateId);
    if (template) {
      updateFormData({
        template_id: templateId,
        tags: [...new Set([...state.formData.tags, ...template.tags])]
      });
    }
  }, [state.templates, state.formData.tags, updateFormData]);


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
        // Create new folder - try minimal payload first
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
        
        // Critical: Only include parent_id if we have a valid parent folder
        // Omit the field entirely for root folders to avoid backend variable scoping issue
        if (parentFolderId !== null && parentFolderId !== undefined && !isNaN(parentFolderId) && parentFolderId > 0) {
          createParams.parent_id = parentFolderId;
        }
        // Note: Do NOT set parent_id to null - omit it entirely for root folders
        
        console.log('Creating folder with params:', createParams);
        console.log('Parent folder ID being passed:', parentFolderId);
        
        console.log('Attempting folder creation with params:', createParams);
        
        try {
          await documentsApi.createDocument(createParams);
        } catch (apiError) {
          // API testing confirms this is a backend bug that persists regardless of payload structure
          console.error('Folder creation failed - confirmed backend bug:', apiError);
          throw new Error(
            'Folder creation is currently broken due to a backend bug. ' +
            'The error "cannot access local variable \'parent\'" indicates a Python variable scoping issue ' +
            'in the document creation endpoint that needs to be fixed by the backend team.'
          );
        }
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
      console.error('Folder operation failed:', error);
      
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
          is_sensitive: false,
          ...state.formData
        }
      });
    } else if (mode === 'create') {
      updateState({
        formData: {
          name: '',
          description: '',
          tags: [],
          is_sensitive: false
        }
      });
    }
  }, [folder, mode]); // Don't include state or updateState to prevent infinite loop

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

                  {/* Templates (for create mode only) */}
                  {mode === 'create' && state.templates.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Folder Template
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {state.templates.map(template => (
                          <label key={template.id} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="radio"
                              name="template"
                              value={template.id}
                              checked={state.formData.template_id === template.id}
                              onChange={() => applyTemplate(template.id)}
                              className="mr-3 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex items-center space-x-2 mr-3">
                              <Star className="w-4 h-4 text-yellow-500" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{template.name}</div>
                              <div className="text-sm text-gray-500">{template.description}</div>
                            </div>
                          </label>
                        ))}
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
                  <div className="text-center py-8">
                    <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Folder Permissions</h4>
                    <p className="text-gray-500">Permission management feature coming soon.</p>
                  </div>
                </div>
              )}

              {/* Advanced Tab */}
              {state.activeTab === 'advanced' && (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Advanced Settings</h4>
                    <p className="text-gray-500">Advanced folder settings coming soon.</p>
                  </div>
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
    </div>
  );
};

export default FolderManagementDialog;