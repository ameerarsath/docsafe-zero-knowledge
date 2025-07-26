/**
 * Document Share Dialog Component for SecureVault
 * 
 * Features:
 * - Create secure document shares
 * - Internal and external sharing options
 * - Expiration date settings
 * - Permission levels
 * - Share link management
 * - Access tracking
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Eye, 
  Download, 
  Users, 
  Globe, 
  Clock, 
  Shield,
  AlertCircle,
  CheckCircle,
  Loader2,
  Calendar,
  Link as LinkIcon
} from 'lucide-react';
import { Document } from '../../hooks/useDocuments';

interface DocumentShareDialogProps {
  document: Document;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

interface ShareSettings {
  shareType: 'internal' | 'external' | 'public';
  permissions: string[];
  expiresAt: string;
  shareName: string;
  requirePassword: boolean;
  sharePassword: string;
  maxAccess: number | null;
}

interface ExistingShare {
  id: number;
  shareToken: string;
  shareName: string;
  shareType: 'internal' | 'external' | 'public';
  permissions: string[];
  expiresAt?: string;
  createdAt: string;
  accessCount: number;
  lastAccessedAt?: string;
  isActive: boolean;
}

interface ShareDialogState {
  settings: ShareSettings;
  existingShares: ExistingShare[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  successMessage: string | null;
  activeTab: 'create' | 'manage';
}

export const DocumentShareDialog: React.FC<DocumentShareDialogProps> = ({
  document,
  isOpen,
  onClose,
  className = ''
}) => {
  const [state, setState] = useState<ShareDialogState>({
    settings: {
      shareType: 'internal',
      permissions: ['read'],
      expiresAt: '',
      shareName: '',
      requirePassword: false,
      sharePassword: '',
      maxAccess: null
    },
    existingShares: [],
    isLoading: false,
    isCreating: false,
    error: null,
    successMessage: null,
    activeTab: 'create'
  });

  /**
   * Update state helper
   */
  const updateState = useCallback((updates: Partial<ShareDialogState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  /**
   * Update settings helper
   */
  const updateSettings = useCallback((updates: Partial<ShareSettings>) => {
    updateState({
      settings: { ...state.settings, ...updates }
    });
  }, [state.settings, updateState]);

  /**
   * Load existing shares
   */
  const loadExistingShares = useCallback(async () => {
    updateState({ isLoading: true, error: null });

    try {
      // Mock API call - replace with actual API
      const mockShares: ExistingShare[] = [
        {
          id: 1,
          shareToken: 'abc123def456',
          shareName: 'Team Review',
          shareType: 'internal',
          permissions: ['read', 'download'],
          expiresAt: '2025-08-15T23:59:59Z',
          createdAt: '2025-07-26T10:00:00Z',
          accessCount: 5,
          lastAccessedAt: '2025-07-26T14:30:00Z',
          isActive: true
        }
      ];

      updateState({ 
        existingShares: mockShares,
        isLoading: false 
      });
    } catch (error) {
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to load shares',
        isLoading: false 
      });
    }
  }, [updateState]);

  /**
   * Create new share
   */
  const createShare = useCallback(async () => {
    if (!state.settings.shareName.trim()) {
      updateState({ error: 'Share name is required' });
      return;
    }

    updateState({ isCreating: true, error: null });

    try {
      // Mock API call - replace with actual API
      const newShare: ExistingShare = {
        id: Date.now(),
        shareToken: Math.random().toString(36).substring(2, 15),
        shareName: state.settings.shareName,
        shareType: state.settings.shareType,
        permissions: state.settings.permissions,
        expiresAt: state.settings.expiresAt || undefined,
        createdAt: new Date().toISOString(),
        accessCount: 0,
        isActive: true
      };

      updateState({
        existingShares: [...state.existingShares, newShare],
        successMessage: 'Share created successfully!',
        isCreating: false,
        activeTab: 'manage'
      });

      // Reset form
      updateSettings({
        shareName: '',
        expiresAt: '',
        requirePassword: false,
        sharePassword: '',
        maxAccess: null
      });

    } catch (error) {
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to create share',
        isCreating: false 
      });
    }
  }, [state.settings, state.existingShares, updateState, updateSettings]);

  /**
   * Copy share link to clipboard
   */
  const copyShareLink = useCallback(async (shareToken: string) => {
    const shareUrl = `${window.location.origin}/share/${shareToken}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      updateState({ successMessage: 'Share link copied to clipboard!' });
    } catch (error) {
      updateState({ error: 'Failed to copy link to clipboard' });
    }
  }, [updateState]);

  /**
   * Revoke share
   */
  const revokeShare = useCallback(async (shareId: number) => {
    updateState({ isLoading: true });

    try {
      // Mock API call - replace with actual API
      updateState({
        existingShares: state.existingShares.map(share =>
          share.id === shareId ? { ...share, isActive: false } : share
        ),
        isLoading: false,
        successMessage: 'Share revoked successfully!'
      });
    } catch (error) {
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to revoke share',
        isLoading: false 
      });
    }
  }, [state.existingShares, updateState]);

  /**
   * Format date for display
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
   * Get minimum expiration date (24 hours from now)
   */
  const minExpirationDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 16);
  }, []);

  /**
   * Get share type info
   */
  const getShareTypeInfo = useCallback((shareType: string) => {
    switch (shareType) {
      case 'internal':
        return {
          icon: <Users className="w-4 h-4" />,
          label: 'Internal',
          description: 'Only users with accounts can access'
        };
      case 'external':
        return {
          icon: <Globe className="w-4 h-4" />,
          label: 'External',
          description: 'Anyone with the link can access'
        };
      case 'public':
        return {
          icon: <Globe className="w-4 h-4" />,
          label: 'Public',
          description: 'Publicly accessible, no link required'
        };
      default:
        return {
          icon: <Shield className="w-4 h-4" />,
          label: 'Unknown',
          description: ''
        };
    }
  }, []);

  /**
   * Clear messages after timeout
   */
  useEffect(() => {
    if (state.successMessage || state.error) {
      const timer = setTimeout(() => {
        updateState({ successMessage: null, error: null });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.successMessage, state.error, updateState]);

  // Load existing shares when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadExistingShares();
    }
  }, [isOpen, loadExistingShares]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      updateState({
        error: null,
        successMessage: null,
        activeTab: 'create'
      });
    }
  }, [isOpen, updateState]);

  if (!isOpen) return null;
  
  // Return early if no document is provided
  if (!document) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Document Selected</h3>
            <p className="text-gray-600 mb-4">Please select a document to share.</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Share2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Share Document
              </h3>
              <p className="text-sm text-gray-500 truncate">
                {document.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => updateState({ activeTab: 'create' })}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              state.activeTab === 'create'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Create Share
          </button>
          <button
            onClick={() => updateState({ activeTab: 'manage' })}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              state.activeTab === 'manage'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Manage Shares ({state.existingShares.filter(s => s.isActive).length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {state.activeTab === 'create' ? (
            <div className="space-y-6">
              {/* Share Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share Name
                </label>
                <input
                  type="text"
                  value={state.settings.shareName}
                  onChange={(e) => updateSettings({ shareName: e.target.value })}
                  placeholder="e.g., Team Review, Client Access"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Share Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share Type
                </label>
                <div className="space-y-2">
                  {['internal', 'external'].map(type => {
                    const info = getShareTypeInfo(type);
                    return (
                      <label key={type} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="shareType"
                          value={type}
                          checked={state.settings.shareType === type}
                          onChange={(e) => updateSettings({ shareType: e.target.value as any })}
                          className="mr-3 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex items-center space-x-2 mr-3 text-gray-500">
                          {info.icon}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{info.label}</div>
                          <div className="text-sm text-gray-500">{info.description}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'read', label: 'View', icon: <Eye className="w-4 h-4" /> },
                    { value: 'download', label: 'Download', icon: <Download className="w-4 h-4" /> }
                  ].map(permission => (
                    <label key={permission.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={state.settings.permissions.includes(permission.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateSettings({
                              permissions: [...state.settings.permissions, permission.value]
                            });
                          } else {
                            updateSettings({
                              permissions: state.settings.permissions.filter(p => p !== permission.value)
                            });
                          }
                        }}
                        className="mr-3 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex items-center space-x-2 text-gray-700">
                        {permission.icon}
                        <span>{permission.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Expiration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expiration (Optional)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="datetime-local"
                    value={state.settings.expiresAt}
                    onChange={(e) => updateSettings({ expiresAt: e.target.value })}
                    min={minExpirationDate}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for no expiration
                </p>
              </div>

              {/* Create Button */}
              <div className="flex justify-end">
                <button
                  onClick={createShare}
                  disabled={state.isCreating || !state.settings.shareName.trim() || state.settings.permissions.length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {state.isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Create Share</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {state.isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
              ) : state.existingShares.length === 0 ? (
                <div className="text-center py-8">
                  <Share2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No shares yet</h4>
                  <p className="text-gray-500">Create a share to get started.</p>
                </div>
              ) : (
                state.existingShares.map(share => {
                  const typeInfo = getShareTypeInfo(share.shareType);
                  const shareUrl = `${window.location.origin}/share/${share.shareToken}`;
                  
                  return (
                    <div key={share.id} className={`border rounded-lg p-4 ${share.isActive ? 'border-gray-200' : 'border-gray-300 bg-gray-50'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className={`font-medium ${share.isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                              {share.shareName}
                            </h4>
                            <div className="flex items-center space-x-1 text-gray-500">
                              {typeInfo.icon}
                              <span className="text-xs">{typeInfo.label}</span>
                            </div>
                            {!share.isActive && (
                              <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">
                                Revoked
                              </span>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>Permissions: {share.permissions.join(', ')}</div>
                            <div>Created: {formatDate(share.createdAt)}</div>
                            {share.expiresAt && (
                              <div>Expires: {formatDate(share.expiresAt)}</div>
                            )}
                            <div>Access count: {share.accessCount}</div>
                            {share.lastAccessedAt && (
                              <div>Last accessed: {formatDate(share.lastAccessedAt)}</div>
                            )}
                          </div>

                          {share.isActive && (
                            <div className="mt-3 flex items-center space-x-2">
                              <div className="flex items-center flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                                <LinkIcon className="w-4 h-4 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-600 truncate">{shareUrl}</span>
                              </div>
                              <button
                                onClick={() => copyShareLink(share.shareToken)}
                                className="p-1 text-gray-500 hover:text-gray-700"
                                title="Copy link"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        {share.isActive && (
                          <button
                            onClick={() => revokeShare(share.id)}
                            className="ml-4 px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentShareDialog;